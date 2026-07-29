import {
  contentDetailSchema,
  listContentResponseSchema,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function listContent(cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiClient.requestJson(`/api/v1/content${query}`, listContentResponseSchema);
}

export function getContent(slug: string) {
  return apiClient.requestJson(`/api/v1/content/${encodeURIComponent(slug)}`, contentDetailSchema);
}

export function bookmarkContent(id: string) {
  return apiClient.requestVoid(`/api/v1/content/${id}/bookmark`, { method: "POST" });
}
