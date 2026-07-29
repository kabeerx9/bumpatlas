import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockPaywall } from "@/features/mock/demo-data";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";

type BillingCycle = "annual" | "monthly";

export function PaywallScreen() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();

  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const [restoring, setRestoring] = useState(false);

  const headline =
    (source && mockPaywall.contextualHeadlines[source]) ??
    mockPaywall.contextualHeadlines.default;

  const price =
    cycle === "annual" ? mockPaywall.foundingAnnualPrice : mockPaywall.monthlyPrice;
  const priceDetail =
    cycle === "annual"
      ? `${mockPaywall.foundingLabel} · then ${mockPaywall.annualPrice}/yr`
      : "Cancel anytime in your store settings";

  function handleSubscribe() {
    router.back();
  }

  function handleRestore() {
    setRestoring(true);
    setTimeout(() => {
      setRestoring(false);
      Alert.alert(
        "Purchases restored",
        "No active premium found in this mock. When RevenueCat is connected, entitlements restore here.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    }, 800);
  }

  return (
    <SoftStackShell
      title="Premium"
      closeIcon="x"
      onBack={() => router.back()}
      footer={
        <>
          <Button size="lg" onPress={handleSubscribe}>
            Start household premium
          </Button>
          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            style={styles.restoreBtn}
            accessibilityLabel="Restore purchases"
          >
            <AppText variant="caption" weight="semibold" style={styles.restoreCopy}>
              {restoring ? "Restoring..." : "Restore purchases"}
            </AppText>
          </Pressable>
          <AppText variant="caption" tone="secondary" style={styles.legal}>
            Billed through App Store or Google Play. Manage or cancel in store settings.
          </AppText>
        </>
      }
    >
      <View style={styles.hero}>
        <AppText variant="caption" style={styles.heroEyebrow}>
          Household plan
        </AppText>
        <AppText variant="heading" style={styles.heroTitle}>
          {headline}
        </AppText>
        <AppText variant="bodySmall" style={styles.heroCopy}>
          One subscription covers everyone in your household — partners, grandparents, and
          caregivers you invite.
        </AppText>
      </View>

      <View style={styles.cycleRow}>
        <Pressable
          onPress={() => setCycle("annual")}
          style={[styles.cycleChip, cycle === "annual" && styles.cycleChipActive]}
        >
          <AppText
            variant="caption"
            weight="semibold"
            style={cycle === "annual" ? styles.cycleTextActive : styles.cycleText}
          >
            Annual · best value
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => setCycle("monthly")}
          style={[styles.cycleChip, cycle === "monthly" && styles.cycleChipActive]}
        >
          <AppText
            variant="caption"
            weight="semibold"
            style={cycle === "monthly" ? styles.cycleTextActive : styles.cycleText}
          >
            Monthly
          </AppText>
        </Pressable>
      </View>

      <View style={styles.priceCard}>
        <AppText variant="heading" style={styles.price}>
          {price}
          <AppText variant="body" style={styles.priceSuffix}>
            {cycle === "annual" ? "/yr" : "/mo"}
          </AppText>
        </AppText>
        <AppText variant="bodySmall" tone="secondary">
          {priceDetail}
        </AppText>
        {cycle === "annual" ? (
          <View style={styles.savingsBadge}>
            <Feather name="gift" size={14} color={colors.brand.peach} />
            <AppText variant="caption" weight="semibold" style={styles.savingsCopy}>
              Save vs monthly · founding offer active
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <AppText weight="semibold">Premium includes</AppText>
        {mockPaywall.premiumIncludes.map((item) => (
          <View key={item} style={styles.listRow}>
            <Feather name="check" size={16} color={colors.brand.peach} />
            <AppText variant="bodySmall" style={styles.listCopy}>
              {item}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.freeSection}>
        <AppText weight="semibold">Free forever — always</AppText>
        <AppText variant="bodySmall" tone="secondary" style={styles.freeIntro}>
          We never paywall basic journal, invite, export, or deletion.
        </AppText>
        {mockPaywall.freeForever.map((item) => (
          <View key={item} style={styles.listRow}>
            <Feather name="heart" size={14} color={colors.text.muted} />
            <AppText variant="bodySmall" tone="secondary" style={styles.listCopy}>
              {item}
            </AppText>
          </View>
        ))}
      </View>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.text.inverse,
    lineHeight: 34,
  },
  heroCopy: {
    color: "rgba(255,255,255,0.88)",
    lineHeight: 20,
  },
  cycleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cycleChip: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.78)",
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cycleChipActive: {
    backgroundColor: colors.brand.peachSoft,
    borderWidth: 1.5,
    borderColor: colors.brand.peach,
  },
  cycleText: {
    color: colors.text.secondary,
  },
  cycleTextActive: {
    color: colors.brand.ink,
  },
  priceCard: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.xl,
    gap: spacing.xs,
    alignItems: "center",
  },
  price: {
    color: colors.brand.ink,
  },
  priceSuffix: {
    color: colors.text.secondary,
  },
  savingsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.brand.peachSoft,
  },
  savingsCopy: {
    color: colors.brand.peach,
  },
  section: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  freeSection: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.peachSoft,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  freeIntro: {
    marginBottom: spacing.xs,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  listCopy: {
    flex: 1,
    lineHeight: 20,
  },
  restoreBtn: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  restoreCopy: {
    color: colors.brand.peach,
  },
  legal: {
    textAlign: "center",
    lineHeight: 16,
  },
});
