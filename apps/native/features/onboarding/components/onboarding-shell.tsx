import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Atmosphere, Button, colors, radius, spacing } from "@/design-system";

type OnboardingShellProps = {
  children: ReactNode;
  stepIndex: number;
  totalSteps: number;
  canContinue: boolean;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  showManageProfile?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function OnboardingShell({
  children,
  stepIndex,
  totalSteps,
  canContinue,
  onBack,
  onContinue,
  continueLabel = "Save & Continue",
  showManageProfile = false,
  secondaryLabel,
  onSecondary,
}: OnboardingShellProps) {
  const progress = Math.min(100, Math.max(8, (stepIndex / totalSteps) * 100));

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              style={styles.backBtn}
              hitSlop={12}
            >
              <Feather name="arrow-left" size={20} color={colors.brand.ink} />
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}

          {showManageProfile ? (
            <Pressable style={styles.manageChip}>
              <Feather name="user" size={14} color={colors.brand.ink} />
              <AppText variant="caption" weight="semibold">
                Manage Profile
              </AppText>
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.body}>{children}</View>

        <View style={styles.footer}>
          {secondaryLabel && onSecondary ? (
            <Pressable onPress={onSecondary} hitSlop={12} style={styles.secondaryBtn}>
              <AppText tone="secondary" align="center">
                {secondaryLabel}
              </AppText>
            </Pressable>
          ) : null}
          <Button disabled={!canContinue} onPress={onContinue} size="lg" style={styles.cta}>
            {continueLabel}
          </Button>
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
  },
  backPlaceholder: { width: 44, height: 44 },
  manageChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  progressTrack: {
    marginTop: spacing.md,
    marginHorizontal: spacing.page,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(44,36,32,0.12)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.brand.peach,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.xxl,
  },
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
    backgroundColor: "rgba(247,241,236,0.92)",
    gap: spacing.sm,
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
  },
  cta: {
    width: "100%",
  },
});
