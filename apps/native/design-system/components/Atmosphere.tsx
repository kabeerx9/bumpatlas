import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { colors, radius } from "@/design-system/tokens";

type AtmosphereVariant = "cream" | "soft" | "brand";

type AtmosphereProps = {
  children?: ReactNode;
  variant?: AtmosphereVariant;
  style?: StyleProp<ViewStyle>;
};

/** Soft clay-blue atmosphere blobs (no native gradient module). */
export function Atmosphere({ children, variant = "cream", style }: AtmosphereProps) {
  const base =
    variant === "brand" ? colors.brand.peachSoft : colors.surface.app;
  const subtle = variant === "cream";

  return (
    <View style={[styles.root, { backgroundColor: base }, style]}>
      {!subtle ? (
        <>
          <View style={[styles.blob, styles.blobSageTop]} />
          <View style={[styles.blob, styles.blobPeachMid]} />
          <View style={[styles.blob, styles.blobSageBottom]} />
        </>
      ) : (
        <View style={styles.blobCreamOnly} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    borderRadius: radius.full,
  },
  blobSageTop: {
    width: 260,
    height: 260,
    top: -90,
    right: -70,
    backgroundColor: colors.brand.sageSoft,
  },
  blobPeachMid: {
    width: 200,
    height: 200,
    top: 180,
    left: -80,
    backgroundColor: "rgba(106,143,168,0.16)",
  },
  blobSageBottom: {
    width: 280,
    height: 280,
    bottom: -120,
    right: -40,
    backgroundColor: "rgba(197,216,228,0.28)",
  },
  blobCreamOnly: {
    position: "absolute",
    width: 220,
    height: 220,
    top: -80,
    right: -60,
    borderRadius: radius.full,
    backgroundColor: "rgba(106,143,168,0.12)",
  },
});
