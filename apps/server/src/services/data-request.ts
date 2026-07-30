import prisma from "@bumpatlas/db";
import type { DataRequest as DataRequestContract, DataRequestType } from "@bumpatlas/contracts/v1";
import type { DataRequest, DataRequestStatus, Prisma } from "@bumpatlas/db/types";

import { writeAuditEventTx } from "@/services/audit";
import { table } from "@/services/db-raw";
import { ServiceError } from "@/services/errors";
import { createDownloadUrl, type StorageSigner } from "@/services/media";
import { trackProductEvent } from "@/services/product-event";

/** Long enough to notice the email, short enough that a leaked link stops working. */
const EXPORT_TTL_HOURS = 72;
const MAX_ATTEMPTS = 3;
/** A claim older than this is assumed crashed and becomes claimable again. */
const CLAIM_TIMEOUT_MS = 15 * 60 * 1000;

const TO_CONTRACT_STATUS: Record<DataRequestStatus, DataRequestContract["status"]> = {
  // Correction 12: Prisma PENDING maps to contract "queued".
  PENDING: "queued",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
};

export async function serializeDataRequest(
  request: DataRequest,
  signer: StorageSigner,
): Promise<DataRequestContract> {
  const expired = request.expiresAt !== null && request.expiresAt.getTime() <= Date.now();

  return {
    id: request.id,
    type: request.type === "EXPORT" ? "export" : "delete",
    status: expired && request.status === "READY" ? "failed" : TO_CONTRACT_STATUS[request.status],
    createdAt: request.createdAt.toISOString(),
    readyAt: request.readyAt?.toISOString() ?? null,
    // Signed per read and short-lived: the stored key is never handed out directly.
    downloadUrl:
      request.status === "READY" && request.exportStorageKey && !expired
        ? await createDownloadUrl(request.exportStorageKey, signer)
        : null,
  };
}

/**
 * Creates a request, or returns the one already in flight.
 *
 * Duplicate suppression matters here more than elsewhere: a user who taps "export my
 * data" twice should not queue two full exports, and a second *deletion* request while
 * one is pending is almost certainly the same intent, not a new one.
 */
export async function createDataRequest(input: {
  userId: string;
  familyId: string | null;
  type: DataRequestType;
  role: "OWNER" | "PARENT" | "CONTRIBUTOR" | "VIEWER" | null;
}): Promise<DataRequest> {
  const type = input.type === "export" ? "EXPORT" : "DELETE";

  if (type === "EXPORT" && input.role !== "OWNER" && input.role !== "PARENT") {
    throw new ServiceError(
      403,
      "FORBIDDEN",
      "Only an owner or parent can export household data.",
    );
  }

  const existing = await prisma.dataRequest.findFirst({
    where: { userId: input.userId, type, status: { in: ["PENDING", "PROCESSING"] } },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return existing;

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.dataRequest.create({
      data: { userId: input.userId, familyId: input.familyId, type },
    });

    await writeAuditEventTx(tx, {
      action: type === "EXPORT" ? "data.export_requested" : "data.deletion_requested",
      actorUserId: input.userId,
      familyId: input.familyId,
      targetType: "data_request",
      targetId: created.id,
    });

    return created;
  });

  if (type === "EXPORT") {
    await trackProductEvent("EXPORT_REQUESTED", {
      actorUserId: input.userId,
      familyId: input.familyId,
    });
  }

  return request;
}

/** Only the requester's own row, so a request ID cannot be probed. */
export async function getDataRequest(input: {
  userId: string;
  requestId: string;
}): Promise<DataRequest> {
  const request = await prisma.dataRequest.findFirst({
    where: { id: input.requestId, userId: input.userId },
  });

  if (!request) {
    throw new ServiceError(404, "DATA_REQUEST_NOT_FOUND", "Request not found.");
  }

  return request;
}

/**
 * Claims a bounded batch for processing.
 *
 * `FOR UPDATE SKIP LOCKED` so two workers never claim the same row and neither blocks on
 * the other. Rows whose claim has gone stale are re-claimable, which is what makes a
 * crashed run recoverable rather than permanently stuck in PROCESSING.
 */
