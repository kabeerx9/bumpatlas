import { Image, Pressable, StyleSheet, View } from "react-native";

import { AppText, CardStack, colors, radius, spacing } from "@/design-system";

type WelcomeStepProps = {
  attested: boolean;
  onToggleAttestation: () => void;
};

const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=1200&q=80";

export function WelcomeStep({ attested, onToggleAttestation }: WelcomeStepProps) {
  return (
    <View style={styles.block}>
      <CardStack radiusSize="xl" style={styles.stack}>
        <Image source={{ uri: HERO_IMAGE_URL }} style={styles.hero} accessibilityLabel="Baby in a soft onesie" />
      </CardStack>

      <View style={styles.copy}>
        <AppText variant="hero" weight="semibold" align="center">
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
            <AppText variant="caption" style={styles.checkMark}>
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
  stack: {
    width: "100%",
    maxWidth: 280,
  },
  hero: {
    width: "100%",
    height: 200,
    borderRadius: radius.xl,
  },
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
    borderColor: colors.brand.honeyDeep,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.brand.honey,
    borderColor: colors.brand.honey,
  },
  checkMark: {
    color: colors.brand.ink,
  },
  attestCopy: {
    flex: 1,
    lineHeight: 20,
  },
});
