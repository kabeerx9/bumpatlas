import {
  contentDetailSchema,
  listContentQuerySchema,
  listContentResponseSchema,
  listMilestonesResponseSchema,
  milestoneObservationSchema,
  upsertMilestoneObservationInputSchema,
} from "@bumpatlas/contracts/v1";
import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/middleware/require-auth";
import {
  requireCurrentFamily,
  requireCurrentFamilyWithPermission,
} from "@/middleware/require-family-member";
import { getContentBySlug, listContent, toggleBookmark } from "@/services/content";
import { invalidInput } from "@/services/errors";
import { listMilestones, upsertObservation } from "@/services/milestone";

export type ContentRouteDeps = {
  requireAuth: typeof requireAuth;
};

export async function registerContentRoutes(
  fastify: FastifyInstance,
  deps: Partial<ContentRouteDeps> = {},
) {
  const d = { requireAuth, ...deps };

  fastify.get("/api/v1/content", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsedQuery = listContentQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send(invalidInput(parsedQuery.error, request.id));
    }

    const result = await listContent({
      userId: auth.userId,
      stageTag: parsedQuery.data.stageTag,
      cursor: parsedQuery.data.cursor,
      limit: parsedQuery.data.limit,
    });

    return reply.send(listContentResponseSchema.parse(result));
  });

  fastify.get<{ Params: { slug: string } }>(
    "/api/v1/content/:slug",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const detail = await getContentBySlug({ userId: auth.userId, slug: request.params.slug });

      return reply.send(contentDetailSchema.parse(detail));
    },
  );

  /** Toggle, matching the shipped client's single POST. 204 either way. */
  fastify.post<{ Params: { id: string } }>(
    "/api/v1/content/:id/bookmark",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      await toggleBookmark({ userId: auth.userId, contentItemId: request.params.id });

      return reply.code(204).send();
    },
  );

  fastify.get<{ Querystring: { childId?: string } }>(
    "/api/v1/milestones",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const family = await requireCurrentFamily(auth);

      const result = await listMilestones({
        userId: auth.userId,
        familyId: family.familyId,
        childId: request.query.childId,
        timeZone: request.timeZone,
      });

      return reply.send(listMilestonesResponseSchema.parse(result));
    },
  );

  fastify.put<{ Params: { definitionId: string } }>(
    "/api/v1/milestones/:definitionId/observation",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const parsed = upsertMilestoneObservationInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(invalidInput(parsed.error, request.id));
      }

      const family = await requireCurrentFamilyWithPermission(auth, "canContribute");

      const observation = await upsertObservation({
        familyId: family.familyId,
        userId: auth.userId,
        definitionId: request.params.definitionId,
        // Explicit, never resolved: a wrong-sibling observation is unrecoverable.
        childId: parsed.data.childId,
        status: parsed.data.status,
        memoryId: parsed.data.memoryId,
      });

      return reply.send(milestoneObservationSchema.parse(observation));
    },
  );
}
