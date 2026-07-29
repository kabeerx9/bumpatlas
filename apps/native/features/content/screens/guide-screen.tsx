import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, colors, spacing } from "@/design-system";
import { SoftHeader } from "@/features/shared/components/soft-header";
import { SoftPanel } from "@/features/shared/components/soft-panel";
import { SoftScreen } from "@/features/shared/components/soft-screen";
import { mockGuides, mockToday } from "@/features/mock/demo-data";
import { useContentQuery } from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

export function GuideScreen() {
  const router = useRouter();
  const contentQuery = useContentQuery();
  const guides =
    contentQuery.data?.items.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      readMinutes: item.readingMinutes,
      bookmarked: item.bookmarked,
    })) ??
    mockGuides.map((guide) => ({
      id: guide.id,
      slug: guide.slug,
      title: guide.title,
      summary: guide.summary,
      readMinutes: guide.readMinutes ?? 4,
      bookmarked: false,
    }));
  const featured = guides[0];
  const featuredBookmarked = featured?.bookmarked ?? false;

  return (
    <SoftScreen>
      <SoftHeader
        eyebrow="Guide"
        title="Learn what matters now"
        subtitle="Short reviewed tips for this stage. Ask the assistant for a nudge — not a diagnosis."
      />

      <SoftPanel tinted style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <View style={styles.aiIcon}>
            <Feather name="message-circle" size={18} color={colors.brand.peach} />
          </View>
          <View style={styles.aiCopy}>
            <AppText weight="semibold" tone="inverse">
              Ask BumpAtlas
            </AppText>
            <AppText variant="bodySmall" style={styles.aiMeta}>
              Prompts, recaps, and reviewed tips. Educational only.
            </AppText>
          </View>
        </View>
        <Button
          variant="ghost"
          size="lg"
          onPress={() => router.push(appRoutes.assistant)}
          style={styles.aiCta}
        >
          Open assistant
        </Button>
      </SoftPanel>

      <Pressable
        onPress={() =>
          featured ? router.push(appRoutes.guideArticle(featured.id)) : undefined
        }
        disabled={!featured}
      >
        <SoftPanel>
          <View style={styles.featuredTop}>
            <AppText variant="caption" style={styles.peachLabel}>
              Featured for this stage
            </AppText>
            {featuredBookmarked ? (
              <View style={styles.savedChip}>
                <Feather name="bookmark" size={12} color={colors.text.inverse} />
                <AppText variant="caption" weight="semibold" tone="inverse">
                  Saved
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText weight="semibold">{featured?.title ?? mockToday.learnCard.title}</AppText>
          <AppText variant="bodySmall" tone="secondary">
            {featured?.summary ?? mockToday.learnCard.detail}
          </AppText>
          <View style={styles.featuredLink}>
            <AppText variant="caption" weight="semibold" style={styles.peachLabel}>
              Read tip
            </AppText>
            <Feather name="arrow-up-right" size={14} color={colors.brand.peach} />
          </View>
        </SoftPanel>
      </Pressable>

      <AppText weight="semibold">Browse tips</AppText>

      {guides.map((guide) => {
        const saved = guide.bookmarked;
        return (
          <Pressable
            key={guide.id}
            onPress={() => router.push(appRoutes.guideArticle(guide.id))}
            accessibilityLabel={`${guide.title}${saved ? ", bookmarked" : ""}`}
          >
            <SoftPanel style={styles.guideRow}>
              <View style={styles.guideIcon}>
                <Feather name="book-open" size={16} color={colors.brand.peach} />
              </View>
              <View style={styles.guideCopy}>
                <AppText variant="caption" style={styles.peachLabel}>
                  {guide.readMinutes} min
                </AppText>
                <AppText weight="semibold">{guide.title}</AppText>
              </View>
              {saved ? (
                <Feather name="bookmark" size={18} color={colors.brand.peach} />
              ) : (
                <Feather name="chevron-right" size={18} color={colors.text.muted} />
              )}
            </SoftPanel>
          </Pressable>
        );
      })}
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  aiCard: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  aiHeader: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
  },
  aiCopy: {
    flex: 1,
    gap: 2,
  },
  aiMeta: {
    color: "rgba(255,255,255,0.82)",
  },
  aiCta: {
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.card,
  },
  peachLabel: {
    color: colors.brand.peach,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  featuredTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  savedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brand.peach,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minHeight: 28,
  },
  guideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  guideIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  guideCopy: {
    flex: 1,
    gap: 2,
  },
  featuredLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
});
