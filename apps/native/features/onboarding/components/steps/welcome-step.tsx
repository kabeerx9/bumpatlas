import { Pressable, StyleSheet, View } from "react-native";

import { AppText, BrandWordmark, colors, radius, spacing } from "@/design-system";
import { IntroIllustration } from "@/features/onboarding/components/intro-illustration";

type WelcomeStepProps = {
  attested: boolean;
  onToggleAttestation: () => void;
};

export function WelcomeStep({ attested, onToggleAttestation }: WelcomeStepProps) {
  return (
    <View style={styles.block}>
      <IntroIllustration />
      <View style={styles.copy}>
        <BrandWordmark size="md" markOnly style={styles.logo} />
        <AppText variant="heading" align="center">
          Welcome to BumpAtlas
        </AppText>
        <AppText variant="body" tone="secondary" align="center" style={styles.lead}>
          A calm companion for pregnancy and early parenting — memories, wellness, and
          stage-aware tips in one place.
        </AppText>
      </View>

      <Pressable
        onPress={onToggleAttestation}
        style={styles.attestRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: attested }}
      >
        <View style={[styles.checkbox, attested && styles.checkboxChecked]}>
          {attested ? (
            <AppText variant="caption" tone="inverse">
              ✓
            </AppText>
          ) : null}
        </View>
        <AppText variant="bodySmall" style={styles.attestCopy}>
          I confirm I am 18 or older. BumpAtlas is designed for adult caregivers only.
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.xl,
    alignItems: "center",
  },
  logo: { alignSelf: "center" },
  copy: { gap: spacing.md, alignItems: "center" },
  lead: { maxWidth: 320, lineHeight: 24 },
  attestRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    width: "100%",
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.brand.peach,
    borderColor: colors.brand.peach,
  },
  attestCopy: {
    flex: 1,
    lineHeight: 20,
  },
});
