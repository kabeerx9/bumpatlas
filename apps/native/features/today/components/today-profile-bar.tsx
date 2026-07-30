import { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText, IconButton, colors, spacing, useAppTheme } from "@/design-system";

type TodayProfileBarProps = {
  displayName: string;
  stageLabel: string;
  onSettingsPress: () => void;
};

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function TodayProfileBar({
  displayName,
  stageLabel,
  onSettingsPress,
}: TodayProfileBarProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.bar}>
      <View style={styles.copy}>
        <AppText variant="hero" weight="medium">
          {greetingForNow()}, {displayName}
        </AppText>
        <AppText variant="bodySmall" tone="secondary">
          {stageLabel} · growing gently
        </AppText>
      </View>

      <View style={styles.actions}>
        <IconButton accessibilityLabel="Notifications" tone="card">
          <Feather name="bell" size={18} color={theme.colors.text} />
        </IconButton>
        <IconButton
          accessibilityLabel="Open profile settings"
          tone="card"
          onPress={onSettingsPress}
        >
          <AppText weight="semibold" style={{ color: colors.brand.ink }}>
            {displayName.slice(0, 1).toUpperCase()}
          </AppText>
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  copy: {
    gap: 4,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
