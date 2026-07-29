import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/design-system";

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
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  tinted: {
    backgroundColor: colors.brand.peach,
  },
});
