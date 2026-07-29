import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockPaywall } from "@/features/mock/demo-data";
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
    (source && mockPaywall.contextualHeadlines[source]) ??
    mockPaywall.contextualHeadlines.default;

  const price =
    cycle === "annual" ? mockPaywall.foundingAnnualPrice : mockPaywall.monthlyPrice;
  const priceDetail =
    cycle === "annual"
      ? `${mockPaywall.foundingLabel} · then ${mockPaywall.annualPrice}/yr`
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
        <AppText variant="heading">{price}</AppText>
        <AppText variant="bodySmall" tone="secondary">
          {priceDetail}
        </AppText>
        {!storeReady ? (
          <AppText variant="caption" tone="secondary">
            Store billing connects when EXPO_PUBLIC_REVENUECAT_API_KEY is set and the app is rebuilt.
          </AppText>
        ) : null}
      </View>

      <View style={styles.perks}>
        {mockPaywall.premiumIncludes.map((perk) => (
          <View key={perk} style={styles.perkRow}>
            <Feather name="check" size={16} color={colors.brand.peach} />
            <AppText variant="bodySmall" style={styles.perkText}>
              {perk}
            </AppText>
          </View>
        ))}
      </View>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, marginBottom: spacing.md },
  heroEyebrow: {
    color: colors.brand.peach,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: { lineHeight: 34 },
  heroCopy: { lineHeight: 22 },
  cycleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  cycleChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cycleChipActive: {
    backgroundColor: colors.brand.peachSoft,
    borderColor: colors.brand.peach,
  },
  cycleText: { color: colors.text.secondary },
  cycleTextActive: { color: colors.brand.peach },
  priceCard: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: spacing.xl,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  perks: { gap: spacing.sm },
  perkRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  perkText: { flex: 1, lineHeight: 20 },
  restoreBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  restoreCopy: { color: colors.brand.peach },
  legal: { textAlign: "center", lineHeight: 18 },
});
