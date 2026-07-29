import type { ReactNode } from "react";
import type { StyleProp, TextStyle } from "react-native";
import { StyleSheet, Text as NativeText } from "react-native";

import type { AppTheme } from "@/design-system/theme";
import { useAppTheme } from "@/design-system/theme";
import { resolveUiFont } from "@/lib/fonts";
import { typography } from "@/design-system/tokens";

export type TextTone = "primary" | "secondary" | "tertiary" | "muted" | "inverse" | "brand";
export type TextVariant =
  | "hero"
  | "heading"
  | "title"
  | "subhead"
  | "body"
  | "bodySmall"
  | "caption"
  | "label";

type AppTextProps = {
  children: ReactNode;
  variant?: TextVariant;
  tone?: TextTone;
  weight?: keyof typeof typography.weight;
  align?: TextStyle["textAlign"];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
};

const toneColor = (theme: AppTheme): Record<TextTone, string> => ({
  primary: theme.colors.text,
  secondary: theme.colors.textSecondary,
  tertiary: theme.colors.textTertiary,
  muted: theme.colors.textMuted,
  inverse: theme.colors.textInverse,
  brand: theme.colors.brandText,
});

const variantStyle: Record<TextVariant, TextStyle> = {
  hero: {
    fontSize: typography.size.hero,
    lineHeight: typography.lineHeight.hero,
    letterSpacing: -0.8,
  },
  heading: {
    fontSize: typography.size.heading,
    lineHeight: typography.lineHeight.heading,
    letterSpacing: -0.6,
  },
  title: {
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    letterSpacing: -0.4,
  },
  subhead: {
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
  },
  body: {
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
  },
  bodySmall: {
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
  },
  caption: {
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    letterSpacing: 0.4,
  },
  label: {
    fontSize: typography.size.label,
    lineHeight: typography.lineHeight.label,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
};

export function AppText({
  children,
  variant = "body",
  tone = "primary",
  weight,
  align,
  numberOfLines,
  style,
}: AppTextProps) {
  const theme = useAppTheme();

  return (
    <NativeText
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        variantStyle[variant],
        {
          color: toneColor(theme)[tone],
          textAlign: align,
          fontFamily: resolveUiFont(weight, variant),
        },
        style,
      ]}
    >
      {children}
    </NativeText>
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0,
  },
});
