import { Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Atmosphere, BrandWordmark, Button, colors, radius, spacing } from "@/design-system";

type IntroStepProps = {
  onContinue: () => void;
  onSkip: () => void;
};

const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=1200&q=80";

export function IntroStep({ onContinue, onSkip }: IntroStepProps) {
  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <Image source={{ uri: HERO_IMAGE_URL }} style={styles.hero} accessibilityLabel="Baby on a pool float" />

          <View style={styles.copy}>
            <BrandWordmark size="md" markOnly style={styles.logo} />
            <AppText variant="heading" weight="semibold" align="center">
              Smart guidance at every step
            </AppText>
            <AppText variant="body" tone="secondary" align="center" style={styles.subtitle}>
              Capture memories, get gentle tips, and keep your family close — calmly.
            </AppText>
          </View>

          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable onPress={onSkip} hitSlop={12}>
            <AppText tone="secondary">Skip</AppText>
          </Pressable>
          <Button size="lg" onPress={onContinue} style={styles.cta}>
            Continue →
          </Button>
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.xl,
    justifyContent: "center",
    gap: spacing.xl,
  },
  logo: { alignSelf: "center" },
  copy: { gap: spacing.md, alignItems: "center" },
  subtitle: { maxWidth: 300, lineHeight: 24 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(44,36,32,0.15)",
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.brand.honey,
  },
  hero: {
    width: "100%",
    height: 220,
    borderRadius: radius.xl,
  },
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cta: { minWidth: 168 },
});
