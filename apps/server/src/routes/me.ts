import { getAuth, clerkClient } from "@clerk/fastify";
import { meResponseSchema } from "@bumpatlas/contracts/me";
import { env } from "@bumpatlas/env/server";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { getOrCreateUserByClerkId, mapClerkApiUser, serializeUser } from "@/services/user";

export type MeRouteDeps = {
  getAuth: (request: FastifyRequest) => { userId: string | null | undefined };
};

const defaultDeps: MeRouteDeps = { getAuth };

export async function registerMeRoutes(
  fastify: FastifyInstance,
  deps: Partial<MeRouteDeps> = {},
) {
  const { getAuth: getAuthFn } = { ...defaultDeps, ...deps };

  fastify.get("/api/me", async (request, reply) => {
    const { userId } = getAuthFn(request);

    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const user = await getOrCreateUserByClerkId(userId, async () => {
      const clerkUser = await clerkClient.users.getUser(userId);
      return mapClerkApiUser(clerkUser);
    });

    // Same allowlist match `requireAuth` uses for `/api/v1/*` routes — kept
    // independent so `/api/me` never needs the full auth-context machinery.
    const isAdmin = env.ADMIN_USER_IDS.includes(userId);

    return meResponseSchema.parse(serializeUser(user, isAdmin));
  });
}
