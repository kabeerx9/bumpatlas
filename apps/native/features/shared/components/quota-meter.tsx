import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, borderWidth, colors, radius, shadows, spacing } from "@/design-system";

type QuotaMeterProps = {
  used: number;
  limit: number;
  label?: string;
  exhaustedLabel?: string;
  onUpgrade?: () => void;
};

export function QuotaMeter({
  used,
  limit,
  label = "AI messages today",
  exhaustedLabel = "Limit reached · View premium",
  onUpgrade,
}: QuotaMeterProps) {
  const ratio = Math.min(1, used / Math.max(limit, 1));
  const exhausted = used >= limit;

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: limit, now: used }}>
      <View style={styles.row}>
        <AppText variant="caption" tone="secondary">
          {label}
        </AppText>
        <AppText variant="caption" weight="semibold" style={exhausted ? styles.exhausted : undefined}>
          {used}/{limit}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }, exhausted && styles.fillExhausted]} />
      </View>
      {exhausted && onUpgrade ? (
        <Pressable onPress={onUpgrade} style={styles.upgradeRow} accessibilityRole="button">
          <AppText variant="caption" weight="semibold" style={styles.upgrade}>
            {exhaustedLabel}
          </AppText>
          <Feather name="arrow-up-right" size={12} color={colors.brand.honeyDeep} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border.hairline,
    padding: spacing.md,
    ...shadows.soft,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exhausted: {
    color: colors.brand.honeyDeep,
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface.mist,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.brand.honeyDeep,
  },
  fillExhausted: {
    backgroundColor: colors.brand.terracotta,
  },
  upgradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  upgrade: {
    color: colors.brand.honeyDeep,
  },
});
