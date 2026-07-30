import prisma from "@bumpatlas/db";
import type {
  Child,
  ConvertPregnancyInput,
  ConvertPregnancyResponse,
  Pregnancy,
} from "@bumpatlas/contracts/v1";
import type { ChildProfile, PregnancyProfile, Prisma } from "@bumpatlas/db/types";

import { writeAuditEventTx } from "@/services/audit";
import { table } from "@/services/db-raw";
import { getEntitlements } from "@/services/entitlement";
import { ServiceError } from "@/services/errors";
import { resolveActiveChild } from "@/services/family";
import {
  computeStage,
  dateToCalendarDate,
  gestationalWeekFromDueDate,
  toCalendarDate,
} from "@/services/stage";

const EARLIEST_BIRTH_YEAR = 1900;
/** A due date beyond a full gestation from today is a typo, not a plan. */
const MAX_DUE_DATE_DAYS_AHEAD = 300;

/**
 * Parses a date-only string as a calendar date.
 *
 * `new Date("2026-05-01")` is already UTC midnight, but `new Date("2026-05-01
 * 00:00")` is *local* — so the string is normalised explicitly rather than trusted,
 * or a birth date shifts a day for anyone west of UTC.
 */
export function parseCalendarDateInput(value: string, field: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());

  if (!match) {
    throw new ServiceError(400, "INVALID_INPUT", `${field} must be a YYYY-MM-DD date.`);
  }

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (Number.isNaN(parsed.getTime()) || parsed.getUTCMonth() !== Number(month) - 1) {
    throw new ServiceError(400, "INVALID_INPUT", `${field} is not a real date.`);
  }

  return parsed;
}

export function assertPlausibleBirthDate(date: Date, field = "dateOfBirth"): void {
  const now = new Date();

  if (date.getTime() > now.getTime() + 86_400_000) {
    throw new ServiceError(400, "INVALID_INPUT", `${field} cannot be in the future.`);
  }

  if (date.getUTCFullYear() < EARLIEST_BIRTH_YEAR) {
    throw new ServiceError(400, "INVALID_INPUT", `${field} is implausibly old.`);
  }
}

export function assertPlausibleDueDate(date: Date): void {
  const daysAhead = (date.getTime() - Date.now()) / 86_400_000;

  if (daysAhead > MAX_DUE_DATE_DAYS_AHEAD) {
    throw new ServiceError(400, "INVALID_INPUT", "dueDate is too far in the future.");
  }

  // A due date well in the past means the pregnancy should have been converted.
  if (daysAhead < -120) {
    throw new ServiceError(400, "INVALID_INPUT", "dueDate is too far in the past.");
  }
}

export function serializeChild(child: ChildProfile, activeChildId: string | null): Child {
  return {
    id: child.id,
    displayName: child.displayName,
    dateOfBirth: child.dateOfBirth.toISOString().slice(0, 10),
    birthOrder: child.birthOrder,
    // Per-caller, not household-wide: two co-parents can see different children active.
    isActive: child.id === activeChildId,
    archivedAt: child.archivedAt?.toISOString() ?? null,
  };
}

export function serializePregnancy(
  pregnancy: PregnancyProfile,
  timeZone: string | null,
): Pregnancy {
  const today = toCalendarDate(new Date(), timeZone);

  return {
    id: pregnancy.id,
    dueDate: pregnancy.dueDate.toISOString().slice(0, 10),
    gestationalWeek:
      pregnancy.status === "ACTIVE"
        ? gestationalWeekFromDueDate(dateToCalendarDate(pregnancy.dueDate), today)
        : null,
    convertedAt: pregnancy.status === "CONVERTED" ? pregnancy.updatedAt.toISOString() : null,
  };
}

export function findActivePregnancy(familyId: string) {
  return prisma.pregnancyProfile.findFirst({
    where: { familyId, status: "ACTIVE" },
  });
}

