import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Atmosphere, AppText, BrandWordmark, colors, spacing } from "@/design-system";
import { useRespectReduceMotion } from "@/features/shared/hooks/use-respect-reduce-motion";

export function SplashScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const { reduceMotion } = useRespectReduceMotion();

  useEffect(() => {
    if (reduceMotion.current) {
      fade.setValue(1);
      return;
    }
    Animated.timing(fade, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fade, reduceMotion]);

  return (
    <Atmosphere variant="cream">
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Animated.View style={[styles.center, { opacity: fade }]}>
          <BrandWordmark size="xl" markOnly style={styles.mark} />
          <AppText variant="heading" weight="semibold" align="center" style={styles.title}>
            BumpAtlas
          </AppText>
          <AppText variant="label" tone="secondary" align="center">
            The early days, cherished
          </AppText>
        </Animated.View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  center: {
    alignItems: "center",
    gap: spacing.md,
  },
  mark: {
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.brand.ink,
  },
});
