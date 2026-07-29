import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

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
          <Feather name="arrow-up-right" size={12} color={colors.brand.peach} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exhausted: {
    color: colors.brand.peach,
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(44,36,32,0.1)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.brand.peach,
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
    color: colors.brand.peach,
  },
});
