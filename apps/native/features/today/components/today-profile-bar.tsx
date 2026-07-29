import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "@/design-system";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type TodayProfileBarProps = {
  displayName: string;
  stageLabel: string;
  onSettingsPress: () => void;
};

export function TodayProfileBar({
  displayName,
  stageLabel,
  onSettingsPress,
}: TodayProfileBarProps) {
  const greeting = greetingForHour(new Date().getHours());

  return (
    <View style={styles.bar}>
      <View style={styles.profile}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <AppText weight="semibold" tone="inverse">
              {displayName.slice(0, 1)}
            </AppText>
          </View>
        </View>
        <View>
          <AppText variant="caption" tone="secondary">
            {greeting}
          </AppText>
          <AppText variant="subhead" weight="semibold">
            {displayName}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {stageLabel}
          </AppText>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.iconBtn} hitSlop={8}>
          <Feather name="bell" size={18} color={colors.brand.ink} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onSettingsPress} hitSlop={8}>
          <Feather name="settings" size={18} color={colors.brand.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.brand.peach,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
});
