import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";
import type { NotificationPrefKey } from "@/features/mock/mock-ui-context";

type NotificationPrefs = Record<NotificationPrefKey, boolean>;

type NotificationsStepProps = {
  prefs: NotificationPrefs;
  onToggle: (key: NotificationPrefKey) => void;
};

const OPTIONS: Array<{
  key: NotificationPrefKey;
  label: string;
  description: string;
}> = [
  {
    key: "dailyPrompt",
    label: "Daily memory prompt",
    description: "A gentle nudge to capture one moment",
  },
  {
    key: "wellnessReminder",
    label: "Wellness reminder",
    description: "Two-minute care suggestions",
  },
  {
    key: "partnerActivity",
    label: "Partner activity",
    description: "When someone adds to the journal",
  },
  {
    key: "weeklyRecap",
    label: "Weekly recap ready",
    description: "When your share card is prepared",
  },
  {
    key: "communityReply",
    label: "Community reply",
    description: "Muted by default during beta",
  },
  {
    key: "subscription",
    label: "Subscription",
    description: "Billing and plan updates",
  },
];

export function NotificationsStep({ prefs, onToggle }: NotificationsStepProps) {
  return (
    <View style={styles.block}>
      <AppText variant="heading">Stay in the loop — optionally</AppText>
      <AppText variant="body" tone="secondary" style={styles.lead}>
        You can change these anytime. Quiet hours default to 9pm–8am. Community replies stay muted
        for beta.
      </AppText>

      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const enabled = prefs[option.key];
          return (
            <Pressable
              key={option.key}
              onPress={() => onToggle(option.key)}
              style={[styles.row, enabled && styles.rowEnabled]}
              accessibilityRole="switch"
              accessibilityState={{ checked: enabled }}
            >
              <View style={styles.copy}>
                <AppText weight="semibold">{option.label}</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  {option.description}
                </AppText>
              </View>
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
  block: { gap: spacing.md },
  lead: { maxWidth: 340, lineHeight: 24 },
  list: { gap: spacing.sm, marginTop: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    minHeight: 72,
  },
  rowEnabled: {
    borderColor: colors.brand.peachSoft,
    backgroundColor: colors.surface.warm,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(44,36,32,0.12)",
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: {
    backgroundColor: colors.brand.peach,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface.card,
  },
  knobOn: {
    alignSelf: "flex-end",
  },
});
