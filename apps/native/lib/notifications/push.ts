import Constants from "expo-constants";
import { Platform } from "react-native";

import { registerPushToken } from "@/lib/api/notifications";

export type PushPermissionStatus = "granted" | "denied" | "undetermined";

type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null | undefined;
let handlerConfigured = false;

function getNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    // Lazy load — top-level import throws when ExpoPushTokenManager is missing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require("expo-notifications") as NotificationsModule;
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

function ensureHandler() {
  if (handlerConfigured) return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  } catch {
    // Native notifications unavailable in this binary.
  }
}

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  ensureHandler();
  const Notifications = getNotifications();
  if (!Notifications) return "undetermined";
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return "granted";
    if (settings.canAskAgain === false) return "denied";
    return settings.status === "undetermined" ? "undetermined" : "denied";
  } catch {
    return "undetermined";
  }
}

export async function requestPushPermissions(): Promise<PushPermissionStatus> {
  ensureHandler();
  const Notifications = getNotifications();
  if (!Notifications) return "denied";

  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return "granted";

    const requested = await Notifications.requestPermissionsAsync();
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return requested.granted ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export async function getExpoPushToken(): Promise<string | null> {
  ensureHandler();
  const Notifications = getNotifications();
  if (!Notifications) return null;

  const projectId =
    Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
}

/**
 * Request OS permission and register the token with the API.
 * Safe no-op when native notifications are unavailable.
 */
export async function enablePushAndRegister(): Promise<{
  permission: PushPermissionStatus;
  token: string | null;
  registered: boolean;
}> {
  const permission = await requestPushPermissions();
  if (permission !== "granted") {
    return { permission, token: null, registered: false };
  }

  const token = await getExpoPushToken();
  if (!token) {
    return { permission, token, registered: false };
  }

  try {
    await registerPushToken({
      token,
      platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
    });
    return { permission, token, registered: true };
  } catch {
    return { permission, token, registered: false };
  }
}
