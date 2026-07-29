import { z } from "zod";

import { notificationPrefKeySchema } from "./common";

export const pushTokenInputSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android", "web"]),
});
export type PushTokenInput = z.infer<typeof pushTokenInputSchema>;

export const notificationPreferencesSchema = z.object({
  prefs: z.record(notificationPrefKeySchema, z.boolean()),
  quietHoursEnabled: z.boolean(),
  quietStart: z.string(),
  quietEnd: z.string(),
  groupRelatedAlerts: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const updateNotificationPreferencesInputSchema =
  notificationPreferencesSchema.partial();
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesInputSchema
>;
