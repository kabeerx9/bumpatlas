import {
  childSchema,
  convertPregnancyInputSchema,
  createChildInputSchema,
  createPregnancyInputSchema,
  pregnancySchema,
  updateChildInputSchema,
  updatePregnancyInputSchema,
  type ConvertPregnancyInput,
  type CreateChildInput,
  type CreatePregnancyInput,
  type UpdateChildInput,
  type UpdatePregnancyInput,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function createPregnancy(input: CreatePregnancyInput) {
  const body = createPregnancyInputSchema.parse(input);
  return apiClient.requestJson("/api/v1/pregnancies", pregnancySchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePregnancy(id: string, input: UpdatePregnancyInput) {
  const body = updatePregnancyInputSchema.parse(input);
  return apiClient.requestJson(`/api/v1/pregnancies/${id}`, pregnancySchema, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function convertPregnancy(id: string, input: ConvertPregnancyInput) {
  const body = convertPregnancyInputSchema.parse(input);
  return apiClient.requestJson(`/api/v1/pregnancies/${id}/convert`, childSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createChild(input: CreateChildInput) {
  const body = createChildInputSchema.parse(input);
  return apiClient.requestJson("/api/v1/children", childSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateChild(id: string, input: UpdateChildInput) {
  const body = updateChildInputSchema.parse(input);
  return apiClient.requestJson(`/api/v1/children/${id}`, childSchema, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