/** Youngest first — the ordering every child list and picker uses. */
export function listChildren(familyId: string, includeArchived: boolean) {
  return prisma.childProfile.findMany({
    where: { familyId, ...(includeArchived ? {} : { archivedAt: null }) },
    orderBy: [{ dateOfBirth: "desc" }, { birthOrder: "asc" }, { id: "asc" }],
  });
}

/**
 * Validates that a child belongs to the caller's family before any use.
 *
 * `NOT_FOUND` rather than `FORBIDDEN`: confirming that a child ID exists elsewhere
 * would leak another household's data by inference.
 */
export async function requireFamilyChild(familyId: string, childId: string) {
  const child = await prisma.childProfile.findFirst({ where: { id: childId, familyId } });

  if (!child) {
    throw new ServiceError(404, "CHILD_NOT_FOUND", "Child not found.");
  }

  return child;
}

export async function createChild(input: {
  familyId: string;
  actorUserId: string;
  displayName: string;
  dateOfBirth: string;
}) {
  const dateOfBirth = parseCalendarDateInput(input.dateOfBirth, "dateOfBirth");
  assertPlausibleBirthDate(dateOfBirth);

  const entitlement = await getEntitlements(input.familyId);

  // Enforced on creation only — never on reads of children a family already has.
  if (entitlement.maxChildren !== null) {
    const existing = await prisma.childProfile.count({
      where: { familyId: input.familyId, archivedAt: null },
    });

    if (existing >= entitlement.maxChildren) {
      throw new ServiceError(
        422,
        "CHILD_LIMIT_REACHED",
        "You have reached your child limit.",
        {
          limitKey: "children",
          used: existing,
          limit: entitlement.maxChildren,
          upgradeAvailable: !entitlement.isPremium,
        },
      );
    }
  }

  const birthOrder = await nextBirthOrder(input.familyId, dateOfBirth);

  return prisma.$transaction(async (tx) => {
    const child = await tx.childProfile.create({
      data: {
        familyId: input.familyId,
        displayName: input.displayName,
        dateOfBirth,
        birthOrder,
      },
    });

    await writeAuditEventTx(tx, {
      action: "child.created",
      actorUserId: input.actorUserId,
      familyId: input.familyId,
      targetType: "child",
      targetId: child.id,
    });

    return child;
  });
}

/** Birth order is per birth date, so twins get 0 and 1 rather than colliding. */
async function nextBirthOrder(familyId: string, dateOfBirth: Date): Promise<number> {
  const siblings = await prisma.childProfile.count({ where: { familyId, dateOfBirth } });
  return siblings;
}

export async function updateChild(input: {
  familyId: string;
  actorUserId: string;
  childId: string;
  displayName?: string;
  dateOfBirth?: string;
}) {
  await requireFamilyChild(input.familyId, input.childId);

  const data: Prisma.ChildProfileUpdateInput = {};

  if (input.displayName !== undefined) data.displayName = input.displayName;

  if (input.dateOfBirth !== undefined) {
    const dateOfBirth = parseCalendarDateInput(input.dateOfBirth, "dateOfBirth");
    assertPlausibleBirthDate(dateOfBirth);
    data.dateOfBirth = dateOfBirth;
  }

  return prisma.childProfile.update({ where: { id: input.childId }, data });
}

/**
 * Archives a child and clears every family member's pointer at them.
 *
 * Both halves must happen together: leaving a co-parent focused on an archived child
 * means their Today, stage, and milestones all describe a profile the UI no longer
 * shows them.
 */
