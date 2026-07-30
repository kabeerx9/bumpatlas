import { z } from "zod";

import { stageModeSchema } from "./common";
import { childSchema } from "./profiles";

export const familyMemberRoleSchema = z.enum([
  "OWNER",
  "PARENT",
  "CONTRIBUTOR",
  "VIEWER",
]);
export type FamilyMemberRole = z.infer<typeof familyMemberRoleSchema>;

export const familyMemberSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  role: familyMemberRoleSchema,
  status: z.enum(["active", "invited", "removed"]),
});
export type FamilyMember = z.infer<typeof familyMemberSchema>;

/**
 * Correction 31: `childDisplayName` stays and is populated with the caller's
 * active child so shipped screens keep working; `children` is what new UI reads.
 */
export const familySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  stageMode: stageModeSchema,
  childDisplayName: z.string().nullable(),
  children: z.array(childSchema),
  dueDate: z.string().nullable(),
  members: z.array(familyMemberSchema),
});
export type FamilySummary = z.infer<typeof familySummarySchema>;

export const createFamilyInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type CreateFamilyInput = z.infer<typeof createFamilyInputSchema>;

export const createInviteInputSchema = z.object({
  role: z.enum(["PARENT", "CONTRIBUTOR", "VIEWER"]),
  email: z.string().email().optional(),
});
export type CreateInviteInput = z.infer<typeof createInviteInputSchema>;

export const createInviteResponseSchema = z.object({
  token: z.string(),
  inviteUrl: z.string().url(),
  expiresAt: z.string(),
});
export type CreateInviteResponse = z.infer<typeof createInviteResponseSchema>;

export const acceptInviteInputSchema = z.object({
  token: z.string().min(1),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteInputSchema>;

/**
 * Correction 3. Deliberately minimal: an invite link is readable by anyone who
 * has it, so the preview must not leak member emails, child names, or birth
 * dates. Household and inviter display names plus the offered role are enough
 * for the accept screen to be honest about what is being joined.
 */
export const invitePreviewSchema = z.object({
  familyName: z.string(),
  inviterDisplayName: z.string(),
  role: familyMemberRoleSchema,
  expiresAt: z.string(),
});
export type InvitePreview = z.infer<typeof invitePreviewSchema>;

export const updateMemberInputSchema = z.object({
  role: familyMemberRoleSchema.optional(),
});
export type UpdateMemberInput = z.infer<typeof updateMemberInputSchema>;

/**
 * Correction 23. Leaving is destructive from the leaver's point of view — they
 * lose read access to a household whose memories they may have authored — so it
 * takes an explicit confirmation, matching `deleteAccountInputSchema`.
 * Responds 204.
 */
export const leaveFamilyInputSchema = z.object({
  confirmation: z.literal("LEAVE", {
    error: "Type LEAVE to confirm leaving this household",
  }),
});
export type LeaveFamilyInput = z.infer<typeof leaveFamilyInputSchema>;

/**
 * Corrections 31 and 32: `activeChildId` tells the client which child the stage
 * describes, so it never has to guess with siblings present.
 */
export const stageResponseSchema = z.object({
  stageMode: stageModeSchema,
  childDisplayName: z.string().nullable(),
  activeChildId: z.string().nullable(),
  children: z.array(childSchema),
  dueDate: z.string().nullable(),
  gestationalWeek: z.number().int().nullable().optional(),
});
export type StageResponse = z.infer<typeof stageResponseSchema>;
