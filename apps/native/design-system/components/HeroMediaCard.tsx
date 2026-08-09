import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { useAppTheme } from "@/design-system/theme";
import { colors, radius, spacing } from "@/design-system/tokens";

type HeroMediaCardProps = {
  uri?: string | null;
  title?: string;
  /** Frosted white pill, top-left. Status or count. */
  badge?: string;
  /** Honey pill, bottom-right. A single value. */
  metric?: string;
  height?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Rendered centred over the image when there is no `uri`. */
  placeholder?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Full-width media card with floating overlays — the top block of the Home
 * screen. Overlays sit ON the image, so every one of them is a solid pill
 * rather than bare text: bare white text over an arbitrary photo is a
 * contrast lottery.
 */
export function HeroMediaCard({
  uri,
  title,
  badge,
  metric,
  height = 190,
  onPress,
  accessibilityLabel,
  placeholder,
  style,
}: HeroMediaCardProps) {
  const theme = useAppTheme();
  const Container = onPress ? Pressable : View;

  return (
    <Container
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={[styles.card, { height, backgroundColor: theme.colors.surfaceMuted }, style]}
    >
      {uri ? (
        <Image source={{ uri }} accessibilityIgnoresInvertColors style={styles.image} />
      ) : (
        <View style={styles.placeholder}>{placeholder}</View>
      )}

      {badge ? (
        <View style={[styles.pill, styles.badge]}>
          <AppText variant="label" weight="bold" style={styles.badgeText}>
            {badge}
          </AppText>
        </View>
      ) : null}

      {title ? (
        <AppText variant="subhead" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
      ) : null}

      {metric ? (
        <View style={[styles.pill, styles.metric, { backgroundColor: theme.colors.secondary }]}>
          <AppText variant="label" weight="bold" style={styles.badgeText}>
            {metric}
          </AppText>
        </View>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    position: "absolute",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  badge: {
    top: spacing.md,
    left: spacing.md,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  metric: {
    bottom: spacing.md,
    right: spacing.md,
  },
  badgeText: {
    color: colors.brand.ink,
    letterSpacing: 0,
    textTransform: "none",
  },
  title: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    right: 90,
    color: colors.text.inverse,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
