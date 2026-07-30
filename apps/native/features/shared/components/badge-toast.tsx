import { Feather } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, colors, radius, shadows, spacing } from "@/design-system";
import { mockBadges } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";

/** Soft toast when a cosmetic badge is newly earned. */
export function BadgeToast() {
  const insets = useSafeAreaInsets();
  const { newlyEarnedBadgeId, clearNewlyEarnedBadge } = useMockUi();
  const badge = mockBadges.find((item) => item.id === newlyEarnedBadgeId);

  useEffect(() => {
    if (!newlyEarnedBadgeId) return;
    const timer = setTimeout(() => clearNewlyEarnedBadge(), 3400);
    return () => clearTimeout(timer);
  }, [newlyEarnedBadgeId, clearNewlyEarnedBadge]);

  if (!badge) return null;

  return (
    <Pressable
      onPress={clearNewlyEarnedBadge}
      style={[styles.toast, { top: insets.top + spacing.sm }]}
      accessibilityRole="alert"
      accessibilityLabel={`Badge earned: ${badge.title}`}
    >
      <Feather name="award" size={16} color={colors.brand.ink} />
      <AppText variant="caption" weight="semibold" tone="primary" style={styles.copy}>
        Badge earned · {badge.title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    alignSelf: "center",
    left: spacing.page,
    right: spacing.page,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand.honey,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    ...shadows.card,
  },
  copy: { flex: 1 },
});
