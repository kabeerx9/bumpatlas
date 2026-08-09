import { Image } from "react-native";
import type { ImageStyle, StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { colors, radius } from "@/design-system/tokens";

const pastelCycle = [
  colors.pastel.lemon,
  colors.pastel.mint,
  colors.pastel.petal,
  colors.pastel.sky,
] as const;

/** Stable pastel per person, so an avatar doesn't change colour between renders. */
export function avatarTint(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pastelCycle[hash % pastelCycle.length];
}

export function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)).toUpperCase();
}

type AvatarProps = {
  /** Photo wins when present; otherwise initials on a pastel fill. */
  uri?: string | null;
  name: string;
  size?: number;
  tint?: string;
  style?: StyleProp<ViewStyle & ImageStyle>;
};

export function Avatar({ uri, name, size = 42, tint, style }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: radius.full };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityIgnoresInvertColors
        style={[dimension, style as StyleProp<ImageStyle>]}
      />
    );
  }

  return (
    <View
      style={[styles.fallback, dimension, { backgroundColor: tint ?? avatarTint(name) }, style]}
    >
      <AppText
        variant={size >= 44 ? "bodySmall" : "caption"}
        weight="bold"
        style={styles.initials}
      >
        {initialsFrom(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.brand.ink,
  },
});
