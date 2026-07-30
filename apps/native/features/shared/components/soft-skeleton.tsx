import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/design-system";

type SkeletonProps = {
  lines?: number;
};

export function SoftSkeleton({ lines = 3 }: SkeletonProps) {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading">
      <View style={styles.hero} />
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={`sk-${index}`}
          style={[styles.line, index === lines - 1 && styles.lineShort]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.mist,
  },
  hero: {
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.honeySoft,
  },
  line: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border.warm,
  },
  lineShort: { width: "62%" },
});
