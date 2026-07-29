import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

type IconName = ComponentProps<typeof Feather>["name"];

type TodayActionTileProps = {
  icon: IconName;
  label: string;
  title: string;
  detail?: string;
  done?: boolean;
  onPress: () => void;
};

export function TodayActionTile({
  icon,
  label,
  title,
  detail,
  done,
  onPress,
}: TodayActionTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <Feather name={icon} size={18} color={colors.brand.peach} />
        </View>
        {done ? (
          <View style={styles.done}>
            <Feather name="check" size={11} color={colors.text.inverse} />
          </View>
        ) : null}
      </View>

      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <AppText weight="semibold" numberOfLines={2} style={styles.title}>
        {title}
      </AppText>
      {detail ? (
        <AppText variant="caption" tone="secondary">
          {detail}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 150,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: 4,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  done: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: colors.brand.peach,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    lineHeight: 21,
    color: colors.brand.ink,
  },
});
