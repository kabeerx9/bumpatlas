import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";

import type { AppTheme } from "@/design-system/theme";
import { useAppTheme } from "@/design-system/theme";
import { borderWidth, colors, radius, shadows, spacing } from "@/design-system/tokens";

type IconButtonTone = "plain" | "card" | "purple" | "mint" | "danger";

type IconButtonProps = {
  children: ReactNode;
  accessibilityLabel: string;
  onPress?: () => void;
  tone?: IconButtonTone;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const toneStyle = (theme: AppTheme): Record<IconButtonTone, ViewStyle> => ({
  plain: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  purple: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  mint: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  danger: {
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.dangerBorder,
  },
});

export function IconButton({
  children,
  accessibilityLabel,
  onPress,
  tone = "card",
  size = 44,
  disabled = false,
  style,
}: IconButtonProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        toneStyle(theme)[tone],
        tone !== "plain" && shadows.soft,
        {
          width: size,
          height: size,
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.full,
    borderWidth: borderWidth.hairline,
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
});
