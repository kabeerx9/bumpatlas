import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockRecaps } from "@/features/mock/demo-data";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useMockData } from "@/lib/api/client";
import { useCurrentRecapQuery, useEntitlementsQuery, useFamilyQuery } from "@/lib/api/hooks";
import { createRecapShareLink } from "@/lib/api/recaps";
import { shareViewAsImage } from "@/lib/share/share-view-as-image";
import { appRoutes } from "@/navigation/routes";

export function RecapScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recapQuery = useCurrentRecapQuery();
  const entitlementsQuery = useEntitlementsQuery();
  const familyQuery = useFamilyQuery();
  const [linkCopied, setLinkCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  const isPremium = entitlementsQuery.data?.isPremium ?? false;
  const eligible = recapQuery.data?.eligible ?? false;
  const displayName =
    recapQuery.data?.childDisplayName ?? familyQuery.data?.childDisplayName ?? "your little one";

  const recap = useMemo(() => {
    if (recapQuery.data && (id === "latest" || id === recapQuery.data.id)) {
      return recapQuery.data;
    }
    if (id === "latest") return mockRecaps[0];
    return mockRecaps.find((item) => item.id === id) ?? mockRecaps[0];
  }, [id, recapQuery.data]);

  const [privateWebLink, setPrivateWebLink] = useState(
    `https://bumpatlas.app/recap/${recap.id}?t=mock-private-token`,
  );

  if (!eligible) {
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
    if (sharing) return;
    setSharing(true);
    const highlights = recap.highlights.map((line) => `· ${line}`).join("\n");
    const textFallback = [
      `${displayName}'s week · ${recap.weekLabel}`,
      recap.title,
      "",
      highlights,
      "",
      "Shared privately from BumpAtlas · household only",
    ].join("\n");

    try {
      await shareViewAsImage({
        viewRef: cardRef,
        textFallback,
        filename: `bumpatlas-recap-${recap.id}.png`,
      });
    } finally {
      setSharing(false);
    }
  }

  async function copyPrivateLink() {
    setLinkCopied(true);
    let link = privateWebLink;
    if (!useMockData) {
      try {
        const created = await createRecapShareLink();
        link = created.url;
        setPrivateWebLink(created.url);
      } catch {
        // Keep local link if API is unavailable mid-transition.
      }
    }

    await Share.share({
      message: `Private BumpAtlas recap link (view-only, household-safe):\n${link}`,
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
        <Button size="lg" disabled={sharing} onPress={() => void shareRecap()}>
          {sharing ? "Preparing card…" : "Share recap card"}
        </Button>
      }
    >
      <View
        ref={cardRef}
        collapsable={false}
        style={[styles.shareCard, isPremium && styles.shareCardPremium]}
      >
        <AppText variant="caption" style={styles.eyebrow}>
          {recap.weekLabel}
          {isPremium ? " · Premium theme" : ""}
        </AppText>
        <AppText variant="heading" tone="inverse">
          {recap.title}
        </AppText>
        <AppText variant="bodySmall" style={styles.childName}>
          {displayName}&apos;s week
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

      {!isPremium ? (
        <View style={styles.themeCard}>
          <AppText weight="semibold">Premium theme</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Soft parchment layout with a calmer type rhythm — free keeps the standard card.
          </AppText>
          <Pressable
            onPress={() => router.push(appRoutes.paywall("recap"))}
            style={styles.copyBtn}
            accessibilityLabel="Unlock premium recap theme"
          >
            <Feather name="star" size={14} color={colors.text.inverse} />
            <AppText variant="caption" weight="semibold" tone="inverse">
              Unlock with Premium
            </AppText>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.privacy}>
        <Feather name="lock" size={16} color={colors.brand.peach} />
        <AppText variant="bodySmall" tone="secondary" style={styles.privacyCopy}>
          Share cards omit exact birth date, location, and health details by default. Household-only
          — never auto-posts to Connect.
        </AppText>
      </View>

      <Pressable
        style={styles.linkBtn}
        onPress={() => void copyPrivateLink()}
        accessibilityLabel="Copy private web link"
      >
        <Feather name="link" size={14} color={colors.brand.peach} />
        <AppText variant="caption" weight="semibold" style={styles.linkText}>
          {linkCopied ? "Private link ready" : "Copy private web link"}
        </AppText>
      </Pressable>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  shareCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.ink,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: "hidden",
  },
  shareCardPremium: {
    backgroundColor: "#3d342c",
  },
  eyebrow: { color: "rgba(255,248,240,0.7)" },
  childName: { color: "rgba(255,248,240,0.85)" },
  cardArt: {
    height: 72,
    marginVertical: spacing.sm,
  },
  cardArtOrb: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(232,165,152,0.25)",
    right: -20,
    top: -30,
  },
  cardArtOrbTwo: {
    width: 80,
    height: 80,
    left: 20,
    top: 10,
    right: undefined,
    backgroundColor: "rgba(255,248,240,0.08)",
  },
  highlights: { gap: spacing.sm },
  bulletRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: colors.brand.peach,
  },
  bulletText: { flex: 1, color: "rgba(255,248,240,0.9)" },
  footer: { color: "rgba(255,248,240,0.55)", marginTop: spacing.sm },
  themeCard: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  copyBtn: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand.ink,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  privacy: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  privacyCopy: { flex: 1 },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
  },
  linkText: { color: colors.brand.peach },
});
