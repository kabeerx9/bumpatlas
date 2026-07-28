import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import type { AppTheme } from "@/design-system/theme";
import { useAppTheme } from "@/design-system/theme";
import { borderWidth, colors, radius, shadows, spacing } from "@/design-system/tokens";

type SurfaceTone = "card" | "warm" | "cool" | "lavender" | "mint" | "dark";

type SurfaceProps = {
  children: ReactNode;
  tone?: SurfaceTone;
  elevated?: boolean;
  bordered?: boolean;
  padding?: keyof typeof spacing | "none";
  radiusSize?: keyof typeof radius;
  style?: StyleProp<ViewStyle>;
};

const toneStyles = (theme: AppTheme): Record<SurfaceTone, ViewStyle> => ({
  card: {
    backgroundColor: theme.colors.surface,
  },
  warm: {
    backgroundColor: theme.colors.surfaceWarm,
  },
  cool: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  lavender: {
    backgroundColor: theme.colors.accent,
  },
  mint: {
    backgroundColor: theme.colors.mintSurface,
  },
  dark: {
    backgroundColor: colors.surface.dark,
  },
});

export function Surface({
  children,
  tone = "card",
  elevated = false,
  bordered = true,
  padding = "lg",
  radiusSize = "lg",
  style,
}: SurfaceProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.base,
        toneStyles(theme)[tone],
        {
          borderRadius: radius[radiusSize],
          padding: padding === "none" ? 0 : spacing[padding],
        },
        bordered && { borderWidth: borderWidth.hairline, borderColor: theme.colors.border },
        elevated && shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
