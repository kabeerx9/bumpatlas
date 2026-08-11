import {
  createMemoryInputSchema,
  listMemoriesResponseSchema,
  mediaUploadUrlInputSchema,
  mediaUploadUrlResponseSchema,
  memorySchema,
  updateMemoryInputSchema,
  type CreateMemoryInput,
  type MediaUploadUrlInput,
  type UpdateMemoryInput,
} from "@bumpatlas/contracts";

import { uploadMediaToSignedUrl } from "@/lib/media/upload";

import { apiClient } from "./client";

export { uploadMediaToSignedUrl };

export function listMemories(cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiClient.requestJson(`/api/v1/memories${query}`, listMemoriesResponseSchema);
}

export function getMemory(id: string) {
  return apiClient.requestJson(`/api/v1/memories/${id}`, memorySchema);
}

export function createMemory(
  input: CreateMemoryInput,
  idempotencyKey?: string,
  authToken?: string,
) {
  const body = createMemoryInputSchema.parse(input);
  return apiClient.requestJson("/api/v1/memories", memorySchema, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });
}

export function updateMemory(id: string, input: UpdateMemoryInput) {
  const body = updateMemoryInputSchema.parse(input);
  return apiClient.requestJson(`/api/v1/memories/${id}`, memorySchema, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteMemory(id: string) {
  return apiClient.requestVoid(`/api/v1/memories/${id}`, { method: "DELETE" });
}

export function getMediaUploadUrl(input: MediaUploadUrlInput) {
  const body = mediaUploadUrlInputSchema.parse(input);
  return apiClient.requestJson("/api/v1/media/upload-url", mediaUploadUrlResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
