import {
  consentRecordSchema,
  createConsentInputSchema,
  type CreateConsentInput,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function createConsent(input: CreateConsentInput) {
  const body = createConsentInputSchema.parse(input);
  return apiClient.requestJson("/api/v1/consents", consentRecordSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
