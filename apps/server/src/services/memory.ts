import prisma from "@bumpatlas/db";
import type { Memory } from "@bumpatlas/contracts/v1";
import type { FamilyMemberRole, MemoryEntry, Prisma } from "@bumpatlas/db/types";

import { ServiceError } from "@/services/errors";
import { resolveActiveChild } from "@/services/family";
import { claimPendingAsset, createDownloadUrl, type StorageSigner } from "@/services/media";
import { findActivePregnancy, parseCalendarDateInput, requireFamilyChild } from "@/services/profile";

const TITLE_MAX = 120;

/**
 * Title is the first non-empty body line, truncated.
 *
 * Derived once at create and stored, not computed on read: the user can edit the
 * title afterwards, and a derived-on-read title would silently overwrite their edit.
 */
export function deriveTitle(body: string): string {
  const firstLine = body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  const title = firstLine ?? "Untitled memory";

  return title.length > TITLE_MAX ? `${title.slice(0, TITLE_MAX - 1)}…` : title;
}

/**
 * Opaque cursor over the sort tuple `(eventDate, id)`.
 *
 * Encodes the tuple rather than an offset because a timeline receives inserts: with
 * `OFFSET`, adding one older memory shifts every later page and the client sees a
 * duplicate or a hole.
 */
export type MemoryCursor = { eventDate: string; id: string };

export function encodeCursor(cursor: MemoryCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(value: string): MemoryCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as MemoryCursor;

    if (typeof parsed.eventDate !== "string" || typeof parsed.id !== "string") {
      throw new Error("malformed");
    }

    return parsed;
  } catch {
    throw new ServiceError(400, "INVALID_CURSOR", "That page cursor is not valid.");
  }
}

/**
 * Resolves what a memory is about, in the order defined by §7.2.1.
 *
 * The pregnancy fallback is the load-bearing part: during pregnancy
 * `resolveActiveChild` returns null, so without it every pregnancy journal entry
 * would be stored with no target and could never be attributed afterwards.
 */
export async function resolveMemoryTarget(input: {
  familyId: string;
  userId: string;
  childId?: string | null;
  pregnancyId?: string | null;
}): Promise<{ childId: string | null; pregnancyId: string | null }> {
  if (input.childId && input.pregnancyId) {
    throw new ServiceError(
      400,
      "INVALID_INPUT",
      "A memory may reference a child or a pregnancy, not both.",
    );
  }

  if (input.childId) {
    // Validated against the caller's family like every other family-scoped ID.
    const child = await requireFamilyChild(input.familyId, input.childId);
    return { childId: child.id, pregnancyId: null };
  }

  if (input.pregnancyId) {
    const pregnancy = await prisma.pregnancyProfile.findFirst({
      where: { id: input.pregnancyId, familyId: input.familyId },
    });

    if (!pregnancy) {
      throw new ServiceError(404, "PREGNANCY_NOT_FOUND", "Pregnancy not found.");
    }

    return { childId: null, pregnancyId: pregnancy.id };
  }

  const activePregnancy = await findActivePregnancy(input.familyId);
  if (activePregnancy) {
    return { childId: null, pregnancyId: activePregnancy.id };
  }

  const activeChildId = await resolveActiveChild(input.userId, input.familyId);
  if (activeChildId) {
    return { childId: activeChildId, pregnancyId: null };
  }

  // Household-level memory: legitimate before any profile exists.
  return { childId: null, pregnancyId: null };
}

export type MemoryWithRelations = MemoryEntry & {
  author: { name: string | null };
  media: { storageKey: string; status: string }[];
};

export async function serializeMemory(
  memory: MemoryWithRelations,
  signer: StorageSigner,
): Promise<Memory> {
  const attached = memory.media.find((asset) => asset.status === "ATTACHED");
  const storageKey = attached?.storageKey ?? null;

  return {
    id: memory.id,
    title: memory.title,
    body: memory.body,
    eventDate: memory.eventDate.toISOString().slice(0, 10),
    authorName: memory.author.name ?? "Family member",
    visibility: memory.visibility,
    childId: memory.childId,
    pregnancyId: memory.pregnancyId,
    mediaStorageKey: storageKey,
    // Signed per read and short-lived, so a leaked response body stops working.
    mediaUrl: storageKey ? await createDownloadUrl(storageKey, signer) : null,
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
  };
}

const memoryInclude = {
  author: { select: { name: true } },
  media: { select: { storageKey: true, status: true } },
} satisfies Prisma.MemoryEntryInclude;

export async function createMemory(input: {
  familyId: string;
  userId: string;
  body: string;
  eventDate: string;
  visibility: "HOUSEHOLD" | "PRIVATE";
  childId?: string | null;
  pregnancyId?: string | null;
  mediaStorageKey?: string | null;
  recordIdempotency?: (tx: Prisma.TransactionClient, memoryId: string) => Promise<unknown>;
}): Promise<MemoryWithRelations> {
  const eventDate = parseCalendarDateInput(input.eventDate, "eventDate");

  if (eventDate.getTime() > Date.now() + 86_400_000) {
    throw new ServiceError(400, "INVALID_INPUT", "eventDate cannot be in the future.");
  }

  const target = await resolveMemoryTarget({
    familyId: input.familyId,
    userId: input.userId,
    childId: input.childId,
    pregnancyId: input.pregnancyId,
  });

  // Claimed before the transaction: it is a read, and failing here means nothing to
  // roll back.
  const asset = input.mediaStorageKey
    ? await claimPendingAsset({
        familyId: input.familyId,
        userId: input.userId,
        storageKey: input.mediaStorageKey,
      })
    : null;

  return prisma.$transaction(async (tx) => {
    const memory = await tx.memoryEntry.create({
      data: {
        familyId: input.familyId,
        authorUserId: input.userId,
        childId: target.childId,
        pregnancyId: target.pregnancyId,
        title: deriveTitle(input.body),
        body: input.body,
        eventDate,
        visibility: input.visibility,
      },
      include: memoryInclude,
    });

    if (asset) {
      await tx.mediaAsset.update({
        where: { id: asset.id },
        data: { memoryId: memory.id, status: "ATTACHED" },
      });
    }

    if (input.recordIdempotency) {
      // After the business row, same transaction.
      await input.recordIdempotency(tx, memory.id);
    }

    return { ...memory, media: asset ? [{ storageKey: asset.storageKey, status: "ATTACHED" }] : [] };
  });
}

