import { StyleSheet, View } from "react-native";

import { colors, radius } from "@/design-system";

/** Soft parent + baby silhouette for the welcome step. */
export function IntroIllustration() {
  return (
    <View style={styles.wrap}>
      <View style={styles.cloudLeft} />
      <View style={styles.cloudRight} />
      <View style={styles.parentBody} />
      <View style={styles.parentHead} />
      <View style={styles.parentHair} />
      <View style={styles.babyWrap}>
        <View style={styles.babyBody} />
        <View style={styles.babyHead} />
      </View>
      <View style={styles.heart}>
        <View style={styles.heartLeft} />
        <View style={styles.heartRight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 260,
    height: 240,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  cloudLeft: {
    position: "absolute",
    top: 24,
    left: 8,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.brand.peachSoft,
    opacity: 0.85,
  },
  cloudRight: {
    position: "absolute",
    top: 48,
    right: 4,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.brand.sageSoft,
  },
  parentBody: {
    position: "absolute",
    bottom: 28,
    width: 118,
    height: 96,
    borderTopLeftRadius: 58,
    borderTopRightRadius: 58,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: colors.brand.peach,
    opacity: 0.92,
  },
  parentHead: {
    position: "absolute",
    top: 54,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F4C4B0",
  },
  parentHair: {
    position: "absolute",
    top: 48,
    width: 70,
    height: 34,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: "#6B5348",
  },
  babyWrap: {
    position: "absolute",
    bottom: 52,
    right: 54,
    alignItems: "center",
  },
  babyBody: {
    width: 52,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.brand.sage,
    marginTop: -8,
  },
  babyHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8D5C5",
    zIndex: 2,
  },
  heart: {
    position: "absolute",
    top: 36,
    right: 72,
    width: 18,
    height: 18,
  },
  heartLeft: {
    position: "absolute",
    left: 0,
    width: 9,
    height: 14,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    backgroundColor: colors.brand.terracotta,
    transform: [{ rotate: "-45deg" }],
  },
  heartRight: {
    position: "absolute",
    right: 0,
    width: 9,
    height: 14,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    backgroundColor: colors.brand.terracotta,
    transform: [{ rotate: "45deg" }],
  },
});
