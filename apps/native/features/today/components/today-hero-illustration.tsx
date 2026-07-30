import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { colors, radius } from "@/design-system";

/** Soft parent + baby mark for the Today hero — warm nursery palette only. */
export function TodayHeroIllustration() {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY }] }]}>
      <View style={styles.glow} />
      <View style={styles.parentBody} />
      <View style={styles.parentHead} />
      <View style={styles.parentHair} />
      <View style={styles.baby}>
        <View style={styles.babyBody} />
        <View style={styles.babyHead} />
      </View>
      <View style={styles.heart} />
    </Animated.View>
  );
}

const skin = "#F4C4B0";
const hair = "#6B5348";

const styles = StyleSheet.create({
  wrap: {
    width: 120,
    height: 130,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  glow: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.pastel.lemon,
    top: 8,
  },
  parentBody: {
    position: "absolute",
    bottom: 10,
    width: 72,
    height: 58,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: colors.brand.honey,
  },
  parentHead: {
    position: "absolute",
    top: 28,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: skin,
    zIndex: 2,
  },
  parentHair: {
    position: "absolute",
    top: 22,
    width: 48,
    height: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: hair,
    zIndex: 1,
  },
  baby: {
    position: "absolute",
    right: 8,
    bottom: 28,
    alignItems: "center",
    zIndex: 3,
  },
  babyBody: {
    width: 34,
    height: 30,
    borderRadius: 12,
    backgroundColor: colors.pastel.mint,
    marginTop: -6,
  },
  babyHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F8D5C5",
    zIndex: 2,
  },
  heart: {
    position: "absolute",
    top: 10,
    right: 18,
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.pastel.petal,
  },
});
