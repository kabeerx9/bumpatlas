import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, typography } from "@/design-system/tokens";

type BrandWordmarkProps = {
  size?: "sm" | "md" | "lg" | "xl";
  inverse?: boolean;
  markOnly?: boolean;
  style?: StyleProp<ViewStyle>;
};

const sizeMap = {
  sm: { fontSize: 18, mark: 36, icon: 16 },
  md: { fontSize: 22, mark: 52, icon: 22 },
  lg: { fontSize: 28, mark: 64, icon: 28 },
  xl: { fontSize: 34, mark: 88, icon: 36 },
} as const;

export function BrandWordmark({
  size = "md",
  inverse = false,
  markOnly = false,
  style,
}: BrandWordmarkProps) {
  const values = sizeMap[size];
  const color = inverse ? colors.text.inverse : colors.brand.ink;

  return (
    <View accessibilityLabel="BumpAtlas" style={[styles.row, style]}>
      <View
        style={[
          styles.mark,
          {
            width: values.mark,
            height: values.mark,
            borderRadius: values.mark / 2,
          },
        ]}
      >
        <Text style={[styles.heart, { fontSize: values.icon }]}>♡</Text>
      </View>
      {!markOnly ? (
        <Text
          style={[
            styles.text,
            {
              color,
              fontSize: values.fontSize,
              fontFamily: typography.fontFamily.editorial,
            },
          ]}
        >
          BumpAtlas
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  mark: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.peach,
  },
  heart: {
    color: colors.text.inverse,
    fontWeight: "600",
  },
  text: {
    fontWeight: typography.weight.bold,
    letterSpacing: -0.3,
  },
});
