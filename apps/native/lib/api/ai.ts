import {
  aiChatInputSchema,
  aiChatResponseSchema,
  aiUsageResponseSchema,
  reportAiMessageInputSchema,
  type AiChatInput,
  type ReportAiMessageInput,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function sendAiChat(input: AiChatInput) {
  const body = aiChatInputSchema.parse(input);
  return apiClient.requestJson("/api/v1/ai/chat", aiChatResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getAiUsage() {
  return apiClient.requestJson("/api/v1/ai/usage", aiUsageResponseSchema);
}

export function deleteAiConversation(id: string) {
  return apiClient.requestVoid(`/api/v1/ai/conversations/${id}`, { method: "DELETE" });
}

export function reportAiMessage(messageId: string, input: ReportAiMessageInput) {
  const body = reportAiMessageInputSchema.parse(input);
  return apiClient.requestVoid(`/api/v1/ai/messages/${messageId}/report`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
