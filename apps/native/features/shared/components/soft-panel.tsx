import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { borderWidth, colors, radius, shadows, spacing } from "@/design-system";

type SoftPanelProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tinted?: boolean;
};

export function SoftPanel({ children, style, tinted = false }: SoftPanelProps) {
  return (
    <View style={[styles.panel, tinted && styles.tinted, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border.hairline,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft,
  },
  tinted: {
    backgroundColor: colors.brand.honeySoft,
    borderColor: colors.border.warm,
  },
});
