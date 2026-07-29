import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, colors, radius, spacing } from "@/design-system";
import { mockNotificationCategories } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";

const QUIET_HOUR_PRESETS: Array<{ start: string; end: string; label: string }> = [
  { start: "21:00", end: "08:00", label: "9pm – 8am" },
  { start: "22:00", end: "07:00", label: "10pm – 7am" },
  { start: "20:00", end: "09:00", label: "8pm – 9am" },
  { start: "23:00", end: "08:00", label: "11pm – 8am" },
];

export function NotificationSettingsScreen() {
  const router = useRouter();
  const {
    quietHoursEnabled,
    setQuietHoursEnabled,
    quietStart,
    quietEnd,
    setQuietHours,
  } = useMockUi();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(mockNotificationCategories.map((c) => [c.id, c.defaultOn])),
  );

  function cycleQuietHours() {
    const currentIndex = QUIET_HOUR_PRESETS.findIndex(
      (p) => p.start === quietStart && p.end === quietEnd,
    );
    const next = QUIET_HOUR_PRESETS[(currentIndex + 1) % QUIET_HOUR_PRESETS.length];
    setQuietHours(next.start, next.end);
  }

  const quietLabel =
    QUIET_HOUR_PRESETS.find((p) => p.start === quietStart && p.end === quietEnd)?.label ??
    `${quietStart} – ${quietEnd}`;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Notifications</AppText>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <AppText variant="bodySmall" tone="secondary">
            No shame language — ever.
          </AppText>

          <View style={styles.sectionHead}>
            <AppText weight="semibold">Quiet hours</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Non-urgent notifications pause during these hours.
            </AppText>
          </View>

          <Pressable
            onPress={() => setQuietHoursEnabled(!quietHoursEnabled)}
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
          </Pressable>

          <View style={styles.sectionHead}>
            <AppText weight="semibold">Categories</AppText>
          </View>

          {mockNotificationCategories.map((category) => {
            const enabled = prefs[category.id];
            return (
              <Pressable
                key={category.id}
                onPress={() =>
                  setPrefs((current) => ({ ...current, [category.id]: !current[category.id] }))
                }
                style={[styles.row, enabled && styles.rowOn]}
              >
                <View style={styles.copy}>
                  <AppText weight="semibold">{category.label}</AppText>
                  <AppText variant="bodySmall" tone="secondary">
                    {category.description}
                  </AppText>
                </View>
                <View style={[styles.toggle, enabled && styles.toggleOn]}>
                  <View style={[styles.knob, enabled && styles.knobOn]} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8EDE6" },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: spacing.page, gap: spacing.sm, paddingBottom: spacing.xxl },
  sectionHead: { gap: 2, marginTop: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  rowOn: { borderColor: colors.brand.peachSoft, backgroundColor: colors.surface.warm },
  copy: { flex: 1, gap: 2 },
  timeChips: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4 },
  timeChip: {
    borderRadius: radius.full,
    backgroundColor: colors.brand.peachSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  chipText: { color: colors.brand.peach },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(44,36,32,0.12)",
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: colors.brand.peach },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface.card,
  },
  knobOn: { alignSelf: "flex-end" },
});
