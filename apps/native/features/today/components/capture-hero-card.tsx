import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { AppText, Button, colors, shadows, spacing } from "@/design-system";
import { useRespectReduceMotion } from "@/features/shared/hooks/use-respect-reduce-motion";
import { ProgressRing } from "@/features/today/components/progress-ring";
import { TodayHeroIllustration } from "@/features/today/components/today-hero-illustration";

type CaptureHeroCardProps = {
  babyName: string;
  prompt: string;
  activeDays: number;
  goal: number;
  onCapture: () => void;
};

export function CaptureHeroCard({
  babyName,
  prompt,
  activeDays,
  goal,
  onCapture,
}: CaptureHeroCardProps) {
  const appear = useRef(new Animated.Value(0)).current;
  const { reduceMotion } = useRespectReduceMotion();

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
      style={[
        styles.shell,
        {
          opacity: appear,
          transform: [
            {
              translateY: appear.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <View style={styles.topRow}>
        <View style={styles.topCopy}>
          <AppText variant="caption" style={styles.eyebrow}>
            Today with {babyName}
          </AppText>
          <AppText variant="caption" weight="semibold" style={styles.week}>
            Calm days this week
          </AppText>
        </View>
        <ProgressRing activeDays={activeDays} goal={goal} />
      </View>

      <AppText variant="heading" style={styles.prompt}>
        {prompt}
      </AppText>
      <AppText variant="bodySmall" style={styles.support}>
        One photo or a short note. That’s enough.
      </AppText>

      <View style={styles.illustrationRow}>
        <TodayHeroIllustration />
      </View>

      <Button
        size="lg"
        variant="ghost"
        onPress={onCapture}
        style={styles.cta}
        rightAccessory={<Feather name="arrow-right" size={16} color={colors.brand.peach} />}
      >
        Capture moment
      </Button>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 32,
    backgroundColor: colors.brand.peach,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    overflow: "hidden",
    minHeight: 280,
    ...shadows.purple,
  },
  blobTop: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.16)",
    top: -70,
    right: -50,
  },
  blobBottom: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.1)",
    bottom: -40,
    left: -30,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  topCopy: { flex: 1, paddingRight: spacing.md },
  eyebrow: {
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  week: {
    color: colors.text.inverse,
  },
  prompt: {
    color: colors.text.inverse,
    lineHeight: 36,
    maxWidth: "92%",
  },
  support: {
    color: "rgba(255,255,255,0.82)",
    marginBottom: spacing.sm,
  },
  illustrationRow: {
    alignItems: "flex-end",
    marginTop: -spacing.md,
  },
  cta: {
    marginTop: spacing.sm,
    alignSelf: "stretch",
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.card,
  },
});
