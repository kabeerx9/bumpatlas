import {
  ApiError,
  adminMetricsResponseSchema,
  createApiClient,
  deleteAccountInputSchema,
  invitePreviewSchema,
  meResponseSchema,
  updateAccountInputSchema,
  type AdminMetricsRange,
  type AdminMetricsResponse,
  type DeleteAccountInput,
  type InvitePreview,
  type MeResponse,
  type UpdateAccountInput,
} from "@bumpatlas/contracts";
import { env } from "@bumpatlas/env/web";

import { getClerkAuthToken } from "@/utils/clerk-auth";

export type {
  AdminMetricsRange,
  AdminMetricsResponse,
  DeleteAccountInput,
  InvitePreview,
  MeResponse,
  UpdateAccountInput,
};
export { ApiError };

const api = createApiClient({
  baseUrl: env.VITE_SERVER_URL,
  getToken: getClerkAuthToken,
  credentials: "include",
});

/** Founder-only; the server 404s for everyone else (admin cloaking). */
export function getAdminMetrics(range: AdminMetricsRange = "30d") {
  return api.requestJson(
    `/api/v1/admin/metrics?range=${range}`,
    adminMetricsResponseSchema,
  );
}

export function getMe() {
  return api.requestJson("/api/me", meResponseSchema);
}

/** Public, possession-based household invite preview. */
export function getInvitePreview(token: string) {
  return api.requestJson(
    `/api/v1/invites/${encodeURIComponent(token)}/preview`,
    invitePreviewSchema,
  );
}

export function updateAccount(input: UpdateAccountInput) {
  const body = updateAccountInputSchema.parse(input);
  return api.requestJson("/api/account", meResponseSchema, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteAccount(input: DeleteAccountInput) {
  const body = deleteAccountInputSchema.parse(input);
  return api.requestVoid("/api/account", {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}
