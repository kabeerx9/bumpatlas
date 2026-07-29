import { entitlementsResponseSchema } from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function getEntitlements() {
  return apiClient.requestJson("/api/v1/entitlements", entitlementsResponseSchema);
}
