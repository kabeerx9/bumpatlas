import { StyleSheet, View } from "react-native";

import { colors, radius } from "@/design-system";

type BabyIllustrationProps = {
  variant: "boy" | "girl";
};

/** Flat illustration placeholders — no emoji, closer to UI kit card art. */
export function BabyIllustration({ variant }: BabyIllustrationProps) {
  const isBoy = variant === "boy";

  return (
    <View style={styles.stage}>
      <View style={styles.ground} />
      <View style={[styles.shadow, isBoy ? styles.shadowBoy : styles.shadowGirl]} />

      {isBoy ? (
        <>
          <View style={styles.boyBody} />
          <View style={styles.boyArmLeft} />
          <View style={styles.boyArmRight} />
          <View style={styles.head} />
          <View style={styles.boyHair} />
        </>
      ) : (
        <>
          <View style={styles.girlDress} />
          <View style={styles.girlArmLeft} />
          <View style={styles.girlArmRight} />
          <View style={styles.head} />
          <View style={styles.girlHair} />
          <View style={styles.girlBow} />
        </>
      )}
    </View>
  );
}

const skin = "#F4C4B0";
const hairBoy = "#6B5348";
const hairGirl = "#8B5E4B";

const styles = StyleSheet.create({
  stage: {
    width: 120,
    height: 130,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  ground: {
    position: "absolute",
    bottom: 0,
    width: 96,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: "rgba(44,36,32,0.06)",
  },
  shadow: {
    position: "absolute",
    bottom: 8,
    width: 72,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: "rgba(44,36,32,0.05)",
  },
  shadowBoy: { left: 18 },
  shadowGirl: { right: 18 },
  head: {
    position: "absolute",
    top: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: skin,
    zIndex: 3,
  },
  boyHair: {
    position: "absolute",
    top: 14,
    width: 56,
    height: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: hairBoy,
    zIndex: 2,
  },
  girlHair: {
    position: "absolute",
    top: 10,
    width: 62,
    height: 34,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: hairGirl,
    zIndex: 2,
  },
  girlBow: {
    position: "absolute",
    top: 8,
    right: 22,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand.peach,
    zIndex: 4,
  },
  boyBody: {
    position: "absolute",
    bottom: 16,
    width: 58,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.brand.sage,
    zIndex: 1,
  },
  boyArmLeft: {
    position: "absolute",
    bottom: 38,
    left: 16,
    width: 14,
    height: 28,
    borderRadius: 8,
    backgroundColor: skin,
    transform: [{ rotate: "-18deg" }],
    zIndex: 2,
  },
  boyArmRight: {
    position: "absolute",
    bottom: 38,
    right: 16,
    width: 14,
    height: 28,
    borderRadius: 8,
    backgroundColor: skin,
    transform: [{ rotate: "18deg" }],
    zIndex: 2,
  },
  girlDress: {
    position: "absolute",
    bottom: 12,
    width: 64,
    height: 62,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: colors.brand.peachSoft,
    borderWidth: 2,
    borderColor: colors.brand.peach,
    zIndex: 1,
  },
  girlArmLeft: {
    position: "absolute",
    bottom: 42,
    left: 14,
    width: 12,
    height: 26,
    borderRadius: 8,
    backgroundColor: skin,
    transform: [{ rotate: "-12deg" }],
    zIndex: 2,
  },
  girlArmRight: {
    position: "absolute",
    bottom: 42,
    right: 14,
    width: 12,
    height: 26,
    borderRadius: 8,
    backgroundColor: skin,
    transform: [{ rotate: "12deg" }],
    zIndex: 2,
  },
});
