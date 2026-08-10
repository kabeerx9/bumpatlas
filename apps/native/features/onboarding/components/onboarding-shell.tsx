import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, Pill, colors, radius, spacing, useAppTheme } from "@/design-system";

type OnboardingShellProps = {
  children: ReactNode;
  scene?: ReactNode;
  stepIndex: number;
  totalSteps: number;
  canContinue: boolean;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  showManageProfile?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  progressLabel?: string;
};

export function OnboardingShell({
  children,
  scene,
  stepIndex,
  totalSteps,
  canContinue,
  onBack,
  onContinue,
  continueLabel = "Save & Continue",
  showManageProfile = false,
  secondaryLabel,
  onSecondary,
  progressLabel,
}: OnboardingShellProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.column} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              style={[styles.backBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
              hitSlop={12}
            >
              <Feather name="arrow-left" size={20} color={colors.brand.ink} />
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}

          <Pill tone="selected">
            {progressLabel ?? `Step ${stepIndex} of ${totalSteps}`}
          </Pill>

          {showManageProfile ? (
            <Pressable
              style={[styles.manageChip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
              accessibilityLabel="Manage profile"
            >
              <Feather name="user" size={14} color={colors.brand.ink} />
              <AppText variant="caption" weight="semibold">
                Manage Profile
              </AppText>
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
        </View>

        {scene ? <View style={styles.scene}>{scene}</View> : null}

        <View style={styles.body}>{children}</View>

        <View
          style={[
            styles.footer,
            { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background },
          ]}
        >
          {secondaryLabel && onSecondary ? (
            <Pressable onPress={onSecondary} hitSlop={12} style={styles.secondaryBtn}>
              <AppText tone="secondary" align="center">
                {secondaryLabel}
              </AppText>
            </Pressable>
          ) : null}
          <Button disabled={!canContinue} onPress={onContinue} size="md" style={styles.cta}>
            {continueLabel}
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  column: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.xs,
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
    minHeight: 44,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
    minHeight: 0,
  },
  scene: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  cta: {
    width: "100%",
  },
});
