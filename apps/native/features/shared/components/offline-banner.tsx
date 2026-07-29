import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

type OfflineBannerProps = {
  message?: string;
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export function OfflineBanner({
  message = "You're offline · new memories save locally and sync when you're back",
  onDismiss,
  actionLabel,
  onAction,
}: OfflineBannerProps) {
  return (
    <View style={styles.banner}>
      <Feather name="wifi-off" size={16} color={colors.brand.peach} />
      <AppText variant="bodySmall" style={styles.copy}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText variant="caption" weight="semibold" style={styles.action}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss offline banner">
          <Feather name="x" size={16} color={colors.text.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.peachSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  copy: {
    flex: 1,
    lineHeight: 18,
  },
  action: {
    color: colors.brand.peach,
  },
});
