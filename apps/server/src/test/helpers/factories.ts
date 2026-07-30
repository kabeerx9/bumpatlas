import type { FamilyMemberRole, FamilyMemberStatus } from "@bumpatlas/db/types";

import { prisma } from "@/test/helpers/db";

let counter = 0;
const uniqueSuffix = () => `${Date.now().toString(36)}-${(counter += 1)}`;

export async function createUser(
  overrides: { clerkId?: string; email?: string | null; name?: string | null } = {},
) {
  const suffix = uniqueSuffix();

  return prisma.user.create({
    data: {
      clerkId: overrides.clerkId ?? `clerk_${suffix}`,
      email: overrides.email === undefined ? `user-${suffix}@example.test` : overrides.email,
      name: overrides.name ?? "Test Parent",
    },
  });
}

/**
 * Creates a household with its owner membership, mirroring what
 * `POST /api/v1/families` will do. Tests that need a *second* household call this
 * again — the cross-family suite depends on two fully independent families.
 */
export async function createFamilyWithOwner(
  options: { ownerUserId?: string; name?: string } = {},
) {
  const ownerUserId = options.ownerUserId ?? (await createUser()).id;

  const family = await prisma.family.create({
    data: {
      name: options.name ?? "Test household",
      ownerUserId,
      members: {
        create: { userId: ownerUserId, role: "OWNER", status: "ACTIVE" },
      },
    },
  });

  await prisma.user.update({
    where: { id: ownerUserId },
    data: { defaultFamilyId: family.id },
  });

  return { family, ownerUserId };
}

export async function addMember(
  familyId: string,
  options: {
    userId?: string;
    role?: FamilyMemberRole;
    status?: FamilyMemberStatus;
  } = {},
) {
  const userId = options.userId ?? (await createUser()).id;

  const membership = await prisma.familyMember.create({
    data: {
      familyId,
      userId,
      role: options.role ?? "CONTRIBUTOR",
      status: options.status ?? "ACTIVE",
    },
  });

  return { membership, userId };
}

export async function createChild(
  familyId: string,
  options: {
    displayName?: string;
    dateOfBirth?: string;
    birthOrder?: number;
    archivedAt?: Date | null;
  } = {},
) {
  return prisma.childProfile.create({
    data: {
      familyId,
      displayName: options.displayName ?? "Test Child",
      // Date-only column: passing a bare YYYY-MM-DD avoids a timezone shift.
      dateOfBirth: new Date(`${options.dateOfBirth ?? "2026-01-15"}T00:00:00.000Z`),
      birthOrder: options.birthOrder ?? 0,
      archivedAt: options.archivedAt ?? null,
    },
  });
}

export async function createPregnancy(
  familyId: string,
  options: { dueDate?: string; active?: boolean } = {},
) {
  const active = options.active ?? true;

  return prisma.pregnancyProfile.create({
    data: {
      familyId,
      dueDate: new Date(`${options.dueDate ?? "2026-12-01"}T00:00:00.000Z`),
      status: active ? "ACTIVE" : "CONVERTED",
      // Mirrors the service rule: the partial-unique key is set only while ACTIVE.
      activeFamilyKey: active ? familyId : null,
    },
  });
}
