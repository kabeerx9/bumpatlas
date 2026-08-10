import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { AppText, colors, radius, spacing } from "@/design-system";
import { appRoutes } from "@/navigation/routes";

type PrivacyStepProps = {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  onToggleTerms: () => void;
  onTogglePrivacy: () => void;
};

const SUMMARY = [
  "Memories stay private to your household by default.",
  "You control sharing, export, and deletion from Family.",
];

export function PrivacyStep({
  termsAccepted,
  privacyAccepted,
  onToggleTerms,
  onTogglePrivacy,
}: PrivacyStepProps) {
  const router = useRouter();

  return (
    <View style={styles.block}>
      <AppText variant="heading">Your privacy, in plain language</AppText>
      <AppText variant="body" tone="secondary" style={styles.lead}>
        Your memories are private by default. Terms and Privacy are required to continue.
      </AppText>

      <View style={styles.summaryCard}>
        {SUMMARY.map((line) => (
          <AppText key={line} variant="bodySmall" tone="secondary">
            · {line}
          </AppText>
        ))}
      </View>

      <Pressable
        onPress={onToggleTerms}
        style={styles.acceptRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: termsAccepted }}
      >
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted ? (
            <AppText variant="caption" style={styles.checkMark}>
              ✓
            </AppText>
          ) : null}
        </View>
        <View style={styles.acceptCopy}>
          <AppText variant="bodySmall">I agree to the Terms of Service</AppText>
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              router.push(appRoutes.legal("terms"));
            }}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Open Terms of Service"
          >
            <AppText variant="caption" weight="semibold" style={styles.link}>
              Read Terms
            </AppText>
          </Pressable>
        </View>
      </Pressable>

      <Pressable
        onPress={onTogglePrivacy}
        style={styles.acceptRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: privacyAccepted }}
      >
        <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
          {privacyAccepted ? (
            <AppText variant="caption" style={styles.checkMark}>
              ✓
            </AppText>
          ) : null}
        </View>
        <View style={styles.acceptCopy}>
          <AppText variant="bodySmall">I agree to the Privacy Policy</AppText>
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              router.push(appRoutes.legal("privacy"));
            }}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Open Privacy Policy"
          >
            <AppText variant="caption" weight="semibold" style={styles.link}>
              Read Privacy Policy
            </AppText>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  lead: { maxWidth: 340, lineHeight: 21 },
  summaryCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.honeySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  acceptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.brand.honeyDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.brand.honey,
    borderColor: colors.brand.honey,
  },
  checkMark: {
    color: colors.brand.ink,
  },
  acceptCopy: {
    flex: 1,
    gap: 4,
  },
  link: {
    color: colors.text.link,
  },
});
