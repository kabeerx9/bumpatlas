import type { FastifyRequest } from "fastify";

import { createRequireAuth, type GetAuth } from "@/middleware/require-auth";

export const TEST_AUTH_HEADER = "x-test-clerk-user-id";

/**
 * Stands in for Clerk token verification only.
 *
 * Everything downstream — local user provisioning, family resolution, role checks,
 * admin matching — runs for real, so an isolation test proves the production code
 * path rather than the stub. The Clerk ID travels in a test-only header so a single
 * app instance can act as several users within one test.
 */
export const testGetAuth: GetAuth = (request: FastifyRequest) => {
  const header = request.headers[TEST_AUTH_HEADER];
  const userId = Array.isArray(header) ? header[0] : header;

  return { userId: userId ?? null };
};

export const testRequireAuth = createRequireAuth(testGetAuth);

/** Headers for a request authenticated as the given Clerk user. */
export function asUser(clerkUserId: string): Record<string, string> {
  return { [TEST_AUTH_HEADER]: clerkUserId };
}
