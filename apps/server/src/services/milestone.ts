import prisma from "@bumpatlas/db";
import type {
  ListMilestonesResponse,
  MilestoneObservation as MilestoneObservationContract,
  MilestoneStatus as MilestoneStatusContract,
} from "@bumpatlas/contracts/v1";
import type { MilestoneStatus } from "@bumpatlas/db/types";

import { ServiceError } from "@/services/errors";
import { resolveActiveChild } from "@/services/family";
import { requireFamilyChild } from "@/services/profile";
import { resolveStageForUser } from "@/services/profile";

/** Contract casing (correction 12): Prisma OBSERVED maps to "observed". */
const TO_CONTRACT: Record<MilestoneStatus, MilestoneStatusContract> = {
  NOT_OBSERVED: "not_observed",
  EMERGING: "emerging",
  OBSERVED: "observed",
  SKIPPED: "skipped",
};

const TO_PRISMA: Record<MilestoneStatusContract, MilestoneStatus> = {
  not_observed: "NOT_OBSERVED",
  emerging: "EMERGING",
  observed: "OBSERVED",
  skipped: "SKIPPED",
};

/**
 * Lists the definitions for the child's stage plus that child's observations.
 *
 * Returns an empty definition set rather than an error when the family has no children
 * — normal during pregnancy — and echoes the resolved `childId` so the client never has
 * to guess which sibling the list describes.
 *
 * Nothing here computes delay, readiness, or any comparison between children.
 */
export async function listMilestones(input: {
  userId: string;
  familyId: string;
  childId?: string;
  timeZone: string | null;
}): Promise<ListMilestonesResponse> {
  const childId = input.childId
    ? (await requireFamilyChild(input.familyId, input.childId)).id
    : await resolveActiveChild(input.userId, input.familyId);

  if (!childId) {
    return { childId: null, definitions: [], observations: [] };
  }

  const { stage } = await resolveStageForUser({
    userId: input.userId,
    familyId: input.familyId,
    timeZone: input.timeZone,
  });

  const definitions = await prisma.milestoneDefinition.findMany({
    where: {
      isPublished: true,
      OR: [{ stageTags: { has: stage.stageKey } }, { stageTags: { isEmpty: true } }],
    },
    orderBy: { slug: "asc" },
  });

  const observations = await prisma.milestoneObservation.findMany({
    // Family scoping inside the query, not after it.
    where: { childId, familyId: input.familyId },
  });

  return {
    childId,
    definitions: definitions.map((definition) => ({
      id: definition.id,
      slug: definition.slug,
      title: definition.title,
      guidance: definition.guidance,
      domain: definition.domain,
      stageTags: definition.stageTags,
      reviewerName: definition.reviewerName,
      reviewedOn: definition.reviewedOn?.toISOString().slice(0, 10) ?? null,
    })),
    observations: observations.map(serializeObservation),
  };
}

function serializeObservation(observation: {
  definitionId: string;
  childId: string;
  status: MilestoneStatus;
  observedAt: Date | null;
  memoryId: string | null;
}): MilestoneObservationContract {
  return {
    definitionId: observation.definitionId,
    childId: observation.childId,
    status: TO_CONTRACT[observation.status],
    observedAt: observation.observedAt?.toISOString() ?? null,
    memoryId: observation.memoryId,
  };
}

/**
 * Upserts one observation for one child.
 *
 * `childId` is required from the caller rather than resolved: an observation silently
 * recorded against the wrong sibling is unrecoverable, because nothing in the data would
 * reveal the mistake later.
 */
export async function upsertObservation(input: {
  familyId: string;
  userId: string;
  definitionId: string;
  childId: string;
  status: MilestoneStatusContract;
  memoryId?: string | null;
}): Promise<MilestoneObservationContract> {
  const child = await requireFamilyChild(input.familyId, input.childId);

  const definition = await prisma.milestoneDefinition.findFirst({
    where: { id: input.definitionId, isPublished: true },
    select: { id: true },
  });

  if (!definition) {
    throw new ServiceError(404, "MILESTONE_NOT_FOUND", "Milestone not found.");
  }

  if (input.memoryId) {
    // A linked memory must belong to this household too.
    const memory = await prisma.memoryEntry.findFirst({
      where: { id: input.memoryId, familyId: input.familyId, deletedAt: null },
      select: { id: true },
    });

    if (!memory) {
      throw new ServiceError(404, "MEMORY_NOT_FOUND", "Memory not found.");
    }
  }

  const status = TO_PRISMA[input.status];
  // Timestamped only when actually observed; clearing the status clears the date.
  const observedAt = status === "OBSERVED" ? new Date() : null;

  const observation = await prisma.milestoneObservation.upsert({
    where: {
      childId_definitionId: { childId: child.id, definitionId: definition.id },
    },
    create: {
      familyId: input.familyId,
      childId: child.id,
      definitionId: definition.id,
      status,
      observedAt,
      memoryId: input.memoryId ?? null,
    },
    update: {
      status,
      observedAt,
      ...(input.memoryId === undefined ? {} : { memoryId: input.memoryId }),
    },
  });

  return serializeObservation(observation);
}
