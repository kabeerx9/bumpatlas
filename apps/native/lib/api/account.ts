import {
  deleteAccountInputSchema,
  meResponseSchema,
  updateAccountInputSchema,
  type DeleteAccountInput,
  type UpdateAccountInput,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

/**
 * `/api/account` (not `/api/v1`) — the account routes predate the v1 API and
 * still return the legacy string-or-object error envelope, but they run
 * through the same typed client and Zod-parsed response as everything else.
 */
export function updateAccount(input: UpdateAccountInput) {
  const body = updateAccountInputSchema.parse(input);
  return apiClient.requestJson("/api/account", meResponseSchema, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteAccount(input: DeleteAccountInput) {
  const body = deleteAccountInputSchema.parse(input);
  return apiClient.requestVoid("/api/account", {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}