export async function listMemories(input: {
  familyId: string;
  childId?: string;
  cursor?: string;
  limit: number;
}): Promise<{ items: MemoryWithRelations[]; nextCursor: string | null }> {
  const cursor = input.cursor ? decodeCursor(input.cursor) : null;

  if (input.childId) {
    await requireFamilyChild(input.familyId, input.childId);
  }

  const items = await prisma.memoryEntry.findMany({
    where: {
      familyId: input.familyId,
      deletedAt: null,
      // Absent filter means the whole household timeline, so nothing disappears for
      // existing users when multi-child lands.
      ...(input.childId ? { childId: input.childId } : {}),
      ...(cursor
        ? {
            OR: [
              { eventDate: { lt: new Date(cursor.eventDate) } },
              {
                eventDate: new Date(cursor.eventDate),
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    },
    include: memoryInclude,
    orderBy: [{ eventDate: "desc" }, { id: "desc" }],
    // One extra row is how we know whether another page exists without a count query.
    take: input.limit + 1,
  });

  const hasMore = items.length > input.limit;
  const page = hasMore ? items.slice(0, input.limit) : items;
  const last = page.at(-1);

  return {
    items: page,
    nextCursor:
      hasMore && last
        ? encodeCursor({ eventDate: last.eventDate.toISOString(), id: last.id })
        : null,
  };
}

export async function getMemory(familyId: string, memoryId: string): Promise<MemoryWithRelations> {
  const memory = await prisma.memoryEntry.findFirst({
    where: { id: memoryId, familyId, deletedAt: null },
    include: memoryInclude,
  });

  if (!memory) {
    throw new ServiceError(404, "MEMORY_NOT_FOUND", "Memory not found.");
  }

  return memory;
}

/**
 * Edit and delete rights.
 *
 * A CONTRIBUTOR may only touch their own memories; PARENT and OWNER may moderate
 * anything in the household. A VIEWER may touch nothing.
 */
function assertCanMutate(
  memory: MemoryEntry,
  actor: { userId: string; role: FamilyMemberRole },
): void {
  if (memory.authorUserId === actor.userId) {
    if (actor.role === "VIEWER") {
      throw new ServiceError(403, "FORBIDDEN", "Your role does not allow this.");
    }
    return;
  }

  if (actor.role === "OWNER" || actor.role === "PARENT") return;

  throw new ServiceError(403, "FORBIDDEN", "You can only change memories you wrote.");
}

export async function updateMemory(input: {
  familyId: string;
  actor: { userId: string; role: FamilyMemberRole };
  memoryId: string;
  title?: string;
  body?: string;
  visibility?: "HOUSEHOLD" | "PRIVATE";
  childId?: string | null;
  pregnancyId?: string | null;
}): Promise<MemoryWithRelations> {
  const memory = await getMemory(input.familyId, input.memoryId);
  assertCanMutate(memory, input.actor);

  const data: Prisma.MemoryEntryUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.body !== undefined) data.body = input.body;
  if (input.visibility !== undefined) data.visibility = input.visibility;

  // Re-attribution: only when the caller actually named a target, so a plain body
  // edit never silently moves a memory to another child.
  if (input.childId !== undefined || input.pregnancyId !== undefined) {
    const target = await resolveMemoryTarget({
      familyId: input.familyId,
      userId: input.actor.userId,
      childId: input.childId,
      pregnancyId: input.pregnancyId,
    });

    data.child = target.childId ? { connect: { id: target.childId } } : { disconnect: true };
    data.pregnancy = target.pregnancyId
      ? { connect: { id: target.pregnancyId } }
      : { disconnect: true };
  }

  return prisma.memoryEntry.update({
    where: { id: memory.id },
    data,
    include: memoryInclude,
  });
}

/**
 * Soft-deletes the memory and revokes its media.
 *
 * Order matters: the database rows are marked immediately so the memory and its photo
 * stop being readable, and the object itself is deleted afterwards on a best-effort
 * basis. Deleting the object first would leave a readable row pointing at nothing.
 */
export async function deleteMemory(input: {
  familyId: string;
  actor: { userId: string; role: FamilyMemberRole };
  memoryId: string;
  signer: StorageSigner;
}): Promise<void> {
  const memory = await getMemory(input.familyId, input.memoryId);
  assertCanMutate(memory, input.actor);

  const assets = await prisma.mediaAsset.findMany({
    where: { memoryId: memory.id, status: { not: "DELETED" } },
    select: { id: true, storageKey: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.memoryEntry.update({
      where: { id: memory.id },
      data: { deletedAt: new Date() },
    });

    await tx.mediaAsset.updateMany({
      where: { memoryId: memory.id },
      data: { status: "DELETED", deletedAt: new Date() },
    });
  });

  // Outside the transaction: a provider call inside one can exhaust the pool, and a
  // failure here is recoverable by the cleanup job.
  for (const asset of assets) {
    await input.signer.deleteObject(asset.storageKey).catch(() => {});
  }
}
