import {
  blockInputSchema,
  commentSchema,
  communityUsageResponseSchema,
  createCommentInputSchema,
  createGroupInputSchema,
  createGroupInviteInputSchema,
  createGroupInviteResponseSchema,
  createGroupPostInputSchema,
  cursorQuerySchema,
  groupInvitePreviewSchema,
  groupPostSchema,
  groupSchema,
  hostActionInputSchema,
  listBlocksResponseSchema,
  listGroupInvitesResponseSchema,
  listGroupMembersResponseSchema,
  listGroupPostsResponseSchema,
  listGroupsResponseSchema,
  postDetailSchema,
  reportInputSchema,
  updateGroupInputSchema,
} from "@bumpatlas/contracts/v1";
import prisma from "@bumpatlas/db";
import { env } from "@bumpatlas/env/server";
import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/middleware/require-auth";
import { requireCurrentFamily } from "@/middleware/require-family-member";
import {
  acceptGroupInvite,
  archiveUserGroup,
  assertFeatureEnabled,
  createGroupInvite,
  createUserGroup,
  joinStageGroup,
  leaveGroup,
  listGroupInvites,
  listGroupMembers,
  listVisibleGroups,
  previewGroupInvite,
  removeGroupMember,
  revokeGroupInvite,
  serializeGroup,
  updateUserGroup,
} from "@/services/community/groups";
import {
  applyHostAction,
  blockUser,
  createReport,
  listBlocks,
  unblockUser,
} from "@/services/community/moderation";
import {
  createComment,
  createPost,
  getPostDetail,
  listGroupPosts,
  removeReaction,
  setReaction,
  toggleReaction,
} from "@/services/community/posts";
import {
  accountAgeDays,
  canPostLinks,
  isWithinModerationCoverage,
} from "@/services/community/safety";
import { getEntitlements } from "@/services/entitlement";
import { invalidInput } from "@/services/errors";

export type CommunityRouteDeps = {
  requireAuth: typeof requireAuth;
};

