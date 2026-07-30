import { z } from "zod";

import { cursorPageSchema } from "./common";
import { cursorQuerySchema } from "./pagination";

/**
 * Correction 21: one group model for both seeded stage cohorts and
 * member-created groups, so posts, reports, blocks, moderation, and feed
 * filtering have a single code path.
 *
 * `kind: "user"` groups are always link-only — never listed, searched, or
 * discoverable — which keeps the "no public feed" non-goal intact and the
 * moderation surface bounded. `role` is the caller's own role, null when they
 * are not a member.
 */
export const groupKindSchema = z.enum(["stage", "user"]);
export type GroupKind = z.infer<typeof groupKindSchema>;

export const groupRoleSchema = z.enum(["host", "member"]);
export type GroupRole = z.infer<typeof groupRoleSchema>;

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  stageLabel: z.string(),
  description: z.string().nullable(),
  kind: groupKindSchema,
  role: groupRoleSchema.nullable(),
  memberCount: z.number().int().nonnegative(),
  memberLimit: z.number().int().positive(),
  postingEnabled: z.boolean(),
  archived: z.boolean(),
  joined: z.boolean(),
});
export type Group = z.infer<typeof groupSchema>;

export const listGroupsResponseSchema = z.object({
  items: z.array(groupSchema),
});
export type ListGroupsResponse = z.infer<typeof listGroupsResponseSchema>;

export const groupPostSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  body: z.string(),
  reactionCount: z.number().int().nonnegative(),
  reactedByMe: z.boolean().optional(),
  commentCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type GroupPost = z.infer<typeof groupPostSchema>;

export const listGroupPostsResponseSchema = z
  .object({
    items: z.array(groupPostSchema),
  })
  .merge(cursorPageSchema);
export type ListGroupPostsResponse = z.infer<typeof listGroupPostsResponseSchema>;

export const createGroupPostInputSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type CreateGroupPostInput = z.infer<typeof createGroupPostInputSchema>;

export const createCommentInputSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

export const commentSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export type Comment = z.infer<typeof commentSchema>;

/**
 * Correction 2: the feed contract alone cannot load a thread, so the released
 * post-detail screen has no reliable source for comments. One response carries
 * the post plus the first page of comments.
 */
export const postDetailSchema = z.object({
  post: groupPostSchema,
  comments: z
    .object({
      items: z.array(commentSchema),
    })
    .merge(cursorPageSchema),
});
export type PostDetail = z.infer<typeof postDetailSchema>;

export const listCommentsQuerySchema = cursorQuerySchema;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;

/**
 * Correction 5: reaction semantics are `PUT` (add the single MVP heart) and
 * `DELETE` (remove it), both 204 with no body. The shipped native client calls
 * `POST /api/v1/posts/:id/reactions`, which stays registered as a toggle alias
 * until native migrates — shipping the new pair alone would break the released
 * Connect screen.
 */
export const REACTION_EMOJI = "❤️" as const;

