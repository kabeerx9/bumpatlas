import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Atmosphere, BrandWordmark, Button, spacing } from "@/design-system";
import { IntroIllustration } from "@/features/onboarding/components/intro-illustration";

type IntroStepProps = {
  onContinue: () => void;
  onSkip: () => void;
};

export function IntroStep({ onContinue, onSkip }: IntroStepProps) {
  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <IntroIllustration />

          <View style={styles.copy}>
            <BrandWordmark size="md" markOnly style={styles.logo} />
            <AppText variant="heading" align="center">
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
    backgroundColor: "#E59B8A",
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
