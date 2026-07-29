import { recapSchema, shareLinkResponseSchema } from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function getCurrentRecap() {
  return apiClient.requestJson("/api/v1/recaps/current", recapSchema);
}

export function createRecapShareLink() {
  return apiClient.requestJson("/api/v1/recaps/current/share-link", shareLinkResponseSchema, {
    method: "POST",
  });
}
