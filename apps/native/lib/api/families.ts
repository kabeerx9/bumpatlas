import {
  acceptInviteInputSchema,
  createFamilyInputSchema,
  createInviteInputSchema,
  createInviteResponseSchema,
  familySummarySchema,
  invitePreviewSchema,
  stageResponseSchema,
  updateMemberInputSchema,
  type AcceptInviteInput,
  type CreateFamilyInput,
  type CreateInviteInput,
  type UpdateMemberInput,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function createFamily(input: CreateFamilyInput) {
  const body = createFamilyInputSchema.parse(input);
  return apiClient.requestJson("/api/v1/families", familySummarySchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getCurrentFamily() {
  return apiClient.requestJson("/api/v1/families/current", familySummarySchema);
}

export function createInvite(input: CreateInviteInput) {
  const body = createInviteInputSchema.parse(input);
  return apiClient.requestJson(
    "/api/v1/families/current/invites",
    createInviteResponseSchema,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

/** Public possession-based preview; the response contract is intentionally minimal. */
export function getInvitePreview(token: string) {
  return apiClient.requestJson(
    `/api/v1/invites/${encodeURIComponent(token)}/preview`,
    invitePreviewSchema,
  );
}

export function acceptInvite(input: AcceptInviteInput) {
  const parsed = acceptInviteInputSchema.parse(input);
  return apiClient.requestJson(
    `/api/v1/invites/${encodeURIComponent(parsed.token)}/accept`,
    familySummarySchema,
    { method: "POST" },
  );
}

export function updateMember(memberId: string, input: UpdateMemberInput) {
  const body = updateMemberInputSchema.parse(input);
  return apiClient.requestJson(
    `/api/v1/families/current/members/${memberId}`,
    familySummarySchema,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export function removeMember(memberId: string) {
  return apiClient.requestVoid(`/api/v1/families/current/members/${memberId}`, {
    method: "DELETE",
  });
}

export function getStage() {
  return apiClient.requestJson("/api/v1/stage", stageResponseSchema);
}
