import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

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
  return (
    <View style={styles.bar}>
      <View style={styles.profile}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <AppText weight="semibold" tone="inverse" style={styles.initial}>
              {displayName.slice(0, 1)}
            </AppText>
          </View>
        </View>
        <View style={styles.copy}>
          <AppText variant="title">{displayName}</AppText>
          <AppText variant="bodySmall" tone="secondary">
            {stageLabel} · growing gently
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
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.brand.peach,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontSize: 20,
  },
  copy: {
    gap: 2,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
});
