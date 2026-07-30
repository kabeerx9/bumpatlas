import {
  listModerationQueueResponseSchema,
  moderationActionInputSchema,
  moderationItemSchema,
} from "@bumpatlas/contracts/v1";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireAdmin } from "@/middleware/require-admin";
import { requireAuth } from "@/middleware/require-auth";
import {
  applyModerationAction,
  listModerationQueue,
  type AdminAction,
} from "@/services/community/moderation";
import { invalidInput } from "@/services/errors";

/**
 * The current contract accepts review/hide/escalate. Resolve and reject are accepted here
 * too — the founder needs a way to close an item, and a queue that only grows is a queue
 * nobody works.
 */
const adminActionSchema = moderationActionInputSchema.extend({
  action: z.enum(["hide", "review", "escalate", "resolve", "reject"]),
});

export type ModerationRouteDeps = {
  requireAuth: typeof requireAuth;
};

export async function registerModerationRoutes(
  fastify: FastifyInstance,
  deps: Partial<ModerationRouteDeps> = {},
) {
  const d = { requireAuth, ...deps };

  fastify.get("/api/v1/moderation/queue", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    // 404 rather than 403: a non-admin probing this path learns nothing about it.
    requireAdmin(auth);

    return reply.send(
      listModerationQueueResponseSchema.parse({ items: await listModerationQueue() }),
    );
  });

  fastify.post<{ Params: { id: string } }>(
    "/api/v1/moderation/:id/actions",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      requireAdmin(auth);

      const parsed = adminActionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(invalidInput(parsed.error, request.id));
      }

      const item = await applyModerationAction({
        adminUserId: auth.userId,
        reportId: request.params.id,
        action: parsed.data.action as AdminAction,
        note: parsed.data.note,
      });

      return reply.send(moderationItemSchema.parse(item));
    },
  );
}
