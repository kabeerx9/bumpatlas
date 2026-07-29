import {
  blockInputSchema,
  commentSchema,
  createCommentInputSchema,
  createGroupPostInputSchema,
  groupPostSchema,
  listGroupPostsResponseSchema,
  listGroupsResponseSchema,
  reportInputSchema,
  type BlockInput,
  type CreateCommentInput,
  type CreateGroupPostInput,
  type ReportInput,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function listGroups() {
  return apiClient.requestJson("/api/v1/groups", listGroupsResponseSchema);
}

export function joinGroup(groupId: string) {
  return apiClient.requestVoid(`/api/v1/groups/${groupId}/join`, { method: "POST" });
}

export function listGroupPosts(groupId: string, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiClient.requestJson(
    `/api/v1/groups/${groupId}/posts${query}`,
    listGroupPostsResponseSchema,
  );
}

export function createGroupPost(groupId: string, input: CreateGroupPostInput) {
  const body = createGroupPostInputSchema.parse(input);
  return apiClient.requestJson(`/api/v1/groups/${groupId}/posts`, groupPostSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createComment(postId: string, input: CreateCommentInput) {
  const body = createCommentInputSchema.parse(input);
  return apiClient.requestJson(`/api/v1/posts/${postId}/comments`, commentSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function reactToPost(postId: string) {
  return apiClient.requestVoid(`/api/v1/posts/${postId}/reactions`, { method: "POST" });
}

export function createReport(input: ReportInput) {
  const body = reportInputSchema.parse(input);
  return apiClient.requestVoid("/api/v1/reports", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function blockUser(input: BlockInput) {
  const body = blockInputSchema.parse(input);
  return apiClient.requestVoid("/api/v1/blocks", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