export async function archiveChild(input: {
  familyId: string;
  actorUserId: string;
  childId: string;
}) {
  const child = await requireFamilyChild(input.familyId, input.childId);

  if (child.archivedAt) return child;

  const remaining = await prisma.childProfile.count({
    where: { familyId: input.familyId, archivedAt: null, id: { not: child.id } },
  });

  if (remaining === 0) {
    const activePregnancy = await findActivePregnancy(input.familyId);

    // A household with neither a child nor a pregnancy has no stage context at all,
    // which would leave Today with nothing to say.
    if (!activePregnancy) {
      throw new ServiceError(
        422,
        "LAST_CHILD_CANNOT_BE_ARCHIVED",
        "Add another child or a pregnancy before archiving this profile.",
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const archived = await tx.childProfile.update({
      where: { id: child.id },
      data: { archivedAt: new Date() },
    });

    await tx.user.updateMany({
      where: { activeChildId: child.id },
      data: { activeChildId: null },
    });

    await writeAuditEventTx(tx, {
      action: "child.archived",
      actorUserId: input.actorUserId,
      familyId: input.familyId,
      targetType: "child",
      targetId: child.id,
    });

    return archived;
  });
}

/**
 * Sets the caller's active child, and only the caller's.
 *
 * The one writer of `activeChildId` (correction 32), so family ownership and
 * archived state are validated in exactly one place.
 */
export async function activateChild(input: {
  familyId: string;
  userId: string;
  childId: string;
}) {
  const child = await requireFamilyChild(input.familyId, input.childId);

  if (child.archivedAt) {
    throw new ServiceError(422, "CHILD_ARCHIVED", "That profile is archived.");
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: { activeChildId: child.id },
  });

  return child;
}

export async function createPregnancy(input: {
  familyId: string;
  actorUserId: string;
  dueDate: string;
}) {
  const dueDate = parseCalendarDateInput(input.dueDate, "dueDate");
  assertPlausibleDueDate(dueDate);

  try {
    return await prisma.$transaction(async (tx) => {
      const pregnancy = await tx.pregnancyProfile.create({
        data: {
          familyId: input.familyId,
          dueDate,
          status: "ACTIVE",
          // Unique while ACTIVE: the database rejects a second one rather than
          // relying on a read-then-write check that two requests can both pass.
          activeFamilyKey: input.familyId,
        },
      });

      await writeAuditEventTx(tx, {
        action: "pregnancy.created",
        actorUserId: input.actorUserId,
        familyId: input.familyId,
        targetType: "pregnancy",
        targetId: pregnancy.id,
      });

      return pregnancy;
    });
  } catch (error) {
    if (isUniqueViolation(error, "activeFamilyKey")) {
      throw new ServiceError(
        409,
        "PREGNANCY_ALREADY_ACTIVE",
        "This household already has an active pregnancy.",
      );
    }
    throw error;
  }
}

export async function updatePregnancy(input: {
  familyId: string;
  pregnancyId: string;
  dueDate?: string;
}) {
  const pregnancy = await requireFamilyPregnancy(input.familyId, input.pregnancyId);

  if (pregnancy.status !== "ACTIVE") {
    throw new ServiceError(422, "PREGNANCY_NOT_ACTIVE", "This pregnancy is no longer active.");
  }

  if (input.dueDate === undefined) return pregnancy;

  const dueDate = parseCalendarDateInput(input.dueDate, "dueDate");
  assertPlausibleDueDate(dueDate);

  return prisma.pregnancyProfile.update({
    where: { id: pregnancy.id },
    data: { dueDate },
  });
}

/**
 * Resolves a pregnancy by ID, accepting the literal `"current"`.
 *
 * The shipped native convert screen sends `"current"` (correction 16). It resolves
 * to the family's active pregnancy and is never stored as an ID.
 */
export async function requireFamilyPregnancy(familyId: string, pregnancyId: string) {
  if (pregnancyId === "current") {
    const active = await findActivePregnancy(familyId);

    if (!active) {
      throw new ServiceError(404, "PREGNANCY_NOT_FOUND", "No active pregnancy.");
    }

    return active;
  }

  const pregnancy = await prisma.pregnancyProfile.findFirst({
    where: { id: pregnancyId, familyId },
  });

  if (!pregnancy) {
    throw new ServiceError(404, "PREGNANCY_NOT_FOUND", "Pregnancy not found.");
  }

  return pregnancy;
}

