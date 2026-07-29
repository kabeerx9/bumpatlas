import { z } from "zod";

export const aiCitationSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  url: z.string().url().optional(),
});
export type AiCitation = z.infer<typeof aiCitationSchema>;

export const aiChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  body: z.string(),
  citations: z.array(aiCitationSchema).optional(),
  escalate: z
    .object({
      title: z.string(),
      body: z.string(),
    })
    .nullable()
    .optional(),
  createdAt: z.string(),
});
export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;

export const aiChatInputSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().trim().min(1).max(4000),
});
export type AiChatInput = z.infer<typeof aiChatInputSchema>;

export const aiChatResponseSchema = z.object({
  conversationId: z.string(),
  message: aiChatMessageSchema,
  usage: z.object({
    dailyUsed: z.number().int().nonnegative(),
    dailyLimit: z.number().int().positive(),
    hourlyUsed: z.number().int().nonnegative(),
    hourlyLimit: z.number().int().positive(),
  }),
});
export type AiChatResponse = z.infer<typeof aiChatResponseSchema>;

export const aiUsageResponseSchema = z.object({
  dailyUsed: z.number().int().nonnegative(),
  dailyLimit: z.number().int().positive(),
  hourlyUsed: z.number().int().nonnegative(),
  hourlyLimit: z.number().int().positive(),
});
export type AiUsageResponse = z.infer<typeof aiUsageResponseSchema>;

export const reportAiMessageInputSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type ReportAiMessageInput = z.infer<typeof reportAiMessageInputSchema>;
