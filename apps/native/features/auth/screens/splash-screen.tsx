import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { AppText, Atmosphere, BrandWordmark, colors, spacing } from "@/design-system";

export function SplashScreen() {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <Atmosphere variant="cream">
      <View style={styles.body}>
        <Animated.View style={[styles.center, { opacity: fade }]}>
          <BrandWordmark size="xl" markOnly style={styles.mark} />
          <AppText variant="heading" align="center" style={styles.title}>
            BumpAtlas
          </AppText>
          <AppText variant="label" tone="secondary" align="center">
            The early days, cherished
          </AppText>
        </Animated.View>
      </View>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  body: {
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
