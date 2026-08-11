import { router } from "expo-router";

import { ApiError } from "@bumpatlas/contracts";

import { appRoutes } from "@/navigation/routes";

let handlingAuthError = false;

/** Route to session-expired / no-access on API authz failures. */
export function handleApiError(
  error: unknown,
  context: { returnTo?: string } = {},
): void {
  if (!(error instanceof ApiError)) return;
  if (handlingAuthError) return;

  if (error.status === 401) {
    handlingAuthError = true;
    try {
      // Lazy require avoids queryClient <-> errors require cycle.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { queryClient } = require("@/lib/queryClient") as typeof import("@/lib/queryClient");
      queryClient.clear();
    } catch {
      // ignore cache clear failures during boot
    }
    router.replace(
      context.returnTo
        ? appRoutes.sessionExpiredWithReturnTo(context.returnTo)
        : appRoutes.sessionExpired,
    );
    setTimeout(() => {
      handlingAuthError = false;
    }, 1500);
    return;
  }

  if (error.status === 403) {
    handlingAuthError = true;
    router.replace(appRoutes.noAccess);
    setTimeout(() => {
      handlingAuthError = false;
    }, 1500);
  }
}

export async function withApiErrorHandling<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}
