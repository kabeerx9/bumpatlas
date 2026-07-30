import prisma from "@bumpatlas/db";
import type { CreateInviteResponse, InvitePreview } from "@bumpatlas/contracts/v1";
import type { FamilyMemberRole } from "@bumpatlas/db/types";
import { env } from "@bumpatlas/env/server";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { writeAuditEventTx } from "@/services/audit";
import { table } from "@/services/db-raw";
import { getEntitlements } from "@/services/entitlement";
import { ServiceError } from "@/services/errors";

const INVITE_TTL_DAYS = 7;
const TOKEN_BYTES = 32;

/**
 * Only the hash is stored. A database dump, a log line, or a support screenshot of
 * the invites table therefore cannot be replayed into household access — which is
 * the whole point, because an invite grants read access to a family's memories.
 */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashInviteToken(token) };
}

/**
 * Counts seats as active members plus outstanding invitations.
 *
 * Counting only active members would let an owner issue unlimited invites and blow
 * past the seat limit the moment they were all accepted.
 */
async function countSeatsInUse(familyId: string): Promise<number> {
  const [members, pendingInvites] = await Promise.all([
    prisma.familyMember.count({ where: { familyId, status: { in: ["ACTIVE", "INVITED"] } } }),
    prisma.familyInvite.count({
      where: { familyId, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);

  return members + pendingInvites;
}

export async function createInvite(input: {
  familyId: string;
  actorUserId: string;
  role: Exclude<FamilyMemberRole, "OWNER">;
  email?: string;
}): Promise<CreateInviteResponse> {
  const entitlement = await getEntitlements(input.familyId);
  const seatsInUse = await countSeatsInUse(input.familyId);

  if (seatsInUse >= entitlement.maxMembers) {
    throw new ServiceError(422, "SEAT_LIMIT_REACHED", "You have no seats left.", {
      limitKey: "family_seats",
      used: seatsInUse,
      limit: entitlement.maxMembers,
      upgradeAvailable: !entitlement.isPremium,
    });
  }

  const { token, tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);

  const invite = await prisma.$transaction(async (tx) => {
    const created = await tx.familyInvite.create({
      data: {
        familyId: input.familyId,
        tokenHash,
        role: input.role,
        // Normalised so an email-bound invite matches regardless of how it was typed.
        email: input.email?.trim().toLowerCase() ?? null,
        expiresAt,
        createdByUserId: input.actorUserId,
      },
    });

    await writeAuditEventTx(tx, {
      action: "invite.created",
      actorUserId: input.actorUserId,
      familyId: input.familyId,
      targetType: "invite",
      targetId: created.id,
      // Role is an enum, safe to record; the token and email are not.
      metadata: { role: input.role, emailBound: Boolean(input.email) },
    });

    return created;
  });

  return {
    // Returned exactly once. There is no way to retrieve it later by design.
    token,
    inviteUrl: `${env.WEB_BASE_URL}/invite/${token}`,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

/**
 * Safe preview for someone holding a link.
 *
 * Deliberately excludes member emails, child names, and birth dates: anyone with the
 * URL can call this, including someone it was forwarded to. Household and inviter
 * display names plus the offered role are enough to decide whether to accept.
 */
export async function previewInvite(token: string): Promise<InvitePreview> {
  const invite = await prisma.familyInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: {
      family: { select: { name: true } },
      createdByUser: { select: { name: true } },
    },
  });

  if (!invite) {
    throw new ServiceError(404, "INVITE_NOT_FOUND", "This invite link is not valid.");
  }

  assertInviteUsable(invite.acceptedAt, invite.expiresAt);

  return {
    familyName: invite.family.name,
    inviterDisplayName: invite.createdByUser.name ?? "A family member",
    role: invite.role,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

/** `410 INVITE_EXPIRED` for both used and expired: neither can be made to work again. */
function assertInviteUsable(acceptedAt: Date | null, expiresAt: Date): void {
  if (acceptedAt) {
    throw new ServiceError(410, "INVITE_EXPIRED", "This invite has already been used.");
  }

  if (expiresAt.getTime() <= Date.now()) {
    throw new ServiceError(410, "INVITE_EXPIRED", "This invite link has expired.");
  }
}

export async function acceptInvite(input: {
  token: string;
  userId: string;
}): Promise<{ familyId: string; role: FamilyMemberRole }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { id: true, email: true, isAdultAttested: true },
  });

  if (!user.isAdultAttested) {
    throw new ServiceError(
      422,
      "ADULT_ATTESTATION_REQUIRED",
      "Confirm you are an adult before joining a household.",
    );
  }

  const tokenHash = hashInviteToken(input.token);

  return prisma.$transaction(async (tx) => {
    // Locked so two taps on the same link cannot both consume a single-use invite.
    // Table is schema-qualified: raw SQL does not get Prisma's schema prefix.
    const locked = await tx.$queryRawUnsafe<
      { id: string; familyId: string; role: FamilyMemberRole; email: string | null; acceptedAt: Date | null; expiresAt: Date }[]
    >(
      `SELECT id, "familyId", role, email, "acceptedAt", "expiresAt"
       FROM ${table("FamilyInvite")} WHERE "tokenHash" = $1 FOR UPDATE`,
      tokenHash,
    );

    const invite = locked[0];

    if (!invite) {
      throw new ServiceError(404, "INVITE_NOT_FOUND", "This invite link is not valid.");
    }

    assertInviteUsable(invite.acceptedAt, invite.expiresAt);

    if (invite.email) {
      const accountEmail = user.email?.trim().toLowerCase() ?? "";

      if (!constantTimeEquals(accountEmail, invite.email)) {
        // Says nothing about which address it was issued to.
        throw new ServiceError(
          403,
          "INVITE_EMAIL_MISMATCH",
          "This invite was sent to a different email address.",
        );
      }
    }

    // Upsert, not create: rejoining a household you previously left reactivates the
    // existing membership rather than colliding on (familyId, userId).
    await tx.familyMember.upsert({
      where: { familyId_userId: { familyId: invite.familyId, userId: user.id } },
      create: {
        familyId: invite.familyId,
        userId: user.id,
        role: invite.role,
        status: "ACTIVE",
      },
      update: { role: invite.role, status: "ACTIVE", removedAt: null },
    });

    await tx.familyInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), acceptedByUserId: user.id },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { defaultFamilyId: invite.familyId },
    });

    await tx.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    await writeAuditEventTx(tx, {
      action: "invite.accepted",
      actorUserId: user.id,
      familyId: invite.familyId,
      targetType: "invite",
      targetId: invite.id,
      metadata: { role: invite.role },
    });

    return { familyId: invite.familyId, role: invite.role };
  });
}

/** Equal-length constant-time compare; lengths differing is itself not a secret. */
function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) return false;

  return timingSafeEqual(bufferA, bufferB);
}
