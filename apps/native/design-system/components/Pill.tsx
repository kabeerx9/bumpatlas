import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import type { AppTheme } from "@/design-system/theme";
import { useAppTheme } from "@/design-system/theme";
import { borderWidth, colors, radius, spacing } from "@/design-system/tokens";

type PillTone = "selected" | "neutral" | "mint" | "lavender" | "error" | "warning";

type PillProps = {
  children: ReactNode;
  tone?: PillTone;
  leadingDot?: boolean;
  style?: StyleProp<ViewStyle>;
};

const toneStyle = (theme: AppTheme): Record<PillTone, ViewStyle> => ({
  selected: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  neutral: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  mint: {
    backgroundColor: theme.colors.mintSurface,
    borderColor: theme.colors.mintBorder,
  },
  lavender: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.borderStrong,
  },
  error: {
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.dangerBorder,
  },
  warning: {
    backgroundColor: theme.colors.warningSurface,
    borderColor: theme.colors.warningBorder,
  },
});

const textTone: Record<PillTone, "primary" | "secondary" | "inverse" | "brand"> = {
  selected: "inverse",
  neutral: "secondary",
  mint: "primary",
  lavender: "brand",
  error: "primary",
  warning: "primary",
};

export function Pill({ children, tone = "neutral", leadingDot = false, style }: PillProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.base, toneStyle(theme)[tone], style]}>
      {leadingDot ? <View style={[styles.dot, tone === "warning" && styles.warningDot]} /> : null}
      <AppText variant="label" tone={textTone[tone]} weight="semibold">
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderWidth: borderWidth.hairline,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.status.emerald,
  },
  warningDot: {
    backgroundColor: colors.status.warning,
  },
});
