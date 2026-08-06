import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";
import { colors } from "@/design-system/tokens";

type AtmosphereVariant = "cream" | "soft" | "brand";

type AtmosphereProps = {
  children?: ReactNode;
  variant?: AtmosphereVariant;
  style?: StyleProp<ViewStyle>;
};

/**
 * The Soft Atlas canvas: a 160deg mint -> cream -> blush wash.
 *
 * This replaces the old absolutely-positioned "blob" approximation — that
 * existed only because we believed there was no gradient module. There is
 * (`expo-linear-gradient`), and the real wash is the whole point of the design.
 *
 *   cream  in-app screens (default) — light enough that white cards still pop
 *   soft   full-bleed auth / onboarding / splash — more saturated
 *   brand  flat honey wash for accent-flavoured panels (no gradient)
 */
export function Atmosphere({ children, variant = "cream", style }: AtmosphereProps) {
  const theme = useAppTheme();

  if (variant === "brand") {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.accent }, style]}>{children}</View>
    );
  }

  const stops =
    variant === "soft" ? theme.colors.backgroundGradientBold : theme.colors.backgroundGradient;

  return (
    <LinearGradient
      colors={stops as unknown as readonly [string, string, ...string[]]}
      locations={colors.gradient.canvasLocations as unknown as readonly [number, number, ...number[]]}
      start={colors.gradient.diagonal.start}
      end={colors.gradient.diagonal.end}
      style={[styles.root, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
});
