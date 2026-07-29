import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockProfile, mockRecaps } from "@/features/mock/demo-data";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { appRoutes } from "@/navigation/routes";

export function RecapScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recapEligible, isPremiumPreview, setPremiumPreview } = useMockUi();
  const [linkCopied, setLinkCopied] = useState(false);
  const [themePreview, setThemePreview] = useState(false);

  const recap = useMemo(() => {
    if (id === "latest") return mockRecaps[0];
    return mockRecaps.find((item) => item.id === id) ?? mockRecaps[0];
  }, [id]);

  const privateWebLink = `https://bumpatlas.app/recap/${recap.id}?t=mock-private-token`;

  if (!recapEligible) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.iconBtn}
              accessibilityLabel="Close recap"
            >
              <Feather name="x" size={20} color={colors.brand.ink} />
            </Pressable>
            <AppText weight="semibold">Weekly recap</AppText>
            <View style={styles.iconBtn} />
          </View>
          <View style={styles.ineligible}>
            <Feather name="heart" size={28} color={colors.brand.peach} />
            <AppText variant="heading" align="center">
              Keep going gently
            </AppText>
            <AppText variant="body" tone="secondary" align="center">
              Recaps unlock with ≥3 memories this week, or ≥2 story days + ≥1 wellness day. No
              streak to protect.
            </AppText>
            <Button size="lg" onPress={() => router.push(appRoutes.capture)}>
              Capture a moment
            </Button>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  async function shareRecap() {
    const highlights = recap.highlights.join(" · ");
    await Share.share({
      message: `${recap.title} — ${recap.summary}. ${highlights}. Shared privately from BumpAtlas.`,
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
    <View style={styles.root}>
      <View style={styles.atmosphere} pointerEvents="none">
        <View style={styles.blob} />
      </View>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            accessibilityLabel="Close recap"
          >
            <Feather name="x" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Weekly recap</AppText>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.shareCard}>
            <AppText variant="caption" style={styles.eyebrow}>
              {recap.weekLabel}
              {themePreview || isPremiumPreview ? " · Premium theme" : ""}
            </AppText>
            <AppText variant="heading" tone="inverse">
              {recap.title}
            </AppText>
            <AppText variant="bodySmall" style={styles.childName}>
              {mockProfile.displayName}&apos;s week
            </AppText>
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
              BumpAtlas · household only
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
              Share cards omit exact birth date, location, and health details by default.
              Household-only — never auto-posts to Connect.
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

          <Pressable
            style={styles.premiumLink}
            onPress={() => router.push(appRoutes.paywall("recap"))}
            accessibilityLabel="Preview premium recap theme"
          >
            <AppText variant="caption" weight="semibold" style={styles.premiumText}>
              Preview premium recap theme
            </AppText>
            <Feather name="arrow-up-right" size={14} color={colors.brand.peach} />
          </Pressable>
        </ScrollView>

        <View style={styles.footerBar}>
          <Button size="lg" onPress={() => void shareRecap()}>
            Share recap card
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8EDE6" },
  atmosphere: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  blob: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(229,155,138,0.24)",
    top: -80,
    right: -60,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: spacing.page,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  shareCard: {
    borderRadius: 28,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
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
  footerBar: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  ineligible: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.page,
    gap: spacing.md,
  },
});
