import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import type { AppTheme } from "@/design-system/theme";
import { useAppTheme } from "@/design-system/theme";
import { borderWidth, colors, radius, shadows, spacing } from "@/design-system/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "circle";

type ButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  leftAccessory?: ReactNode;
  rightAccessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const variantStyle = (theme: AppTheme): Record<ButtonVariant, ViewStyle> => ({
  primary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  ghost: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  dark: {
    backgroundColor: colors.surface.inverse,
    borderColor: colors.surface.inverse,
  },
  destructive: {
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.dangerBorder,
  },
});

const textColor = (theme: AppTheme): Record<ButtonVariant, string> => ({
  primary: theme.colors.primaryText,
  secondary: theme.colors.secondaryText,
  ghost: theme.colors.text,
  dark: colors.text.inverse,
  destructive: theme.colors.danger,
});

const textTone: Record<ButtonVariant, "primary"> = {
  primary: "primary",
  secondary: "primary",
  ghost: "primary",
  dark: "primary",
  destructive: "primary",
};

const sizeStyle: Record<ButtonSize, ViewStyle> = {
  sm: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  circle: {
    width: 44,
    height: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
};

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  leftAccessory,
  rightAccessory,
  style,
}: ButtonProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyle(theme)[variant],
        sizeStyle[size],
        variant === "secondary" && shadows.purple,
        size === "circle" && styles.circle,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {leftAccessory}
        <AppText
          variant={size === "sm" ? "caption" : "bodySmall"}
          tone={textTone[variant]}
          weight="semibold"
          style={{ color: textColor(theme)[variant] }}
        >
          {children}
        </AppText>
        {rightAccessory}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },
  circle: {
    borderRadius: radius.full,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
