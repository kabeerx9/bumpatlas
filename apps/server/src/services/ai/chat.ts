import prisma from "@bumpatlas/db";
import type { AiChatResponse } from "@bumpatlas/contracts/v1";
import type { AiSafetyLabel } from "@bumpatlas/db/types";
import { env } from "@bumpatlas/env/server";

import { getUsage, releaseQuota, reserveQuota } from "@/services/ai/quota";
import { retrieveSnippets, type Snippet } from "@/services/ai/retrieve";
import {
  classifyMessage,
  containsBlockedClaim,
  fixedResponseFor,
  type Classification,
} from "@/services/ai/safety";
import { ServiceError } from "@/services/errors";
import { trackProductEvent } from "@/services/product-event";
import { resolveStageForUser } from "@/services/profile";
import type { StageKey } from "@/services/stage";

/**
 * The provider boundary.
 *
 * One function, injected. Keeping it this narrow means the safety pipeline is fully
 * testable without a network call, and swapping providers touches one file.
 */
export type AiProvider = {
  complete: (input: {
    systemPrompt: string;
    userMessage: string;
    snippets: Snippet[];
  }) => Promise<string>;
};

export const disabledProvider: AiProvider = {
  complete: async () => {
    throw new ServiceError(503, "FEATURE_UNAVAILABLE", "The assistant is not available yet.");
  },
};

/**
 * System prompt lives server-side and is never client-supplied.
 *
 * It says "only from the notes" because the retrieval step is the only thing standing
 * between a parent and a confidently wrong answer about their baby.
 */
function buildSystemPrompt(stageKey: StageKey): string {
  return [
    "You are a calm, plain-spoken assistant inside a pregnancy and early-parenthood journal.",
    "Answer ONLY from the reviewed notes provided. If the notes do not cover it, say you do not have a reliable answer and suggest asking a midwife, health visitor, or GP.",
    "Never give a diagnosis, a medicine, or a dose. Never say something is or is not normal.",
    "Do not guess. Do not invent sources. Keep it to a short paragraph.",
    `The reader's current stage is ${stageKey}.`,
  ].join("\n");
}

const REFUSAL_NO_SOURCE =
  "I do not have a reviewed answer for that one, so I would rather not guess. Your midwife, health visitor, or GP will be able to help — and it is worth asking, not a silly question.";

function labelFor(classification: Classification): AiSafetyLabel {
  if (classification.kind === "critical") return "ESCALATED";
  if (classification.kind === "out_of_scope") return "REFUSED_OUT_OF_SCOPE";
  return "NORMAL";
}

/**
 * The full request pipeline (§ Phase 7).
 *
 * Order is the safety property, not an implementation detail:
 *
 *  1. flag check — off means off, before anything is stored;
 *  2. classify **before** reserving quota, so a person in crisis is never told they have
 *     run out of messages;
 *  3. fixed response for critical categories, without contacting a provider at all;
 *  4. reserve quota;
 *  5. retrieve reviewed sources, and refuse if there are none;
 *  6. call the provider with only snippets and a stage key;
 *  7. post-check the output for blocked claims;
 *  8. store the answer with citations and a safety label;
 *  9. release the reservation if the provider failed.
 */
