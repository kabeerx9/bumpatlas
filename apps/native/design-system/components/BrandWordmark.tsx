import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, shadows, typography } from "@/design-system/tokens";

type BrandWordmarkProps = {
  size?: "sm" | "md" | "lg" | "xl";
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
};

const sizeMap = {
  sm: {
    fontSize: 16,
    dot: 6,
  },
  md: {
    fontSize: 24,
    dot: 8,
  },
  lg: {
    fontSize: 38,
    dot: 11,
  },
  xl: {
    fontSize: 56,
    dot: 14,
  },
} as const;

export function BrandWordmark({ size = "md", inverse = false, style }: BrandWordmarkProps) {
  const values = sizeMap[size];
  const color = inverse ? colors.text.inverse : colors.text.primary;

  return (
    <View accessibilityLabel="App Starter" style={[styles.row, style]}>
      <Text style={[styles.text, { color, fontSize: values.fontSize }]}>App</Text>
      <View
        style={[
          styles.dot,
          shadows.mint,
          {
            width: values.dot,
            height: values.dot,
          },
        ]}
      />
      <Text style={[styles.text, { color, fontSize: values.fontSize }]}>Starter</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
  },
  text: {
    fontWeight: typography.weight.bold,
    letterSpacing: 0,
  },
  dot: {
    backgroundColor: colors.brand.mint,
    borderRadius: radius.full,
    marginHorizontal: 2,
  },
});
