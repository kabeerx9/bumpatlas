import { z } from "zod";

import { stageModeSchema } from "./common";

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

export const familySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  stageMode: stageModeSchema,
  childDisplayName: z.string().nullable(),
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

export const updateMemberInputSchema = z.object({
  role: familyMemberRoleSchema.optional(),
});
export type UpdateMemberInput = z.infer<typeof updateMemberInputSchema>;

export const stageResponseSchema = z.object({
  stageMode: stageModeSchema,
  childDisplayName: z.string().nullable(),
  dueDate: z.string().nullable(),
  gestationalWeek: z.number().int().nullable().optional(),
});
export type StageResponse = z.infer<typeof stageResponseSchema>;
