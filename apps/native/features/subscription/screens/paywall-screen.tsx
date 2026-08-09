import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, Pill, borderWidth, radius, spacing, useAppTheme } from "@/design-system";
import { paywallContent } from "@/features/subscription/data/paywall-content";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useSetPremiumEntitlement } from "@/lib/api/hooks";
import {
  configurePurchases,
  getOfferingsPackages,
  previewSubscribe,
  purchasePackage,
  restorePurchases,
  type PurchasesPackage,
} from "@/lib/purchases/revenuecat";

type BillingCycle = "annual" | "monthly";

export function PaywallScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { userId } = useAuth();
  const setPremiumEntitlement = useSetPremiumEntitlement();
  const { source } = useLocalSearchParams<{ source?: string }>();

  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const [restoring, setRestoring] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [storeReady, setStoreReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ready = await configurePurchases(userId);
      if (cancelled) return;
      setStoreReady(ready);
      if (!ready) return;
      try {
        const next = await getOfferingsPackages();
        if (!cancelled) setPackages(next);
      } catch {
        if (!cancelled) setPackages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const headline =
    (source && paywallContent.contextualHeadlines[source]) ??
    paywallContent.contextualHeadlines.default;

  const price =
    cycle === "annual" ? paywallContent.foundingAnnualPrice : paywallContent.monthlyPrice;
  const priceDetail =
    cycle === "annual"
      ? `${paywallContent.foundingLabel} · then ${paywallContent.annualPrice}/yr`
      : "Cancel anytime in your store settings";

  function pickPackage(): PurchasesPackage | null {
    if (packages.length === 0) return null;
    const needle = cycle === "annual" ? "annual" : "monthly";
    return (
      packages.find((pkg) => pkg.packageType.toLowerCase().includes(needle)) ??
      packages.find((pkg) => pkg.identifier.toLowerCase().includes(needle)) ??
      packages[0]
    );
  }

  async function handleSubscribe() {
    if (subscribing) return;
    setSubscribing(true);
    try {
      const pkg = pickPackage();
      const result = pkg ? await purchasePackage(pkg) : await previewSubscribe();

      if (result.status === "cancelled") return;
      if (result.status === "unavailable" || result.status === "error") {
        Alert.alert("Purchase unavailable", result.message);
        return;
      }

      setPremiumEntitlement(result.isPremium);
      router.back();
    } finally {
      setSubscribing(false);
    }
  }

  async function handleRestore() {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.status === "success") {
        setPremiumEntitlement(result.isPremium);
        Alert.alert(
          "Purchases restored",
          result.isPremium
            ? "Premium is active on this household."
            : "No active premium found for this store account.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        return;
      }
      if (result.status === "cancelled") return;
      Alert.alert("Restore purchases", result.message);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <SoftStackShell
      title="Premium"
      closeIcon="x"
      onBack={() => router.back()}
      footer={
        <>
          <Button size="lg" disabled={subscribing} onPress={() => void handleSubscribe()}>
            {subscribing ? "Starting…" : "Start household premium"}
          </Button>
          <Pressable
            onPress={() => void handleRestore()}
            disabled={restoring}
            style={styles.restoreBtn}
            accessibilityLabel="Restore purchases"
          >
            <AppText variant="caption" weight="semibold" tone="secondary">
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
        <Pill tone="selected">Household plan</Pill>
        <AppText variant="heading" style={styles.heroTitle}>
          {headline}
        </AppText>
        <AppText variant="bodySmall" tone="secondary" style={styles.heroCopy}>
          One subscription covers everyone in your household — partners, grandparents, and
          caregivers you invite.
        </AppText>
      </View>

      <View style={styles.perks}>
        {paywallContent.premiumIncludes.map((perk) => (
          <View key={perk} style={styles.perkRow}>
            <View style={[styles.checkChip, { backgroundColor: theme.colors.secondary }]}>
              <Feather name="check" size={12} color={theme.colors.secondaryText} />
            </View>
            <AppText variant="bodySmall" style={styles.perkText}>
              {perk}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.plans}>
        <Pressable
          onPress={() => setCycle("annual")}
          accessibilityRole="button"
          accessibilityLabel="Annual plan, best value"
          style={[
            styles.planCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: cycle === "annual" ? theme.colors.secondary : theme.colors.border,
              borderWidth: cycle === "annual" ? borderWidth.emphasis : borderWidth.hairline,
            },
          ]}
        >
          <View style={styles.planHeaderRow}>
            <AppText weight="semibold">Annual</AppText>
            <Pill tone="selected">Best value</Pill>
          </View>
          <AppText variant="heading">{paywallContent.foundingAnnualPrice}</AppText>
          <AppText variant="bodySmall" tone="secondary">
            {paywallContent.foundingLabel} · then {paywallContent.annualPrice}/yr
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => setCycle("monthly")}
          accessibilityRole="button"
          accessibilityLabel="Monthly plan"
          style={[
            styles.planCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: cycle === "monthly" ? theme.colors.secondary : theme.colors.border,
              borderWidth: cycle === "monthly" ? borderWidth.emphasis : borderWidth.hairline,
            },
          ]}
        >
          <View style={styles.planHeaderRow}>
            <AppText weight="semibold">Monthly</AppText>
          </View>
          <AppText variant="heading">{paywallContent.monthlyPrice}</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Cancel anytime in your store settings
          </AppText>
        </Pressable>

        {!storeReady ? (
          <AppText variant="caption" tone="secondary" align="center">
            Store billing connects when EXPO_PUBLIC_REVENUECAT_API_KEY is set and the app is rebuilt.
          </AppText>
        ) : null}
      </View>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, marginBottom: spacing.md, alignItems: "flex-start" },
  heroTitle: { lineHeight: 34 },
  heroCopy: { lineHeight: 22 },
  perks: { gap: spacing.sm, marginBottom: spacing.lg },
  perkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  perkText: { flex: 1, lineHeight: 20 },
  checkChip: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  plans: { gap: spacing.md },
  planCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  planHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  restoreBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  legal: { textAlign: "center", lineHeight: 18 },
});
