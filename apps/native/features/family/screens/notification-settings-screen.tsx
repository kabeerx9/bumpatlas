import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, Surface, colors, radius, spacing } from "@/design-system";
import {
  notificationCategories,
  type NotificationPrefKey,
} from "@/features/family/data/notification-categories";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from "@/lib/api/hooks";
import {
  enablePushAndRegister,
  getPushPermissionStatus,
  type PushPermissionStatus,
} from "@/lib/notifications/push";

const QUIET_HOUR_PRESETS: Array<{ start: string; end: string; label: string }> = [
  { start: "21:00", end: "08:00", label: "9pm – 8am" },
  { start: "22:00", end: "07:00", label: "10pm – 7am" },
  { start: "20:00", end: "09:00", label: "8pm – 9am" },
  { start: "23:00", end: "08:00", label: "11pm – 8am" },
];

const DEFAULT_NOTIFICATION_PREFS = Object.fromEntries(
  notificationCategories.map((category) => [category.id, category.defaultOn]),
) as Record<NotificationPrefKey, boolean>;

export function NotificationSettingsScreen() {
  const router = useRouter();
  const prefsQuery = useNotificationPreferencesQuery();
  const updatePrefs = useUpdateNotificationPreferencesMutation();
  const [permission, setPermission] = useState<PushPermissionStatus>("undetermined");
  const [registering, setRegistering] = useState(false);

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState("21:00");
  const [quietEnd, setQuietEnd] = useState("08:00");
  const [groupRelatedAlerts, setGroupRelatedAlerts] = useState(true);
  const [notificationPrefs, setNotificationPrefs] = useState<Record<NotificationPrefKey, boolean>>(
    DEFAULT_NOTIFICATION_PREFS,
  );

  useEffect(() => {
    void getPushPermissionStatus().then(setPermission);
  }, []);

  useEffect(() => {
    const prefs = prefsQuery.data;
    if (!prefs) return;
    setQuietHoursEnabled(prefs.quietHoursEnabled);
    setQuietStart(prefs.quietStart);
    setQuietEnd(prefs.quietEnd);
    setGroupRelatedAlerts(prefs.groupRelatedAlerts);
    setNotificationPrefs((current) => ({ ...current, ...prefs.prefs }));
  }, [prefsQuery.data]);

  function setQuietHoursValues(start: string, end: string) {
    setQuietStart(start);
    setQuietEnd(end);
  }

  function setNotificationPref(key: NotificationPrefKey, value: boolean) {
    setNotificationPrefs((current) => ({ ...current, [key]: value }));
  }

  async function persistPrefsPatch(
    patch: Parameters<typeof updatePrefs.mutateAsync>[0],
  ) {
    try {
      await updatePrefs.mutateAsync(patch);
    } catch {
      // Local toggles still apply; server sync retries when API is available.
    }
  }

  async function enableSystemNotifications() {
    if (registering) return;
    setRegistering(true);
    try {
      const result = await enablePushAndRegister();
      setPermission(result.permission);
      if (result.permission !== "granted") {
        Alert.alert(
          "Notifications off",
          "You can enable them later in system Settings if you change your mind.",
        );
      }
    } finally {
      setRegistering(false);
    }
  }

  function cycleQuietHours() {
    const currentIndex = QUIET_HOUR_PRESETS.findIndex(
      (p) => p.start === quietStart && p.end === quietEnd,
    );
    const next = QUIET_HOUR_PRESETS[(currentIndex + 1) % QUIET_HOUR_PRESETS.length];
    setQuietHoursValues(next.start, next.end);
    void persistPrefsPatch({ quietStart: next.start, quietEnd: next.end });
  }

  const quietLabel =
    QUIET_HOUR_PRESETS.find((p) => p.start === quietStart && p.end === quietEnd)?.label ??
    `${quietStart} – ${quietEnd}`;

  return (
    <SoftStackShell title="Notifications" onBack={() => router.back()}>
      <AppText variant="bodySmall" tone="secondary">
        No shame language — ever.
      </AppText>

      {permission !== "granted" ? (
        <Surface tone="card" elevated radiusSize="xl" style={styles.permissionCard}>
          <AppText weight="semibold">Device permission</AppText>
          <AppText variant="bodySmall" tone="secondary">
            BumpAtlas needs system permission to deliver quiet-hours-aware prompts.
          </AppText>
          <Button size="sm" disabled={registering} onPress={() => void enableSystemNotifications()}>
            {registering ? "Requesting…" : "Allow notifications"}
          </Button>
        </Surface>
      ) : null}

      <View style={styles.sectionHead}>
        <AppText weight="semibold">Quiet hours</AppText>
        <AppText variant="bodySmall" tone="secondary">
          Non-urgent notifications pause during these hours.
        </AppText>
      </View>

      <Pressable
        onPress={() => {
          const next = !quietHoursEnabled;
          setQuietHoursEnabled(next);
          void persistPrefsPatch({ quietHoursEnabled: next });
        }}
      >
        <Surface
          tone="card"
          elevated
          radiusSize="xl"
          style={[styles.row, quietHoursEnabled && styles.rowOn]}
        >
          <View style={styles.copy}>
            <AppText weight="semibold">Enable quiet hours</AppText>
            <View style={styles.timeChips}>
              <Pressable onPress={cycleQuietHours} hitSlop={8} style={styles.timeChip}>
                <AppText variant="caption" weight="semibold" style={styles.chipText}>
                  {quietLabel}
                </AppText>
              </Pressable>
              <Pressable onPress={cycleQuietHours} hitSlop={8}>
                <AppText variant="caption" tone="secondary">
                  Tap to change
                </AppText>
              </Pressable>
            </View>
          </View>
          <View style={[styles.toggle, quietHoursEnabled && styles.toggleOn]}>
            <View style={[styles.knob, quietHoursEnabled && styles.knobOn]} />
          </View>
        </Surface>
      </Pressable>

      <Pressable
        onPress={() => {
          const next = !groupRelatedAlerts;
          setGroupRelatedAlerts(next);
          void persistPrefsPatch({ groupRelatedAlerts: next });
        }}
        accessibilityRole="switch"
        accessibilityState={{ checked: groupRelatedAlerts }}
      >
        <Surface
          tone="card"
          elevated
          radiusSize="xl"
          style={[styles.row, groupRelatedAlerts && styles.rowOn]}
        >
          <View style={styles.copy}>
            <AppText weight="semibold">Group related alerts</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Bundle partner + recap nudges instead of scattering separate pings.
            </AppText>
          </View>
          <View style={[styles.toggle, groupRelatedAlerts && styles.toggleOn]}>
            <View style={[styles.knob, groupRelatedAlerts && styles.knobOn]} />
          </View>
        </Surface>
      </Pressable>

      <View style={styles.sectionHead}>
        <AppText weight="semibold">Categories</AppText>
      </View>

      {notificationCategories.map((category) => {
        const key = category.id as NotificationPrefKey;
        const enabled = notificationPrefs[key];
        return (
          <Pressable
            key={category.id}
            onPress={() => {
              const next = !enabled;
              setNotificationPref(key, next);
              void persistPrefsPatch({
                prefs: { ...notificationPrefs, [key]: next },
              });
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: enabled }}
          >
            <Surface tone="card" elevated radiusSize="xl" style={[styles.row, enabled && styles.rowOn]}>
              <View style={styles.copy}>
                <AppText weight="semibold">{category.label}</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  {category.description}
                </AppText>
              </View>
              <View style={[styles.toggle, enabled && styles.toggleOn]}>
                <View style={[styles.knob, enabled && styles.knobOn]} />
              </View>
            </Surface>
          </Pressable>
        );
      })}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  permissionCard: {
    gap: spacing.sm,
  },
  sectionHead: { gap: 2, marginTop: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowOn: { borderColor: colors.brand.honey, backgroundColor: colors.surface.warm },
  copy: { flex: 1, gap: 2 },
  timeChips: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4 },
  timeChip: {
    borderRadius: radius.full,
    backgroundColor: colors.brand.honeySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  chipText: { color: colors.brand.honeyDeep },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(44,36,32,0.12)",
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: colors.brand.honey },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface.card,
  },
  knobOn: { alignSelf: "flex-end" },
});