export async function registerCommunityRoutes(
  fastify: FastifyInstance,
  deps: Partial<CommunityRouteDeps> = {},
) {
  const d = { requireAuth, ...deps };

  fastify.get("/api/v1/groups", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const groups = await listVisibleGroups(auth.userId);

    return reply.send(listGroupsResponseSchema.parse({ items: groups }));
  });

  fastify.post<{ Params: { id: string } }>(
    "/api/v1/groups/:id/join",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      await joinStageGroup({ userId: auth.userId, groupId: request.params.id });

      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/api/v1/groups/:id/posts",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const parsedQuery = cursorQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.code(400).send(invalidInput(parsedQuery.error, request.id));
      }

      const result = await listGroupPosts({
        userId: auth.userId,
        groupId: request.params.id,
        cursor: parsedQuery.data.cursor,
        limit: parsedQuery.data.limit,
      });

      return reply.send(
        listGroupPostsResponseSchema.parse({
          items: result.items,
          nextCursor: result.nextCursor,
        }),
      );
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/api/v1/groups/:id/posts",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const parsed = createGroupPostInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(invalidInput(parsed.error, request.id));
      }

      const post = await createPost({
        userId: auth.userId,
        groupId: request.params.id,
        body: parsed.data.body,
      });

      return reply.code(201).send(groupPostSchema.parse(post));
    },
  );

  fastify.get<{ Params: { id: string } }>("/api/v1/posts/:id", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const detail = await getPostDetail({
      userId: auth.userId,
      postId: request.params.id,
      limit: 20,
    });

    return reply.send(postDetailSchema.parse(detail));
  });

  fastify.post<{ Params: { id: string } }>(
    "/api/v1/posts/:id/comments",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const parsed = createCommentInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(invalidInput(parsed.error, request.id));
      }

      const comment = await createComment({
        userId: auth.userId,
        postId: request.params.id,
        body: parsed.data.body,
      });

      return reply.code(201).send(commentSchema.parse(comment));
    },
  );

  fastify.put<{ Params: { id: string } }>(
    "/api/v1/posts/:id/reaction",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      await setReaction({ userId: auth.userId, postId: request.params.id });

      return reply.code(204).send();
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/posts/:id/reaction",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      await removeReaction({ userId: auth.userId, postId: request.params.id });

      return reply.code(204).send();
    },
  );

  /**
   * Legacy alias the shipped Connect screen calls (correction 5). Toggles.
   * Remove only after native migrates to PUT/DELETE.
   */
  fastify.post<{ Params: { id: string } }>(
    "/api/v1/posts/:id/reactions",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      await toggleReaction({ userId: auth.userId, postId: request.params.id });

      return reply.code(204).send();
    },
  );

  fastify.post("/api/v1/reports", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = reportInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    await createReport({
      reporterUserId: auth.userId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details,
    });

    return reply.code(204).send();
  });

  fastify.post("/api/v1/blocks", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = blockInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    await blockUser({ blockerUserId: auth.userId, blockedUserId: parsed.data.userId });

    return reply.code(204).send();
  });

  fastify.get("/api/v1/blocks", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    return reply.send(listBlocksResponseSchema.parse({ items: await listBlocks(auth.userId) }));
  });

  fastify.delete<{ Params: { userId: string } }>(
    "/api/v1/blocks/:userId",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      await unblockUser({ blockerUserId: auth.userId, blockedUserId: request.params.userId });

      return reply.code(204).send();
    },
  );

  /** Correction 14: quotas, link permission, and posting availability come from the server. */
  fastify.get("/api/v1/community/usage", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    assertFeatureEnabled();

    const family = await requireCurrentFamily(auth);
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);

    const [user, entitlement, postsToday, commentsToday, rulesAccepted, created, joined] =
      await Promise.all([
        prisma.user.findUniqueOrThrow({
          where: { id: auth.userId },
          select: { createdAt: true },
        }),
        getEntitlements(family.familyId),
        prisma.communityPost.count({
          where: { authorUserId: auth.userId, createdAt: { gte: dayStart } },
        }),
        prisma.communityComment.count({
          where: { authorUserId: auth.userId, createdAt: { gte: dayStart } },
        }),
        prisma.consentRecord.count({ where: { userId: auth.userId, policyKey: "COMMUNITY" } }),
        prisma.communityGroupMember.count({
          where: {
            userId: auth.userId,
            role: "HOST",
            status: "ACTIVE",
            group: { kind: "USER", isActive: true },
          },
        }),
        prisma.communityGroupMember.count({
          where: { userId: auth.userId, status: "ACTIVE", group: { kind: "USER" } },
        }),
      ]);

    return reply.send(
      communityUsageResponseSchema.parse({
        postsUsedToday: postsToday,
        postsPerDay: env.COMMUNITY_POSTS_PER_DAY,
        commentsUsedToday: commentsToday,
        commentsPerDay: env.COMMUNITY_COMMENTS_PER_DAY,
        // Reflects the overnight pause, so the UI can explain rather than just fail.
        postingEnabled: env.COMMUNITY_POSTING_ENABLED && isWithinModerationCoverage(),
        canPostLinks: canPostLinks(user.createdAt),
        accountAgeDays: accountAgeDays(user.createdAt),
        rulesAccepted: rulesAccepted > 0,
        groupsCreated: created,
        groupsCreatedLimit: entitlement.userGroupsCreatedLimit,
        groupsJoined: joined,
        groupsJoinedLimit: env.USER_GROUP_JOINED_LIMIT,
      }),
    );
  });

  /* -------------------------------------------------------------- *
   * Phase 8b — member-created groups, behind FEATURE_USER_GROUPS
   * -------------------------------------------------------------- */

  fastify.post("/api/v1/groups", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = createGroupInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const group = await createUserGroup({
      userId: auth.userId,
      title: parsed.data.title,
      description: parsed.data.description,
    });

    return reply.code(201).send(
      groupSchema.parse(
        serializeGroup({
          group,
          membership: { role: "HOST", status: "ACTIVE" } as never,
          memberCount: 1,
        }),
      ),
    );
  });

  fastify.patch<{ Params: { id: string } }>("/api/v1/groups/:id", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = updateGroupInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const group = await updateUserGroup({
      userId: auth.userId,
      groupId: request.params.id,
      title: parsed.data.title,
      description: parsed.data.description,
      postingEnabled: parsed.data.postingEnabled,
    });

    const memberCount = await prisma.communityGroupMember.count({
      where: { groupId: group.id, status: "ACTIVE" },
    });

    return reply.send(
      groupSchema.parse(
        serializeGroup({
          group,
          membership: { role: "HOST", status: "ACTIVE" } as never,
          memberCount,
        }),
      ),
    );
  });

  fastify.post<{ Params: { id: string } }>(
    "/api/v1/groups/:id/archive",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      await archiveUserGroup({ userId: auth.userId, groupId: request.params.id });

      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/api/v1/groups/:id/members",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const members = await listGroupMembers({
        userId: auth.userId,
        groupId: request.params.id,
      });

      return reply.send(listGroupMembersResponseSchema.parse({ items: members }));
    },
  );

  fastify.delete<{ Params: { id: string; userId: string }; Querystring: { ban?: string } }>(
    "/api/v1/groups/:id/members/:userId",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      await removeGroupMember({
        hostUserId: auth.userId,
        groupId: request.params.id,
        targetUserId: request.params.userId,
        ban: request.query.ban === "true",
      });

      return reply.code(204).send();
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/api/v1/groups/:id/leave",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      await leaveGroup({ userId: auth.userId, groupId: request.params.id });

      return reply.code(204).send();
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/api/v1/groups/:id/invites",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const parsed = createGroupInviteInputSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send(invalidInput(parsed.error, request.id));
      }

      const invite = await createGroupInvite({
        userId: auth.userId,
        groupId: request.params.id,
        maxUses: parsed.data.maxUses,
        expiresInDays: parsed.data.expiresInDays,
      });

      return reply.code(201).send(createGroupInviteResponseSchema.parse(invite));
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/api/v1/groups/:id/invites",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const invites = await listGroupInvites({
        userId: auth.userId,
        groupId: request.params.id,
      });

      return reply.send(listGroupInvitesResponseSchema.parse({ items: invites }));
    },
  );

  fastify.delete<{ Params: { id: string; inviteId: string } }>(
    "/api/v1/groups/:id/invites/:inviteId",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      await revokeGroupInvite({
        userId: auth.userId,
        groupId: request.params.id,
        inviteId: request.params.inviteId,
      });

      return reply.code(204).send();
    },
  );

  fastify.get<{ Params: { token: string } }>(
    "/api/v1/group-invites/:token/preview",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const preview = await previewGroupInvite(request.params.token);

      return reply.send(groupInvitePreviewSchema.parse(preview));
    },
  );

  fastify.post<{ Params: { token: string } }>(
    "/api/v1/group-invites/:token/accept",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const group = await acceptGroupInvite({ userId: auth.userId, token: request.params.token });

      const memberCount = await prisma.communityGroupMember.count({
        where: { groupId: group.id, status: "ACTIVE" },
      });

      return reply.send(
        groupSchema.parse(
          serializeGroup({
            group,
            membership: { role: "MEMBER", status: "ACTIVE" } as never,
            memberCount,
          }),
        ),
      );
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/api/v1/groups/:id/host-actions",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const parsed = hostActionInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(invalidInput(parsed.error, request.id));
      }

      await applyHostAction({
        hostUserId: auth.userId,
        groupId: request.params.id,
        action: parsed.data.action,
        targetId: parsed.data.targetId,
        note: parsed.data.note,
      });

      return reply.code(204).send();
    },
  );
}
