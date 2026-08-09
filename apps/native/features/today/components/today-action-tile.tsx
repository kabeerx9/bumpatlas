import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing, useAppTheme } from "@/design-system";

type IconName = ComponentProps<typeof Feather>["name"];

type TodayActionTileProps = {
  icon: IconName;
  label: string;
  title: string;
  detail?: string;
  done?: boolean;
  emphasized?: boolean;
  onPress: () => void;
};

export function TodayActionTile({
  icon,
  label,
  title,
  detail,
  done,
  emphasized,
  onPress,
}: TodayActionTileProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${title}${emphasized ? ", your focus" : ""}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        emphasized && styles.emphasized,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <View style={[styles.iconWrap, emphasized && styles.iconEmphasized]}>
          <Feather name={icon} size={18} color={emphasized ? colors.brand.ink : colors.brand.honeyDeep} />
        </View>
        {emphasized ? (
          <AppText variant="caption" weight="semibold" style={styles.focusChip}>
            Focus
          </AppText>
        ) : done ? (
          <View style={styles.done}>
            <Feather name="check" size={11} color={colors.brand.ink} />
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
    borderWidth: 1,
    padding: spacing.lg,
    gap: 4,
  },
  emphasized: {
    borderWidth: 1.5,
    borderColor: colors.brand.honey,
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
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmphasized: {
    backgroundColor: colors.brand.honey,
  },
  focusChip: {
    color: colors.brand.honeyDeep,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  done: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brand.honey,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: colors.brand.honeyDeep,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    lineHeight: 21,
    color: colors.brand.ink,
  },
});
