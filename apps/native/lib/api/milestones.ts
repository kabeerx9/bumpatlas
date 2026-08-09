import {
  listMilestonesResponseSchema,
  milestoneObservationSchema,
  upsertMilestoneObservationInputSchema,
  type UpsertMilestoneObservationInput,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

/**
 * `childId` is optional here because the server resolves the active child
 * when omitted (§6.2.1) — the caller passes it only to scope the list to a
 * specific sibling.
 */
export function listMilestones(childId?: string) {
  const query = childId ? `?childId=${encodeURIComponent(childId)}` : "";
  return apiClient.requestJson(`/api/v1/milestones${query}`, listMilestonesResponseSchema);
}

export function upsertMilestoneObservation(
  definitionId: string,
  input: UpsertMilestoneObservationInput,
) {
  const body = upsertMilestoneObservationInputSchema.parse(input);
  return apiClient.requestJson(
    `/api/v1/milestones/${encodeURIComponent(definitionId)}/observation`,
    milestoneObservationSchema,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}
