import {
  listModerationQueueResponseSchema,
  moderationActionInputSchema,
  moderationItemSchema,
  type ModerationActionInput,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function listModerationQueue() {
  return apiClient.requestJson("/api/v1/moderation/queue", listModerationQueueResponseSchema);
}

export function applyModerationAction(id: string, input: ModerationActionInput) {
  const body = moderationActionInputSchema.parse(input);
  return apiClient.requestJson(`/api/v1/moderation/${id}/actions`, moderationItemSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
