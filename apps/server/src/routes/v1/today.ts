import prisma from "@bumpatlas/db";
import {
  completeChallengeInputSchema,
  listBadgesResponseSchema,
  todayResponseSchema,
  type TodayResponse,
} from "@bumpatlas/contracts/v1";
import type { FastifyInstance } from "fastify";

import { requireAuth, type AuthContext } from "@/middleware/require-auth";
import {
  requireCurrentFamily,
  requireCurrentFamilyWithPermission,
  type FamilyContext,
} from "@/middleware/require-family-member";
import {
  awardBadge,
  badgesEarnedByCapture,
  badgesEarnedByWellness,
  listBadges,
} from "@/services/badge";
import { serializeContentItem, serializeWellnessAction } from "@/services/content";
import { getEntitlements } from "@/services/entitlement";
import { invalidInput } from "@/services/errors";
import { countMonthlyUploads } from "@/services/media";
import { trackProductEvent } from "@/services/product-event";
import {
  completeChallenge,
  getLoopCompletion,
  getOrCreateDailyPlan,
  getWeekProgress,
  inferChallengeKind,
} from "@/services/today";

export type TodayRouteDeps = {
  requireAuth: typeof requireAuth;
};

/**
 * Builds the Today payload from database records only.
 *
 * No counter is taken from client state: the shipped screens used to hold streaks and
 * quota counts locally, which drift the moment a second device or a failed request is
 * involved.
 */
async function buildTodayResponse(input: {
  auth: AuthContext;
  family: FamilyContext;
  timeZone: string | null;
}): Promise<TodayResponse> {
  const plan = await getOrCreateDailyPlan({
    userId: input.auth.userId,
    familyId: input.family.familyId,
    timeZone: input.timeZone,
  });

  const [prompt, action, learn, loopCompletion, weekProgress, entitlement, mediaUsed, aiUsed] =
    await Promise.all([
      plan.memoryPromptId
        ? prisma.contentItem.findUnique({ where: { id: plan.memoryPromptId } })
        : null,
      plan.wellnessActionId
        ? prisma.wellnessAction.findUnique({ where: { id: plan.wellnessActionId } })
        : null,
      plan.learnContentId
        ? prisma.contentItem.findUnique({ where: { id: plan.learnContentId } })
        : null,
      getLoopCompletion({ userId: input.auth.userId, planDate: plan.planDate }),
      getWeekProgress({ userId: input.auth.userId, timeZone: input.timeZone }),
      getEntitlements(input.family.familyId),
      countMonthlyUploads(input.family.familyId),
      // AI usage lands in Phase 7; until then the counter is honestly zero.
      Promise.resolve(0),
    ]);

  const promptText = prompt?.title ?? "What do you want to remember about today?";

  return {
    date: plan.planDate.toISOString().slice(0, 10),
    prompt: promptText,
    cards: {
      capture: { promptId: prompt?.id ?? "capture", prompt: promptText },
      // Null until reviewed content exists — the contract allows it, and an unreviewed
      // wellness action must not be shown rather than substituted with mock data.
      care: action ? serializeWellnessAction(action) : null,
      learn: learn ? serializeContentItem(learn, false) : null,
      connect: {
        // Community arrives in Phase 8; until then the tile nudges the partner invite.
        mode: "invite",
        groupId: null,
        groupName: null,
        prompt: "Invite your partner so you can both add to the story.",
        replyCount: 0,
      },
    },
    loopCompletion,
    weekProgress,
    mediaUploadsUsed: mediaUsed,
    mediaUploadsLimit: entitlement.mediaUploadsPerMonth,
    aiMessagesUsed: aiUsed,
    aiDailyLimit: entitlement.aiDailyLimit,
    isPremium: entitlement.isPremium,
  };
}

export async function registerTodayRoutes(
  fastify: FastifyInstance,
  deps: Partial<TodayRouteDeps> = {},
) {
  const d = { requireAuth, ...deps };

  fastify.get("/api/v1/today", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const family = await requireCurrentFamily(auth);

    const response = await buildTodayResponse({
      auth,
      family,
      timeZone: request.timeZone,
    });

    await trackProductEvent("TODAY_VIEWED", {
      actorUserId: auth.userId,
      familyId: family.familyId,
      logger: request.log,
    });

    return reply.send(todayResponseSchema.parse(response));
  });

  fastify.post("/api/v1/challenges/complete", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = completeChallengeInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const family = await requireCurrentFamilyWithPermission(auth, "canContribute");

    const plan = await getOrCreateDailyPlan({
      userId: auth.userId,
      familyId: family.familyId,
      timeZone: request.timeZone,
    });

    // Inferred from the plan, never trusted from the client: only STORY and WELLNESS
    // count toward weekly progress.
    const kind = inferChallengeKind(plan, parsed.data.challengeId);

    const { firstTime } = await completeChallenge({
      userId: auth.userId,
      familyId: family.familyId,
      planDate: plan.planDate,
      kind,
      targetId: parsed.data.challengeId,
    });

    // Badges only on the first completion, and each award is itself idempotent.
    if (firstTime) {
      if (kind === "STORY") {
        const [totalMemories, progress] = await Promise.all([
          prisma.memoryEntry.count({ where: { familyId: family.familyId, deletedAt: null } }),
          getWeekProgress({ userId: auth.userId, timeZone: request.timeZone }),
        ]);

        for (const badgeKey of badgesEarnedByCapture({
          totalMemories,
          storyDaysThisWeek: progress.storyDays,
        })) {
          await awardBadge(auth.userId, badgeKey);
        }
      }

      if (kind === "WELLNESS") {
        for (const badgeKey of badgesEarnedByWellness()) {
          await awardBadge(auth.userId, badgeKey);
        }

        await trackProductEvent("WELLNESS_COMPLETED", {
          actorUserId: auth.userId,
          familyId: family.familyId,
          logger: request.log,
        });
      }
    }

    // Refreshed Today so the client never has to guess what changed.
    const response = await buildTodayResponse({ auth, family, timeZone: request.timeZone });

    return reply.send(todayResponseSchema.parse(response));
  });

  fastify.get("/api/v1/badges", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    await requireCurrentFamily(auth);

    return reply.send(
      listBadgesResponseSchema.parse({ items: await listBadges(auth.userId) }),
    );
  });
}
