import { z } from "zod";

import { cursorPageSchema } from "./common";

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  stageLabel: z.string(),
  memberCount: z.number().int().nonnegative(),
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