/**
 * Converts a pregnancy into one or more children.
 *
 * Notable rules, each of which protects data a parent would be upset to lose:
 * - memories stay attached to the pregnancy rather than being reassigned. With twins
 *   there is no correct child to pick, and the household timeline shows them anyway;
 * - `maxChildren` is bypassed. A family delivering twins must never be blocked from
 *   recording the birth; the upgrade prompt comes afterwards;
 * - the pregnancy row is locked `FOR UPDATE` so two taps cannot both convert.
 */
export async function convertPregnancy(input: {
  familyId: string;
  actorUserId: string;
  pregnancyId: string;
  body: ConvertPregnancyInput;
}): Promise<{ children: ChildProfile[]; activeChildId: string }> {
  const pregnancy = await requireFamilyPregnancy(input.familyId, input.pregnancyId);

  const birthDate = parseCalendarDateInput(input.body.birthDate, "birthDate");
  assertPlausibleBirthDate(birthDate, "birthDate");

  const names =
    "babies" in input.body
      ? input.body.babies.map((baby) => baby.displayName)
      : [input.body.childName];

  return prisma.$transaction(async (tx) => {
    // Schema-qualified: raw SQL does not get Prisma's schema prefix.
    const locked = await tx.$queryRawUnsafe<{ id: string; status: string }[]>(
      `SELECT id, status FROM ${table("PregnancyProfile")} WHERE id = $1 FOR UPDATE`,
      pregnancy.id,
    );

    if (locked[0]?.status !== "ACTIVE") {
      throw new ServiceError(
        409,
        "PREGNANCY_ALREADY_CONVERTED",
        "This pregnancy has already been converted.",
      );
    }

    const children: ChildProfile[] = [];

    for (const [index, displayName] of names.entries()) {
      children.push(
        await tx.childProfile.create({
          data: {
            familyId: input.familyId,
            displayName,
            dateOfBirth: birthDate,
            // Input order is birth order, which is what keeps twins stable.
            birthOrder: index,
          },
        }),
      );
    }

    const first = children[0]!;

    await tx.pregnancyProfile.update({
      where: { id: pregnancy.id },
      data: {
        status: "CONVERTED",
        primaryConvertedChildId: first.id,
        // Frees the partial-unique slot so the family can record a later pregnancy.
        activeFamilyKey: null,
      },
    });

    await tx.user.update({
      where: { id: input.actorUserId },
      data: { activeChildId: first.id },
    });

    for (const child of children) {
      await writeAuditEventTx(tx, {
        action: "child.created",
        actorUserId: input.actorUserId,
        familyId: input.familyId,
        targetType: "child",
        targetId: child.id,
        metadata: { viaConversion: true },
      });
    }

    return { children, activeChildId: first.id };
  });
}

export function serializeConvertResponse(
  children: ChildProfile[],
  activeChildId: string,
): ConvertPregnancyResponse {
  const serialized = children.map((child) => serializeChild(child, activeChildId));

  // First child's fields at the top level so the released convert screen, which
  // parses a single childSchema, still works.
  return { ...serialized[0]!, children: serialized };
}

/** Resolves the household's stage for the given user, in their time zone. */
export async function resolveStageForUser(input: {
  userId: string;
  familyId: string;
  timeZone: string | null;
}) {
  const [pregnancy, activeChildId] = await Promise.all([
    findActivePregnancy(input.familyId),
    resolveActiveChild(input.userId, input.familyId),
  ]);

  const activeChild = activeChildId
    ? await prisma.childProfile.findUnique({ where: { id: activeChildId } })
    : null;

  const stage = computeStage({
    pregnancy: pregnancy ? { dueDate: pregnancy.dueDate } : null,
    activeChild: activeChild ? { id: activeChild.id, dateOfBirth: activeChild.dateOfBirth } : null,
    today: toCalendarDate(new Date(), input.timeZone),
  });

  return { stage, activeChildId, activeChild, pregnancy };
}

function isUniqueViolation(error: unknown, field: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002" &&
    JSON.stringify((error as { meta?: unknown }).meta ?? "").includes(field)
  );
}