export async function sendMessage(input: {
  userId: string;
  familyId: string;
  timeZone: string | null;
  conversationId?: string;
  message: string;
  provider: AiProvider;
  /**
   * Injectable so tests can exercise the safety pipeline without turning the feature on
   * globally. Kept in the *service* rather than only the route, so a future route cannot
   * forget the guard. `env` is parsed once at import, which is also why this cannot be a
   * `process.env` read at call time.
   */
  isEnabled?: () => boolean;
}): Promise<AiChatResponse> {
  const enabled = input.isEnabled ?? (() => env.AI_ENABLED && env.FEATURE_AI);

  if (!enabled()) {
    throw new ServiceError(503, "FEATURE_UNAVAILABLE", "The assistant is not available yet.");
  }

  const conversation = await resolveConversation({
    userId: input.userId,
    familyId: input.familyId,
    conversationId: input.conversationId,
  });

  const classification = classifyMessage(input.message);

  // Critical categories bypass the quota entirely. Someone describing self-harm must not
  // meet a paywall or a rate limit.
  if (classification.kind !== "normal") {
    const fixed = fixedResponseFor(classification);

    await storeUserMessage(conversation.id, input.message);
    const stored = await storeAssistantMessage({
      conversationId: conversation.id,
      body: fixed.body,
      citationSlugs: [],
      safetyLabel: labelFor(classification),
    });

    if (classification.kind === "critical") {
      await trackProductEvent("AI_ESCALATED", {
        actorUserId: input.userId,
        familyId: input.familyId,
        // Category is an enum-like string; the message body is never recorded.
        metadata: { critical: true },
      });
    }

    const usage = await getUsage({
      userId: input.userId,
      familyId: input.familyId,
      timeZone: input.timeZone,
    });

    return {
      conversationId: conversation.id,
      message: {
        id: stored.id,
        role: "assistant",
        body: fixed.body,
        citations: [],
        escalate: fixed.escalate,
        createdAt: stored.createdAt.toISOString(),
      },
      usage,
    };
  }

  const usage = await reserveQuota({
    userId: input.userId,
    familyId: input.familyId,
    timeZone: input.timeZone,
  });

  try {
    const { stage } = await resolveStageForUser({
      userId: input.userId,
      familyId: input.familyId,
      timeZone: input.timeZone,
    });

    const snippets = await retrieveSnippets({
      message: input.message,
      stageKey: stage.stageKey,
    });

    // No reviewed source means no answer. This is why the phase cannot be enabled before
    // reviewed content exists — with an empty library, every question refuses.
    if (snippets.length === 0) {
      await storeUserMessage(conversation.id, input.message);
      const stored = await storeAssistantMessage({
        conversationId: conversation.id,
        body: REFUSAL_NO_SOURCE,
        citationSlugs: [],
        safetyLabel: "REFUSED_NO_SOURCE",
      });

      return {
        conversationId: conversation.id,
        message: {
          id: stored.id,
          role: "assistant",
          body: REFUSAL_NO_SOURCE,
          citations: [],
          escalate: null,
          createdAt: stored.createdAt.toISOString(),
        },
        usage,
      };
    }

    /**
     * Only the snippets, the message, and a stage key cross the boundary. Never memories,
     * community posts, photos, exact dates of birth, names, or another family's anything.
     */
    const answer = await input.provider.complete({
      systemPrompt: buildSystemPrompt(stage.stageKey),
      userMessage: input.message,
      snippets,
    });

    const blocked = containsBlockedClaim(answer);
    const body = blocked ? REFUSAL_NO_SOURCE : answer;

    await storeUserMessage(conversation.id, input.message);
    const stored = await storeAssistantMessage({
      conversationId: conversation.id,
      body,
      citationSlugs: blocked ? [] : snippets.map((snippet) => snippet.slug),
      safetyLabel: blocked ? "REFUSED_OUT_OF_SCOPE" : "SOURCED",
    });

    await trackProductEvent("AI_MESSAGE_SENT", {
      actorUserId: input.userId,
      familyId: input.familyId,
      metadata: { sourced: !blocked, snippetCount: snippets.length },
    });

    return {
      conversationId: conversation.id,
      message: {
        id: stored.id,
        role: "assistant",
        body,
        citations: blocked
          ? []
          : snippets.map((snippet) => ({
              id: snippet.slug,
              title: snippet.title,
              source: snippet.reviewerName ?? "BumpAtlas reviewed library",
            })),
        escalate: null,
        createdAt: stored.createdAt.toISOString(),
      },
      usage,
    };
  } catch (error) {
    // The parent never received an answer, so they must not be charged for one.
    await releaseQuota({
      userId: input.userId,
      familyId: input.familyId,
      timeZone: input.timeZone,
    });

    if (error instanceof ServiceError) throw error;

    throw new ServiceError(502, "PROVIDER_ERROR", "The assistant is unavailable right now.");
  }
}

async function resolveConversation(input: {
  userId: string;
  familyId: string;
  conversationId?: string;
}) {
  if (!input.conversationId) {
    return prisma.aiConversation.create({
      data: { userId: input.userId, familyId: input.familyId },
    });
  }

  // Ownership check: a conversation ID is not a capability.
  const existing = await prisma.aiConversation.findFirst({
    where: { id: input.conversationId, userId: input.userId },
  });

  if (!existing) {
    throw new ServiceError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
  }

  return existing;
}

function storeUserMessage(conversationId: string, body: string) {
  return prisma.aiMessage.create({
    data: { conversationId, role: "USER", body, citationSlugs: [] },
  });
}

function storeAssistantMessage(input: {
  conversationId: string;
  body: string;
  citationSlugs: string[];
  safetyLabel: AiSafetyLabel;
}) {
  return prisma.aiMessage.create({
    data: {
      conversationId: input.conversationId,
      role: "ASSISTANT",
      body: input.body,
      citationSlugs: input.citationSlugs,
      safetyLabel: input.safetyLabel,
    },
  });
}

export async function deleteConversation(input: {
  userId: string;
  conversationId: string;
}): Promise<void> {
  const conversation = await prisma.aiConversation.findFirst({
    where: { id: input.conversationId, userId: input.userId },
    select: { id: true },
  });

  if (!conversation) {
    throw new ServiceError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
  }

  // Hard delete: the user asked for it gone, and messages are not moderation evidence
  // unless reported.
  await prisma.aiConversation.delete({ where: { id: conversation.id } });
}

export async function reportMessage(input: {
  userId: string;
  messageId: string;
  reason: string;
}): Promise<void> {
  const message = await prisma.aiMessage.findFirst({
    where: { id: input.messageId, conversation: { userId: input.userId } },
    select: { id: true },
  });

  if (!message) {
    throw new ServiceError(404, "MESSAGE_NOT_FOUND", "Message not found.");
  }

  await prisma.aiMessage.update({
    where: { id: message.id },
    // Reported messages survive the 30-day retention purge as evidence.
    data: { reportedAt: new Date(), reportReason: input.reason },
  });
}
