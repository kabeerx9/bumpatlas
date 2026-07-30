import prisma from "@bumpatlas/db";
import { env } from "@bumpatlas/env/server";
import { getAuth } from "@clerk/fastify";
import type { FastifyReply, FastifyRequest } from "fastify";

import { isDemoSeedingEnabled, seedNewUserIfEnabled } from "@/services/demo/seed-new-user";
import { unauthenticated } from "@/services/errors";

/**
 * Everything a route may trust about the caller. Deliberately small: no role, no
 * entitlement, no quota. Those are per-family and read from the database at the
 * point of use, because a client can send anything and a cached role goes stale
 * the moment an owner changes it.
 */
export type AuthContext = {
  clerkUserId: string;
  /** Local `User.id`. Every foreign key in the schema uses this, never the Clerk ID. */
  userId: string;
  defaultFamilyId: string | null;
  isAdmin: boolean;
};

/**
 * Just-in-time provisioning with the minimum fields.
 *
 * Clerk is deliberately not called here — that would put a provider round trip in
 * front of every authenticated request. The row starts with only the Clerk ID;
 * `/api/me` and the Clerk webhook fill in email, name, and avatar.
 */
const USER_FIELDS = { id: true, defaultFamilyId: true, timeZone: true } as const;

async function loadOrCreateUser(clerkUserId: string): Promise<{
  id: string;
  defaultFamilyId: string | null;
  timeZone: string | null;
}> {
  // Upsert rather than find-then-create. A cold app start fans out ~10 authenticated
  // requests concurrently, so for a Clerk user with no local row yet every one of them
  // misses the read and then races the insert: one wins and the rest fail P2002. Prisma
  // compiles a unique-field upsert with no nested writes into a single
  // INSERT ... ON CONFLICT DO UPDATE, which the database resolves atomically.
  //
  // `update: {}` is deliberate — this row is only ever *created* here. Email, name, and
  // avatar are owned by /api/me and the Clerk webhook, and must not be clobbered.
  try {
    return await prisma.user.upsert({
      where: { clerkId: clerkUserId },
      create: { clerkId: clerkUserId },
      update: {},
      select: USER_FIELDS,
    });
  } catch (error) {
    // Belt and braces: ON CONFLICT covers the common race, but a concurrent insert landing
    // between the conflict check and the update can still surface P2002. The row provably
    // exists by then, so re-reading is the correct recovery.
    if ((error as { code?: string }).code !== "P2002") throw error;

    const existing = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: USER_FIELDS,
    });

    if (!existing) throw error;
    return existing;
  }
}

/**
 * Persisting the time zone must never fail the request that carried it: it is
 * incidental metadata, and a failed write only means the next request retries.
 */
function persistTimeZone(
  request: FastifyRequest,
  userId: string,
  current: string | null,
): void {
  const incoming = request.timeZone;
  if (!incoming || incoming === current) return;

  void prisma.user
    .update({ where: { id: userId }, data: { timeZone: incoming } })
    .catch((error: unknown) => {
      request.log.warn({ err: error }, "Failed to persist user time zone");
    });
}

export type GetAuth = (request: FastifyRequest) => { userId?: string | null };

/**
 * Built as a factory so tests can drive the real provisioning and admin logic with
 * a stubbed token reader. Verifying "a first request creates the local user" is
 * only possible if `getAuth` is injectable.
 */
export function createRequireAuth(getAuthFn: GetAuth = getAuth) {
  /**
   * Returns the auth context, or sends 401 and returns null.
   *
   * Callers must bail on null — `const auth = await requireAuth(request, reply);
   * if (!auth) return;` — the convention the reference slice in §17 encodes.
   */
  return async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<AuthContext | null> {
    const clerkUserId = getAuthFn(request).userId;

    if (!clerkUserId) {
      await reply.code(401).send(unauthenticated(request.id));
      return null;
    }

    let user = await loadOrCreateUser(clerkUserId);

    // Development affordance, off by default: give a brand-new account a populated household
    // so a first sign-in does not land on empty-state screens. Awaited rather than fired off,
    // because the request that triggers it is usually the very first /api/v1/today — letting
    // it race would return an empty payload and cache it client-side.
    if (!user.defaultFamilyId && isDemoSeedingEnabled()) {
      await seedNewUserIfEnabled(user.id, request.log);
      user = (await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: USER_FIELDS,
      })) as typeof user;
    }

    persistTimeZone(request, user.id, user.timeZone);

    return {
      clerkUserId,
      userId: user.id,
      defaultFamilyId: user.defaultFamilyId,
      // Matched against Clerk user IDs: that is what an operator copies out of the
      // Clerk dashboard into ADMIN_USER_IDS.
      isAdmin: env.ADMIN_USER_IDS.includes(clerkUserId),
    };
  };
}

export const requireAuth = createRequireAuth();

export type RequireAuth = typeof requireAuth;