export const reportInputSchema = z.object({
  targetType: z.enum(["post", "comment", "user"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
  details: z.string().trim().max(2000).optional(),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

export const blockInputSchema = z.object({
  userId: z.string().min(1),
});
export type BlockInput = z.infer<typeof blockInputSchema>;

/** Correction 4: the UI had no way to list or undo blocks. */
export const blockedUserSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  blockedAt: z.string(),
});
export type BlockedUser = z.infer<typeof blockedUserSchema>;

export const listBlocksResponseSchema = z.object({
  items: z.array(blockedUserSchema),
});
export type ListBlocksResponse = z.infer<typeof listBlocksResponseSchema>;

/**
 * Correction 14: quotas, account-age link permission, and posting availability
 * come from the server. The client must never compute its own limits — they are
 * env-configurable and entitlement-dependent.
 */
export const communityUsageResponseSchema = z.object({
  postsUsedToday: z.number().int().nonnegative(),
  postsPerDay: z.number().int().positive(),
  commentsUsedToday: z.number().int().nonnegative(),
  commentsPerDay: z.number().int().positive(),
  postingEnabled: z.boolean(),
  /** False until the account is old enough to share links (anti-spam gate). */
  canPostLinks: z.boolean(),
  accountAgeDays: z.number().int().nonnegative(),
  rulesAccepted: z.boolean(),
  groupsCreated: z.number().int().nonnegative(),
  groupsCreatedLimit: z.number().int().nonnegative(),
  groupsJoined: z.number().int().nonnegative(),
  groupsJoinedLimit: z.number().int().nonnegative(),
});
export type CommunityUsageResponse = z.infer<typeof communityUsageResponseSchema>;

/* ------------------------------------------------------------------ *
 * Correction 22: member-created groups (FEATURE_USER_GROUPS, Phase 8b)
 * ------------------------------------------------------------------ */

export const createGroupInputSchema = z.object({
  title: z.string().trim().min(3).max(60),
  description: z.string().trim().max(300).optional(),
});
export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;

export const updateGroupInputSchema = z
  .object({
    title: z.string().trim().min(3).max(60).optional(),
    description: z.string().trim().max(300).optional(),
    postingEnabled: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.postingEnabled !== undefined,
    { message: "At least one field must be provided" },
  );
export type UpdateGroupInput = z.infer<typeof updateGroupInputSchema>;

/** Display name, role, and join date only — never emails. */
export const groupMemberSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  role: groupRoleSchema,
  joinedAt: z.string(),
});
export type GroupMember = z.infer<typeof groupMemberSchema>;

export const listGroupMembersResponseSchema = z.object({
  items: z.array(groupMemberSchema),
});
export type ListGroupMembersResponse = z.infer<typeof listGroupMembersResponseSchema>;

/**
 * Unlike a family invite, a group invite link is reusable up to `maxUses` so a
 * host can drop one link into a group chat. Still hashed at rest, expiring,
 * revocable, and rate-limited.
 */
export const createGroupInviteInputSchema = z.object({
  maxUses: z.number().int().positive().max(100).optional(),
  expiresInDays: z.number().int().positive().max(30).optional(),
});
export type CreateGroupInviteInput = z.infer<typeof createGroupInviteInputSchema>;

/** `token` is plaintext and returned exactly once, at creation. */
export const createGroupInviteResponseSchema = z.object({
  token: z.string(),
  inviteUrl: z.string().url(),
  expiresAt: z.string(),
  maxUses: z.number().int().positive(),
});
export type CreateGroupInviteResponse = z.infer<typeof createGroupInviteResponseSchema>;

/** Listing invites never returns tokens — only metadata. */
export const groupInviteSchema = z.object({
  id: z.string(),
  maxUses: z.number().int().positive(),
  useCount: z.number().int().nonnegative(),
  expiresAt: z.string(),
  createdAt: z.string(),
});
export type GroupInvite = z.infer<typeof groupInviteSchema>;

export const listGroupInvitesResponseSchema = z.object({
  items: z.array(groupInviteSchema),
});
export type ListGroupInvitesResponse = z.infer<typeof listGroupInvitesResponseSchema>;

/** No post content and no member list: a link holder is not yet a member. */
export const groupInvitePreviewSchema = z.object({
  groupTitle: z.string(),
  hostDisplayName: z.string(),
  memberCount: z.number().int().nonnegative(),
  expiresAt: z.string(),
});
export type GroupInvitePreview = z.infer<typeof groupInvitePreviewSchema>;

/**
 * Correction 24: host powers are scoped strictly to the host's own group. This
 * is intentionally not the admin moderation contract — a host never sees reports,
 * reporter identity, or another group, and cannot undo an admin's hide.
 */
export const hostActionInputSchema = z.object({
  action: z.enum([
    "hide_post",
    "unhide_own_hide",
    "disable_posting",
    "enable_posting",
  ]),
  targetId: z.string().min(1).optional(),
  note: z.string().trim().max(1000).optional(),
});
export type HostActionInput = z.infer<typeof hostActionInputSchema>;
