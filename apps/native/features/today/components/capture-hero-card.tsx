import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { AppText, CardStack, Surface, colors, radius, shadows, spacing, useAppTheme } from "@/design-system";
import { useRespectReduceMotion } from "@/features/shared/hooks/use-respect-reduce-motion";
import { ProgressRing } from "@/features/today/components/progress-ring";
import { TodayHeroIllustration } from "@/features/today/components/today-hero-illustration";

type CaptureHeroCardProps = {
  babyName: string;
  prompt: string;
  activeDays: number;
  goal: number;
  emphasized?: boolean;
  onCapture: () => void;
};

export function CaptureHeroCard({
  babyName,
  prompt,
  activeDays,
  goal,
  emphasized,
  onCapture,
}: CaptureHeroCardProps) {
  const appear = useRef(new Animated.Value(0)).current;
  const { reduceMotion } = useRespectReduceMotion();
  const theme = useAppTheme();

  useEffect(() => {
    if (reduceMotion.current) {
      appear.setValue(1);
      return;
    }
    Animated.spring(appear, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [appear, reduceMotion]);

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [
          {
            translateY: appear.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 0],
            }),
          },
        ],
      }}
    >
      <CardStack radiusSize="xl">
        <Surface
          tone="card"
          radiusSize="xl"
          padding="xl"
          elevated
          bordered={!emphasized}
          style={[styles.shell, emphasized && styles.emphasized]}
        >
          <View style={styles.badge}>
            <AppText variant="label" style={styles.badgeText}>
              {activeDays}/{goal} calm days
            </AppText>
          </View>

          <View style={styles.topRow}>
            <View style={styles.topCopy}>
              <AppText variant="caption" tone="brand" weight="semibold" style={styles.eyebrow}>
                {emphasized ? "Your focus · Capture" : `Today with ${babyName}`}
              </AppText>
              <AppText variant="caption" weight="semibold" tone="secondary">
                Calm days this week
              </AppText>
            </View>
            <ProgressRing activeDays={activeDays} goal={goal} />
          </View>

          <AppText variant="heading" weight="medium" style={styles.prompt}>
            {prompt}
          </AppText>
          <AppText variant="bodySmall" tone="secondary" style={styles.support}>
            One photo or a short note. That’s enough.
          </AppText>

          <View style={styles.illustrationRow}>
            <TodayHeroIllustration />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Capture moment"
              onPress={onCapture}
              style={({ pressed }) => [
                styles.captureBtn,
                { backgroundColor: theme.colors.primary },
                pressed && styles.captureBtnPressed,
              ]}
            >
              <Feather name="camera" size={20} color={theme.colors.primaryText} />
            </Pressable>
          </View>
        </Surface>
      </CardStack>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: spacing.sm,
    minHeight: 280,
  },
  emphasized: {
    borderWidth: 1.5,
    borderColor: colors.brand.honey,
  },
  badge: {
    position: "absolute",
    top: -14,
    right: spacing.lg,
    backgroundColor: colors.surface.card,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...shadows.soft,
  },
  badgeText: {
    color: colors.brand.honeyDeep,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  topCopy: { flex: 1, paddingRight: spacing.md, gap: 4 },
  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  prompt: {
    color: colors.brand.ink,
    lineHeight: 36,
    maxWidth: "92%",
  },
  support: {
    marginBottom: spacing.sm,
  },
  illustrationRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  captureBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  captureBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});
