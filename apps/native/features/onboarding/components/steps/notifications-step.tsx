import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";
import type { NotificationPrefKey } from "@/features/family/data/notification-categories";

type NotificationPrefs = Record<NotificationPrefKey, boolean>;

type NotificationsStepProps = {
  prefs: NotificationPrefs;
  onToggle: (key: NotificationPrefKey) => void;
};

const OPTIONS: Array<{ key: NotificationPrefKey; label: string }> = [
  { key: "dailyPrompt", label: "Daily memory prompt" },
  { key: "wellnessReminder", label: "Wellness reminder" },
  { key: "partnerActivity", label: "Partner activity" },
  { key: "weeklyRecap", label: "Weekly recap" },
  { key: "communityReply", label: "Community replies" },
  { key: "subscription", label: "Plan and billing" },
];

export function NotificationsStep({ prefs, onToggle }: NotificationsStepProps) {
  return (
    <View style={styles.block}>
      <View style={styles.headingRow}>
        <AppText variant="heading">Choose your reminders</AppText>
        <AppText variant="caption" tone="secondary">Change anytime</AppText>
      </View>

      <View style={styles.list}>
        {OPTIONS.map((option, index) => {
          const enabled = prefs[option.key];
          return (
            <Pressable
              key={option.key}
              onPress={() => onToggle(option.key)}
              style={[styles.row, index > 0 && styles.rowBorder]}
              accessibilityRole="switch"
              accessibilityState={{ checked: enabled }}
            >
              <AppText variant="bodySmall" weight="semibold" style={styles.label} numberOfLines={1}>
                {option.label}
              </AppText>
              <View style={[styles.toggle, enabled && styles.toggleOn]}>
                <View style={[styles.knob, enabled && styles.knobOn]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  headingRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm },
  list: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: "hidden",
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border.hairline },
  label: { flex: 1 },
  toggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(44,36,32,0.12)",
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: colors.brand.honey },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surface.card },
  knobOn: { alignSelf: "flex-end" },
});