export async function claimPendingRequests(limit: number): Promise<DataRequest[]> {
  const staleBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS);

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM ${table("DataRequest")}
       WHERE ("status" = 'PENDING' OR ("status" = 'PROCESSING' AND "claimedAt" < $1))
         AND "attempts" < $2
       ORDER BY "createdAt" ASC
       LIMIT $3
       FOR UPDATE SKIP LOCKED`,
      staleBefore,
      MAX_ATTEMPTS,
      limit,
    );

    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);

    await tx.dataRequest.updateMany({
      where: { id: { in: ids } },
      data: { status: "PROCESSING", claimedAt: new Date(), attempts: { increment: 1 } },
    });

    return tx.dataRequest.findMany({ where: { id: { in: ids } } });
  });
}

/**
 * Builds the export payload.
 *
 * The scope boundaries are the whole point of this function, and they are asymmetric on
 * purpose:
 *
 * - household content **is** included, memories authored by co-parents and all, because
 *   the requester can already read every one of them in the app;
 * - another member's AI conversations, community posts, blocks, device tokens, email
 *   addresses, and subscription identifiers are **not**, because an export must not
 *   become a way to read a co-parent's private activity;
 * - the requester's own AI, consents, and preferences are included.
 *
 * These boundaries have to match what the privacy policy tells users.
 */
export async function buildExportPayload(request: DataRequest): Promise<{
  payload: Record<string, unknown>;
  counts: { memories: number; children: number; aiMessages: number };
}> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: request.userId },
    select: {
      id: true,
      email: true,
      name: true,
      timeZone: true,
      primaryGoal: true,
      onboardingCompletedAt: true,
      createdAt: true,
    },
  });

  const [consents, preferences] = await Promise.all([
    prisma.consentRecord.findMany({
      where: { userId: request.userId },
      select: { policyKey: true, version: true, acceptedAt: true },
    }),
    prisma.notificationPreference.findUnique({
      where: { userId: request.userId },
      select: {
        dailyPrompt: true,
        wellnessReminder: true,
        partnerActivity: true,
        weeklyRecap: true,
        communityReply: true,
        subscription: true,
        quietHoursEnabled: true,
        quietStart: true,
        quietEnd: true,
      },
    }),
  ]);

  const household = request.familyId
    ? await buildHouseholdExport(request.userId, request.familyId)
    : null;

  const own = await buildPersonalExport(request.userId);

  return {
    payload: {
      exportedAt: new Date().toISOString(),
      /** Stated in the file so a reader knows what is and is not here. */
      scope: {
        includes: [
          "your account and preferences",
          "your consents",
          "your household's children, pregnancies, memories and recaps",
          "your own assistant conversations",
        ],
        excludes: [
          "other members' assistant conversations",
          "other members' email addresses, devices and billing identifiers",
        ],
      },
      account: {
        // The requester's own email is theirs to have.
        email: user.email,
        name: user.name,
        timeZone: user.timeZone,
        primaryGoal: user.primaryGoal,
        onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
        joinedAt: user.createdAt.toISOString(),
      },
      consents: consents.map((consent) => ({
        policy: consent.policyKey,
        version: consent.version,
        acceptedAt: consent.acceptedAt.toISOString(),
      })),
      notificationPreferences: preferences,
      household,
      personal: own,
    },
    counts: {
      memories: household?.memories.length ?? 0,
      children: household?.children.length ?? 0,
      aiMessages: own.assistantMessages.length,
    },
  };
}

async function buildHouseholdExport(userId: string, familyId: string) {
  // Membership proof before reading a single household row.
  const membership = await prisma.familyMember.findFirst({
    where: { familyId, userId, status: "ACTIVE" },
    select: { role: true },
  });

  if (!membership) return null;

  const [family, children, pregnancies, memories, recaps] = await Promise.all([
    prisma.family.findUniqueOrThrow({ where: { id: familyId }, select: { name: true, createdAt: true } }),
    prisma.childProfile.findMany({
      where: { familyId },
      select: { displayName: true, dateOfBirth: true, birthOrder: true, archivedAt: true },
      orderBy: { dateOfBirth: "asc" },
    }),
    prisma.pregnancyProfile.findMany({
      where: { familyId },
      select: { dueDate: true, status: true, createdAt: true },
    }),
    prisma.memoryEntry.findMany({
      where: { familyId, deletedAt: null },
      // Author display name only — never their email.
      include: { author: { select: { name: true } } },
      orderBy: { eventDate: "asc" },
    }),
    prisma.weeklyRecap.findMany({
      where: { familyId },
      select: { weekLabel: true, title: true, highlights: true },
      orderBy: { weekStart: "asc" },
    }),
  ]);

  return {
    name: family.name,
    createdAt: family.createdAt.toISOString(),
    // Display names and roles only: no emails, no user IDs.
    members: (
      await prisma.familyMember.findMany({
        where: { familyId, status: "ACTIVE" },
        include: { user: { select: { name: true } } },
      })
    ).map((member) => ({ displayName: member.user.name, role: member.role })),
    children: children.map((child) => ({
      displayName: child.displayName,
      dateOfBirth: child.dateOfBirth.toISOString().slice(0, 10),
      birthOrder: child.birthOrder,
      archived: child.archivedAt !== null,
    })),
    pregnancies: pregnancies.map((pregnancy) => ({
      dueDate: pregnancy.dueDate.toISOString().slice(0, 10),
      status: pregnancy.status,
    })),
    memories: memories.map((memory) => ({
      title: memory.title,
      body: memory.body,
      eventDate: memory.eventDate.toISOString().slice(0, 10),
      author: memory.author.name,
      visibility: memory.visibility,
      hasPhoto: memory.pregnancyId !== undefined,
    })),
    recaps,
  };
}

/**
 * The requester's own personal data.
 *
 * Community authorship is added in Phase 8, when those tables exist. Listing it in the
 * `scope.excludes` block above would be worse than omitting it — it would tell the user
 * their community posts are deliberately withheld, when the truth is the feature is not
 * built yet.
 */
async function buildPersonalExport(userId: string) {
  const conversations = await prisma.aiConversation.findMany({
    where: { userId },
    include: {
      messages: {
        select: { role: true, body: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return {
    assistantMessages: conversations.flatMap((conversation) =>
      conversation.messages.map((message) => ({
        role: message.role,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
    ),
  };
}

export async function markRequestReady(input: {
  requestId: string;
  storageKey: string;
}): Promise<void> {
  await prisma.dataRequest.update({
    where: { id: input.requestId },
    data: {
      status: "READY",
      exportStorageKey: input.storageKey,
      readyAt: new Date(),
      expiresAt: new Date(Date.now() + EXPORT_TTL_HOURS * 3_600_000),
      failureCode: null,
    },
  });
}

export async function markRequestFailed(input: {
  requestId: string;
  failureCode: string;
}): Promise<void> {
  const request = await prisma.dataRequest.findUniqueOrThrow({
    where: { id: input.requestId },
  });

  await prisma.dataRequest.update({
    where: { id: input.requestId },
    data: {
      // Retryable until attempts run out, then terminal so it stops consuming batches.
      status: request.attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
      claimedAt: null,
      failureCode: input.failureCode,
    },
  });
}

/**
 * Deletes a user's personal data with explicit steps.
 *
 * Explicit rather than relying on cascade, because the correct action differs per table:
 * devices and AI are destroyed, community authorship is anonymised where it is moderation
 * evidence, memories stay with the household as family content, and a hosted group is
 * archived rather than left unowned.
 *
 * The owner of a household is refused: deleting them would strand the family. They must
 * delete the household first, which is a separate, deliberate action.
 */
export async function processAccountDeletion(input: {
  userId: string;
  signer: StorageSigner;
}): Promise<void> {
  const ownedFamilies = await prisma.family.count({ where: { ownerUserId: input.userId } });

  if (ownedFamilies > 0) {
    throw new ServiceError(
      422,
      "OWNER_MUST_DELETE_FAMILY",
      "Delete your household before deleting your account.",
    );
  }

  // A hosted group must never be left unowned (§7.8), so archive before anything else.
  const { archiveGroupsHostedBy } = await import("@/services/community/groups");
  const archivedGroups = await archiveGroupsHostedBy(input.userId);

  // Media the user uploaded that is not attached to a surviving household memory.
  const orphanAssets = await prisma.mediaAsset.findMany({
    where: { uploaderUserId: input.userId, memoryId: null, status: { not: "DELETED" } },
    select: { id: true, storageKey: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.pushDevice.deleteMany({ where: { userId: input.userId } });
    await tx.contentBookmark.deleteMany({ where: { userId: input.userId } });
    await tx.dailyPlan.deleteMany({ where: { userId: input.userId } });
    await tx.challengeCompletion.deleteMany({ where: { userId: input.userId } });
    await tx.badgeAward.deleteMany({ where: { userId: input.userId } });
    await tx.notificationPreference.deleteMany({ where: { userId: input.userId } });
    await tx.pushDevice.deleteMany({ where: { userId: input.userId } });
    await tx.aiConversation.deleteMany({ where: { userId: input.userId } });
    await tx.communityReaction.deleteMany({ where: { userId: input.userId } });
    await tx.userBlock.deleteMany({
      where: { OR: [{ blockerUserId: input.userId }, { blockedUserId: input.userId }] },
    });

    /**
     * Community authorship is anonymised, not deleted: a reported post is moderation
     * evidence, and destroying it would erase the record of what was reported.
     */
    await tx.communityGroupMember.updateMany({
      where: { userId: input.userId },
      data: { status: "LEFT", removedAt: new Date() },
    });

    await tx.mediaAsset.updateMany({
      where: { id: { in: orphanAssets.map((asset) => asset.id) } },
      data: { status: "DELETED", deletedAt: new Date() },
    });

    // Memberships end; memories they authored stay with the household.
    await tx.familyMember.updateMany({
      where: { userId: input.userId },
      data: { status: "REMOVED", removedAt: new Date() },
    });

    await tx.user.update({
      where: { id: input.userId },
      data: {
        email: null,
        name: null,
        imageUrl: null,
        defaultFamilyId: null,
        activeChildId: null,
        timeZone: null,
      },
    });

    await writeAuditEventTx(tx, {
      action: "account.deleted",
      actorUserId: null,
      // No private bodies, and no email: the audit records that it happened.
      metadata: { orphanMediaRevoked: orphanAssets.length, groupsArchived: archivedGroups },
      targetType: "user",
      targetId: input.userId,
    });
  });

  for (const asset of orphanAssets) {
    await input.signer.deleteObject(asset.storageKey).catch(() => {});
  }

  await trackProductEvent("ACCOUNT_DELETED", { actorUserId: null });
}

export type DataRequestUpdate = Prisma.DataRequestUpdateInput;
