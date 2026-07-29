import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, colors, shadows, spacing } from "@/design-system";
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

  useEffect(() => {
    Animated.spring(appear, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [appear]);

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
        <View>
          <AppText variant="caption" style={styles.eyebrow}>
            Today with {babyName}
          </AppText>
          <AppText variant="caption" weight="semibold" style={styles.week}>
            {activeDays}/{goal} calm days
          </AppText>
        </View>
        <TodayHeroIllustration />
      </View>

      <AppText variant="heading" style={styles.prompt}>
        {prompt}
      </AppText>
      <AppText variant="bodySmall" style={styles.support}>
        One photo or a short note. That’s enough.
      </AppText>

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
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
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
    maxWidth: "88%",
  },
  support: {
    color: "rgba(255,255,255,0.82)",
    marginBottom: spacing.sm,
  },
  cta: {
    marginTop: spacing.sm,
    alignSelf: "stretch",
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.card,
  },
});
