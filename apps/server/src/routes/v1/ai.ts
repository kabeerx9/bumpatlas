import {
  aiChatInputSchema,
  aiChatResponseSchema,
  aiUsageResponseSchema,
  reportAiMessageInputSchema,
} from "@bumpatlas/contracts/v1";
import { env } from "@bumpatlas/env/server";
import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/middleware/require-auth";
import {
  requireCurrentFamily,
  requireCurrentFamilyWithPermission,
} from "@/middleware/require-family-member";
import {
  deleteConversation,
  disabledProvider,
  reportMessage,
  sendMessage,
  type AiProvider,
} from "@/services/ai/chat";
import { getUsage } from "@/services/ai/quota";
import { featureUnavailable, invalidInput } from "@/services/errors";
import { isFeatureEnabledForRequest } from "@/services/feature-flags";

export type AiRouteDeps = {
  requireAuth: typeof requireAuth;
  provider: AiProvider;
};

export async function registerAiRoutes(
  fastify: FastifyInstance,
  deps: Partial<AiRouteDeps> = {},
) {
  // No provider is wired by default. Enabling the flag without configuring one yields a
  // clean 503 rather than a confusing runtime error.
  const d = { requireAuth, provider: disabledProvider, ...deps };

  fastify.post("/api/v1/ai/chat", async (request, reply) => {
    // Checked before auth work so a disabled feature costs nothing.
    if (!env.FEATURE_AI || !env.AI_ENABLED || !isFeatureEnabledForRequest("FEATURE_AI", request)) {
      return reply.code(503).send(featureUnavailable(request.id));
    }

    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = aiChatInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const family = await requireCurrentFamilyWithPermission(auth, "canContribute");

    const response = await sendMessage({
      userId: auth.userId,
      familyId: family.familyId,
      timeZone: request.timeZone,
      conversationId: parsed.data.conversationId,
      message: parsed.data.message,
      provider: d.provider,
    });

    return reply.send(aiChatResponseSchema.parse(response));
  });

  /** Readable even when the feature is off, so the UI can show a truthful zero. */
  fastify.get("/api/v1/ai/usage", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const family = await requireCurrentFamily(auth);

    const usage = await getUsage({
      userId: auth.userId,
      familyId: family.familyId,
      timeZone: request.timeZone,
    });

    return reply.send(aiUsageResponseSchema.parse(usage));
  });

  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/ai/conversations/:id",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      await deleteConversation({ userId: auth.userId, conversationId: request.params.id });

      return reply.code(204).send();
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/api/v1/ai/messages/:id/report",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const parsed = reportAiMessageInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(invalidInput(parsed.error, request.id));
      }

      await reportMessage({
        userId: auth.userId,
        messageId: request.params.id,
        reason: parsed.data.reason,
      });

      return reply.code(204).send();
    },
  );
}
