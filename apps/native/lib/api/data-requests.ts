import {
  createDataRequestInputSchema,
  dataRequestSchema,
  type CreateDataRequestInput,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function createDataRequest(input: CreateDataRequestInput) {
  const body = createDataRequestInputSchema.parse(input);
  return apiClient.requestJson("/api/v1/data-requests", dataRequestSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
