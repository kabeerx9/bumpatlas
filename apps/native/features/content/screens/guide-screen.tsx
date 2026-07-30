import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AppText,
  CardStack,
  IconButton,
  Pill,
  borderWidth,
  colors,
  radius,
  shadows,
  spacing,
  useAppTheme,
} from "@/design-system";
import { mockGuides } from "@/features/mock/demo-data";
import { useContentQuery } from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

const heroImages = [
  "https://images.unsplash.com/photo-1546015720-b8b30df5aa27",
  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4",
  "https://images.unsplash.com/photo-1519689680058-324335c77eba",
  "https://images.unsplash.com/photo-1457342813143-a1ae27448a82",
];

const pastelCycle = [colors.pastel.petal, colors.pastel.mint, colors.pastel.lemon, colors.pastel.sky];

function hashId(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 997;
  }
  return Math.abs(hash);
}

function heroImageForId(id: string) {
  return `${heroImages[hashId(id) % heroImages.length]}?w=1200&q=80`;
}

function formatCategory(raw: string) {
  return raw
    .split("-")
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

type GuideCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  readMinutes: number;
  bookmarked: boolean;
  category: string;
};

export function GuideScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const contentQuery = useContentQuery();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const guides: GuideCard[] = useMemo(
    () =>
      contentQuery.data?.items.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        readMinutes: item.readingMinutes,
        bookmarked: item.bookmarked ?? false,
        category: item.stageTags?.[0] ? formatCategory(item.stageTags[0]) : "General",
      })) ??
      mockGuides.map((guide) => ({
        id: guide.id,
        slug: guide.slug,
        title: guide.title,
        summary: guide.summary,
        readMinutes: guide.readMinutes ?? 4,
        bookmarked: false,
        category: guide.category ?? "General",
      })),
    [contentQuery.data],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    guides.forEach((guide) => {
      counts.set(guide.category, (counts.get(guide.category) ?? 0) + 1);
    });
    return Array.from(counts.entries());
  }, [guides]);

  const filteredGuides = selectedCategory
    ? guides.filter((guide) => guide.category === selectedCategory)
    : guides;
  const featured = filteredGuides[0];
  const rest = filteredGuides.slice(1);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <AppText variant="heading" weight="semibold">
          Guide
        </AppText>
        <View style={styles.headerActions}>
          <IconButton
            accessibilityLabel="Ask BumpAtlas about this stage"
            onPress={() => router.push(appRoutes.assistant)}
          >
            <Feather name="message-circle" size={18} color={theme.colors.text} />
          </IconButton>
          <IconButton
            accessibilityLabel="About the Guide tab"
            onPress={() =>
              Alert.alert(
                "Ask BumpAtlas",
                "Prompts, recaps, and reviewed tips. Educational only — not medical advice.",
              )
            }
          >
            <Feather name="info" size={18} color={theme.colors.text} />
          </IconButton>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <Pressable
          onPress={() => setSelectedCategory(null)}
          accessibilityRole="button"
          accessibilityLabel={`All topics, ${guides.length}`}
        >
          <Pill tone={selectedCategory === null ? "selected" : "neutral"}>
            All {guides.length}
          </Pill>
        </Pressable>
        {categoryCounts.map(([category, count]) => (
          <Pressable
            key={category}
            onPress={() => setSelectedCategory(category)}
            accessibilityRole="button"
            accessibilityLabel={`${category}, ${count}`}
          >
            <Pill tone={selectedCategory === category ? "selected" : "neutral"}>
              {category} {count}
            </Pill>
          </Pressable>
        ))}
      </ScrollView>

      {featured ? (
        <Pressable
          onPress={() => router.push(appRoutes.guideArticle(featured.id))}
          accessibilityRole="button"
          accessibilityLabel={`Read ${featured.title}${featured.bookmarked ? ", bookmarked" : ""}`}
        >
          <CardStack radiusSize="xl">
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.heroImageWrap}>
                <Image source={{ uri: heroImageForId(featured.id) }} style={styles.heroImage} />
                <View style={[styles.timePill, { backgroundColor: theme.colors.surface }]}>
                  <Feather name="clock" size={12} color={theme.colors.text} />
                  <AppText variant="label" weight="semibold">
                    {featured.readMinutes} min
                  </AppText>
                </View>
              </View>

              <View
                style={[
                  styles.playBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.background,
                  },
                ]}
              >
                <Feather name="play" size={20} color={theme.colors.primaryText} />
              </View>

              <View style={styles.heroBody}>
                {featured.bookmarked ? (
                  <View style={styles.savedRow}>
                    <Feather name="bookmark" size={12} color={theme.colors.brandText} />
                    <AppText variant="label" tone="brand" weight="semibold">
                      Saved
                    </AppText>
                  </View>
                ) : null}
                <AppText variant="title" weight="semibold" style={styles.heroTitle}>
                  {featured.title}
                </AppText>
                <AppText variant="bodySmall" tone="secondary" numberOfLines={2}>
                  {featured.summary}
                </AppText>
              </View>
            </View>
          </CardStack>
        </Pressable>
      ) : null}

      {rest.length ? (
        <>
          <View style={styles.sectionHeader}>
            <AppText variant="title" weight="semibold">
              More to read
            </AppText>
            <AppText variant="bodySmall" tone="secondary">
              {rest.length} articles
            </AppText>
          </View>

          <View style={styles.grid}>
            {rest.map((guide, index) => (
              <Pressable
                key={guide.id}
                style={styles.gridItem}
                onPress={() => router.push(appRoutes.guideArticle(guide.id))}
                accessibilityRole="button"
                accessibilityLabel={`${guide.title}${guide.bookmarked ? ", bookmarked" : ""}`}
              >
                <View
                  style={[
                    styles.smallCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryChip,
                      { backgroundColor: pastelCycle[index % pastelCycle.length] },
                    ]}
                  >
                    <AppText variant="label" style={styles.categoryChipText}>
                      {guide.category}
                    </AppText>
                  </View>
                  <AppText weight="semibold" numberOfLines={2} style={styles.smallTitle}>
                    {guide.title}
                  </AppText>
                  <View style={styles.smallFooter}>
                    <AppText variant="caption" tone="secondary">
                      {guide.readMinutes} min
                    </AppText>
                    {guide.bookmarked ? (
                      <Feather name="bookmark" size={14} color={theme.colors.brandText} />
                    ) : (
                      <Feather name="chevron-right" size={14} color={theme.colors.textMuted} />
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: 140,
    gap: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingRight: spacing.page,
  },
  heroCard: {
    borderRadius: radius.xl,
    borderWidth: borderWidth.hairline,
    overflow: "visible",
    ...shadows.card,
  },
  heroImageWrap: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: "hidden",
    height: 200,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  timePill: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    ...shadows.soft,
  },
  playBtn: {
    position: "absolute",
    right: spacing.lg,
    top: 200 - 26,
    width: 52,
    height: 52,
    borderRadius: radius.full,
    borderWidth: borderWidth.emphasis,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  heroBody: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  heroTitle: {
    paddingRight: spacing.xxl,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  gridItem: {
    width: "48%",
  },
  smallCard: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.hairline,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft,
  },
  categoryChip: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  categoryChipText: {
    color: colors.brand.ink,
  },
  smallTitle: {
    minHeight: 40,
  },
  smallFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
