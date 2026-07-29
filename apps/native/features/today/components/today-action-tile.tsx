import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, shadows, spacing } from "@/design-system";

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
            <Feather name="check" size={10} color={colors.text.inverse} />
          </View>
        ) : null}
      </View>

      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText weight="semibold" numberOfLines={2} style={styles.title}>
        {title}
      </AppText>
      {detail ? (
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {detail}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 132,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    ...shadows.soft,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  done: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    lineHeight: 20,
  },
});
