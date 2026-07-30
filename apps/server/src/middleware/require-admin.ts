import type { AuthContext } from "@/middleware/require-auth";
import { ServiceError } from "@/services/errors";

/**
 * Founder-only surfaces: the moderation queue and moderation actions.
 *
 * `404` rather than `403` so the existence of an admin surface is not confirmed to
 * a non-admin who probes for it.
 */
export function requireAdmin(auth: AuthContext): void {
  if (!auth.isAdmin) {
    throw new ServiceError(404, "ROUTE_NOT_FOUND", "Not found.");
  }
}

/**
 * Cron routes authenticate with a shared secret, not a Clerk token, because the
 * caller is the hosting provider's scheduler.
 *
 * Compared with `timingSafeEqual` on equal-length buffers: a plain `===` on
 * secrets leaks length and prefix information through timing.
 */
export function requireCronSecret(header: string | undefined, expected: string): void {
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!provided || !timingSafeStringEqual(provided, expected)) {
    throw new ServiceError(401, "UNAUTHENTICATED", "Unauthorized.");
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}
