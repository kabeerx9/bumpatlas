import {
  ApiError,
  createApiClient,
  deleteAccountInputSchema,
  meResponseSchema,
  updateAccountInputSchema,
  type DeleteAccountInput,
  type UpdateAccountInput,
} from "@bumpatlas/contracts";
import { env } from "@bumpatlas/env/native";

import { getClerkAuthToken } from "@/utils/clerk-auth";

export type { DeleteAccountInput, UpdateAccountInput };
export { ApiError };

/** @deprecated Prefer `@/lib/api/*` domain modules. Kept for account mutations. */
const api = createApiClient({
  baseUrl: env.EXPO_PUBLIC_SERVER_URL,
  getToken: getClerkAuthToken,
});

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

export { apiClient, useMockData } from "./api/client";
export * from "./api/hooks";
