import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockRecaps } from "@/features/mock/demo-data";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

export function RecapScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recapEligible, isPremiumPreview, setPremiumPreview, childDisplayName } = useMockUi();
  const [linkCopied, setLinkCopied] = useState(false);
  const [themePreview, setThemePreview] = useState(false);

  const recap = useMemo(() => {
    if (id === "latest") return mockRecaps[0];
    return mockRecaps.find((item) => item.id === id) ?? mockRecaps[0];
  }, [id]);

  const privateWebLink = `https://bumpatlas.app/recap/${recap.id}?t=mock-private-token`;
  const premiumTheme = themePreview || isPremiumPreview;

  if (!recapEligible) {
    return (
      <SoftStackShell title="Weekly recap" closeIcon="x" onBack={() => router.back()} centered>
        <Feather name="heart" size={28} color={colors.brand.peach} />
        <AppText variant="heading" align="center">
          Keep going gently
        </AppText>
        <AppText variant="body" tone="secondary" align="center">
          Recaps unlock with ≥3 memories this week, or ≥2 story days + ≥1 wellness day. No streak
          to protect.
        </AppText>
        <Button size="lg" onPress={() => router.push(appRoutes.capture)}>
          Capture a moment
        </Button>
      </SoftStackShell>
    );
  }

  async function shareRecap() {
    const highlights = recap.highlights.map((line) => `· ${line}`).join("\n");
    await Share.share({
      message: [
        `${childDisplayName}'s week · ${recap.weekLabel}`,
        recap.title,
        "",
        highlights,
        "",
        "Shared privately from BumpAtlas · household only",
        "(Mock share card — native image export lands with real media pipeline.)",
      ].join("\n"),
      title: `${childDisplayName}'s recap card`,
    });
  }

  async function copyPrivateLink() {
    setLinkCopied(true);
    await Share.share({
      message: `Private BumpAtlas recap link (view-only, household-safe):\n${privateWebLink}`,
      title: "Copy private recap link",
    });
    Alert.alert(
      "Private link ready",
      "Share sheet opened with your view-only web link. It never posts to Connect.",
    );
  }

  return (
    <SoftStackShell
      title="Weekly recap"
      closeIcon="x"
      onBack={() => router.back()}
      footer={
        <Button size="lg" onPress={() => void shareRecap()}>
          Share recap card
        </Button>
      }
    >
      <View style={[styles.shareCard, premiumTheme && styles.shareCardPremium]}>
        <AppText variant="caption" style={styles.eyebrow}>
          {recap.weekLabel}
          {premiumTheme ? " · Premium theme" : ""}
        </AppText>
        <AppText variant="heading" tone="inverse">
          {recap.title}
        </AppText>
        <AppText variant="bodySmall" style={styles.childName}>
          {childDisplayName}&apos;s week
        </AppText>
        <View style={styles.cardArt}>
          <View style={styles.cardArtOrb} />
          <View style={[styles.cardArtOrb, styles.cardArtOrbTwo]} />
        </View>
        <View style={styles.highlights}>
          {recap.highlights.map((highlight) => (
            <View key={highlight} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <AppText variant="bodySmall" style={styles.bulletText}>
                {highlight}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" style={styles.footer}>
          BumpAtlas · household only · no birth date / location
        </AppText>
      </View>

      <View style={styles.themeCard}>
        <AppText weight="semibold">Premium theme preview</AppText>
        <AppText variant="bodySmall" tone="secondary">
          Soft parchment layout with a calmer type rhythm — free keeps the standard card.
        </AppText>
        <Pressable
          style={styles.copyBtn}
          onPress={() => {
            setThemePreview(true);
            setPremiumPreview(true);
          }}
          accessibilityLabel="Preview premium recap theme"
        >
          <Feather name="star" size={14} color={colors.text.inverse} />
          <AppText variant="caption" weight="semibold" tone="inverse">
            {themePreview ? "Premium theme applied" : "Preview premium theme"}
          </AppText>
        </Pressable>
        {themePreview ? (
          <Pressable
            onPress={() => router.push(appRoutes.paywall("recap"))}
            style={styles.premiumLink}
            accessibilityLabel="Unlock premium recap themes"
          >
            <AppText variant="caption" weight="semibold" style={styles.premiumText}>
              Keep this theme with Premium
            </AppText>
            <Feather name="arrow-up-right" size={14} color={colors.brand.peach} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.privacy}>
        <Feather name="lock" size={16} color={colors.brand.peach} />
        <AppText variant="bodySmall" tone="secondary" style={styles.privacyCopy}>
          Share cards omit exact birth date, location, and health details by default. Household-only
          — never auto-posts to Connect.
        </AppText>
      </View>

      <View style={styles.linkCard}>
        <AppText weight="semibold">Private web link</AppText>
        <AppText variant="bodySmall" tone="secondary">
          Share a view-only link for grandparents or your partner. Companion web surface stays
          privacy-safe.
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {privateWebLink}
        </AppText>
        <Pressable
          style={styles.copyBtn}
          onPress={() => void copyPrivateLink()}
          accessibilityLabel="Copy private web link"
        >
          <Feather name="link" size={14} color={colors.text.inverse} />
          <AppText variant="caption" weight="semibold" tone="inverse">
            {linkCopied ? "Link shared" : "Copy / share private link"}
          </AppText>
        </Pressable>
      </View>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  shareCard: {
    borderRadius: 28,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
    overflow: "hidden",
  },
  shareCardPremium: {
    backgroundColor: colors.brand.terracotta,
  },
  cardArt: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
  },
  cardArtOrb: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.18)",
    top: -40,
    right: -30,
  },
  cardArtOrbTwo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    top: 120,
    left: -20,
    right: undefined,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.78)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  childName: { color: "rgba(255,255,255,0.88)" },
  highlights: { gap: spacing.sm, marginTop: spacing.sm },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.85)",
    marginTop: 7,
  },
  bulletText: { flex: 1, color: "rgba(255,255,255,0.92)", lineHeight: 20 },
  footer: {
    color: "rgba(255,255,255,0.65)",
    marginTop: spacing.md,
    letterSpacing: 0.4,
  },
  privacy: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.peachSoft,
  },
  privacyCopy: { flex: 1, lineHeight: 20 },
  linkCard: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  themeCard: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  copyBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand.peach,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  premiumLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 44,
  },
  premiumText: { color: colors.brand.peach },
});
