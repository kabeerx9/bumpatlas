import {
  notificationPreferencesSchema,
  pushTokenInputSchema,
  updateNotificationPreferencesInputSchema,
  type PushTokenInput,
  type UpdateNotificationPreferencesInput,
} from "@bumpatlas/contracts";

import { apiClient } from "./client";

export function registerPushToken(input: PushTokenInput) {
  const body = pushTokenInputSchema.parse(input);
  return apiClient.requestVoid("/api/v1/devices/push-token", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getNotificationPreferences() {
  return apiClient.requestJson(
    "/api/v1/notification-preferences",
    notificationPreferencesSchema,
  );
}

export function updateNotificationPreferences(input: UpdateNotificationPreferencesInput) {
  const body = updateNotificationPreferencesInputSchema.parse(input);
  return apiClient.requestJson(
    "/api/v1/notification-preferences",
    notificationPreferencesSchema,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}
