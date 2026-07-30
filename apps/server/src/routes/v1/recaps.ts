import {
  publicRecapSchema,
  recapSchema,
  shareLinkResponseSchema,
} from "@bumpatlas/contracts/v1";
import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/middleware/require-auth";
import { requireCurrentFamily } from "@/middleware/require-family-member";
import { trackProductEvent } from "@/services/product-event";
import {
  createShareLink,
  getOrCreateRecap,
  getPublicRecap,
  revokeShareLinks,
  serializeRecap,
} from "@/services/recap";

export type RecapRouteDeps = {
  requireAuth: typeof requireAuth;
};

export async function registerRecapRoutes(
  fastify: FastifyInstance,
  deps: Partial<RecapRouteDeps> = {},
) {
  const d = { requireAuth, ...deps };

  /**
   * Generates on demand when the Sunday job has not run, so a late cron never shows the
   * user an empty screen.
   */
  fastify.get("/api/v1/recaps/current", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const family = await requireCurrentFamily(auth);

    const { recap, eligible } = await getOrCreateRecap({
      familyId: family.familyId,
      userId: auth.userId,
      timeZone: request.timeZone,
    });

    await trackProductEvent("RECAP_OPENED", {
      actorUserId: auth.userId,
      familyId: family.familyId,
      metadata: { eligible },
      logger: request.log,
    });

    return reply.send(
      recapSchema.parse(await serializeRecap({ recap, eligible, familyId: family.familyId })),
    );
  });

  fastify.post("/api/v1/recaps/current/share-link", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const family = await requireCurrentFamily(auth);

    const { recap } = await getOrCreateRecap({
      familyId: family.familyId,
      userId: auth.userId,
      timeZone: request.timeZone,
    });

    const link = await createShareLink({ recapId: recap.id, userId: auth.userId });

    await trackProductEvent("RECAP_SHARED", {
      actorUserId: auth.userId,
      familyId: family.familyId,
      logger: request.log,
    });

    return reply.code(201).send(shareLinkResponseSchema.parse(link));
  });

  /** Turning the link off must be possible after sharing it with the wrong person. */
  fastify.delete("/api/v1/recaps/current/share-link", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const family = await requireCurrentFamily(auth);

    const { recap } = await getOrCreateRecap({
      familyId: family.familyId,
      userId: auth.userId,
      timeZone: request.timeZone,
    });

    await revokeShareLinks(recap.id);

    return reply.code(204).send();
  });
}

/**
 * The only unauthenticated product route.
 *
 * Registered separately from the authenticated recap routes so it is obvious at the
 * registration site that this path has no Clerk requirement.
 */
export async function registerPublicRecapRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { token: string } }>(
    "/api/v1/public/recaps/:token",
    async (request, reply) => {
      const recap = await getPublicRecap(request.params.token);

      // Not cacheable by a shared proxy: the URL is the credential.
      reply.header("cache-control", "private, no-store");

      return reply.send(publicRecapSchema.parse(recap));
    },
  );
}
