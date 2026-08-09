import {
  ApiError,
  adminMetricsResponseSchema,
  createApiClient,
  deleteAccountInputSchema,
  meResponseSchema,
  updateAccountInputSchema,
  type AdminMetricsResponse,
  type DeleteAccountInput,
  type MeResponse,
  type UpdateAccountInput,
} from "@bumpatlas/contracts";
import { env } from "@bumpatlas/env/web";

import { getClerkAuthToken } from "@/utils/clerk-auth";

export type { AdminMetricsResponse, DeleteAccountInput, MeResponse, UpdateAccountInput };
export { ApiError };

const api = createApiClient({
  baseUrl: env.VITE_SERVER_URL,
  getToken: getClerkAuthToken,
  credentials: "include",
});

/** Founder-only; the server 404s for everyone else (admin cloaking). */
export function getAdminMetrics() {
  return api.requestJson("/api/v1/admin/metrics", adminMetricsResponseSchema);
}

export function getMe() {
  return api.requestJson("/api/me", meResponseSchema);
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
