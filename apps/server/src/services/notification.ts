import prisma from "@bumpatlas/db";
import type {
  NotificationPreferences,
  PushTokenInput,
  UpdateNotificationPreferencesInput,
} from "@bumpatlas/contracts/v1";
import type { DevicePlatform, NotificationPreference } from "@bumpatlas/db/types";

import { ServiceError } from "@/services/errors";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function serialize(row: NotificationPreference): NotificationPreferences {
  return {
    prefs: {
      dailyPrompt: row.dailyPrompt,
      wellnessReminder: row.wellnessReminder,
      partnerActivity: row.partnerActivity,
      weeklyRecap: row.weeklyRecap,
      communityReply: row.communityReply,
      subscription: row.subscription,
    },
    quietHoursEnabled: row.quietHoursEnabled,
    quietStart: row.quietStart,
    quietEnd: row.quietEnd,
    groupRelatedAlerts: row.groupRelatedAlerts,
  };
}

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  // Created on read if missing so a user who onboarded before this table existed still
  // gets defaults rather than a 500.
  const row = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  return serialize(row);
}

/**
 * Merges the patch.
 *
 * Explicitly a merge, not a replace: the shipped settings screen sends only the toggle
 * that changed, and treating an absent field as `false` would silently switch off every
 * other notification the user had enabled.
 */
export async function updateNotificationPreferences(input: {
  userId: string;
  patch: UpdateNotificationPreferencesInput;
}): Promise<NotificationPreferences> {
  const { prefs, quietHoursEnabled, quietStart, quietEnd, groupRelatedAlerts } = input.patch;

  for (const [field, value] of [
    ["quietStart", quietStart],
    ["quietEnd", quietEnd],
  ] as const) {
    if (value !== undefined && !TIME_PATTERN.test(value)) {
      throw new ServiceError(400, "INVALID_INPUT", `${field} must be HH:mm.`);
    }
  }

  const row = await prisma.notificationPreference.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      ...(prefs ?? {}),
      ...(quietHoursEnabled === undefined ? {} : { quietHoursEnabled }),
      ...(quietStart === undefined ? {} : { quietStart }),
      ...(quietEnd === undefined ? {} : { quietEnd }),
      ...(groupRelatedAlerts === undefined ? {} : { groupRelatedAlerts }),
    },
    update: {
      // Only the keys present in the patch are written.
      ...(prefs ?? {}),
      ...(quietHoursEnabled === undefined ? {} : { quietHoursEnabled }),
      ...(quietStart === undefined ? {} : { quietStart }),
      ...(quietEnd === undefined ? {} : { quietEnd }),
      ...(groupRelatedAlerts === undefined ? {} : { groupRelatedAlerts }),
    },
  });

  return serialize(row);
}

const PLATFORM: Record<PushTokenInput["platform"], DevicePlatform> = {
  ios: "IOS",
  android: "ANDROID",
  web: "WEB",
};

/**
 * Registers a device token.
 *
 * Upserted on the token, not on `(userId, token)`: when someone signs into a second
 * account on the same phone, the token must *move*. Keyed per user, the previous account
 * would keep receiving that device's notifications — someone else's household activity on
 * a stranger's lock screen.
 */
export async function registerPushToken(input: {
  userId: string;
  token: string;
  platform: PushTokenInput["platform"];
}): Promise<void> {
  await prisma.pushDevice.upsert({
    where: { token: input.token },
    create: {
      userId: input.userId,
      token: input.token,
      platform: PLATFORM[input.platform],
    },
    update: {
      userId: input.userId,
      platform: PLATFORM[input.platform],
      // Re-registering revives a token the provider previously rejected.
      disabledAt: null,
    },
  });
}

/** Called after a provider rejection. Soft so a transient failure is recoverable. */
export async function disablePushToken(token: string): Promise<void> {
  await prisma.pushDevice.updateMany({
    where: { token, disabledAt: null },
    data: { disabledAt: new Date() },
  });
}

/**
 * Devices eligible for a given notification kind.
 *
 * Quiet hours are evaluated by the sender, not here, because they depend on the user's
 * local clock at send time.
 */
export async function listDeliverableDevices(input: {
  userId: string;
  kind: keyof NotificationPreferences["prefs"];
}): Promise<{ token: string; platform: DevicePlatform }[]> {
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId: input.userId },
  });

  if (preference && preference[input.kind] === false) return [];

  return prisma.pushDevice.findMany({
    where: { userId: input.userId, disabledAt: null },
    select: { token: true, platform: true },
  });
}

/**
 * Whether "now" falls inside the user's quiet hours.
 *
 * Handles the overnight case (21:00–08:00) by treating the window as wrapping, which is
 * the common configuration and the one a naive `start <= now <= end` gets wrong.
 */
export function isWithinQuietHours(input: {
  nowHHmm: string;
  quietStart: string;
  quietEnd: string;
}): boolean {
  const { nowHHmm, quietStart, quietEnd } = input;

  if (quietStart === quietEnd) return false;

  return quietStart < quietEnd
    ? nowHHmm >= quietStart && nowHHmm < quietEnd
    : nowHHmm >= quietStart || nowHHmm < quietEnd;
}
