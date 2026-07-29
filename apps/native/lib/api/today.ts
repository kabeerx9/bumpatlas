import {
  completeChallengeInputSchema,
  listBadgesResponseSchema,
  todayResponseSchema,
  type CompleteChallengeInput,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function getToday() {
  return apiClient.requestJson("/api/v1/today", todayResponseSchema);
}

export function completeChallenge(input: CompleteChallengeInput) {
  const body = completeChallengeInputSchema.parse(input);
  return apiClient.requestJson("/api/v1/challenges/complete", todayResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listBadges() {
  return apiClient.requestJson("/api/v1/badges", listBadgesResponseSchema);
}
