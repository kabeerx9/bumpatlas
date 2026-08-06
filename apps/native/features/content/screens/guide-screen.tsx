import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AppText,
  ChipRow,
  HeroMediaCard,
  IconButton,
  Screen,
  ScreenHeader,
  SectionHeader,
  colors,
  layout,
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
    <Screen padded={false}>
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.gutter}>
        <ScreenHeader
          title="Guide"
          subtitle="Reviewed reading for your stage."
          action={
            <View style={styles.headerActions}>
              <IconButton
                accessibilityLabel="Ask BumpAtlas about this stage"
                size={40}
                onPress={() => router.push(appRoutes.assistant)}
              >
                <Feather name="message-circle" size={16} color={theme.colors.text} />
              </IconButton>
              <IconButton
                accessibilityLabel="About the Guide tab"
                size={40}
                onPress={() =>
                  Alert.alert(
                    "Ask BumpAtlas",
                    "Prompts, recaps, and reviewed tips. Educational only — not medical advice.",
                  )
                }
              >
                <Feather name="info" size={16} color={theme.colors.text} />
              </IconButton>
            </View>
          }
        />
      </View>

      <ChipRow
        chips={[
          { value: "__all__", label: `All ${guides.length}` },
          ...categoryCounts.map(([category, count]) => ({
            value: category,
            label: `${category} ${count}`,
          })),
        ]}
        value={selectedCategory ?? "__all__"}
        onChange={(value) => setSelectedCategory(value === "__all__" ? null : value)}
      />

      {featured ? (
        <View style={styles.gutter}>
          <Pressable
            onPress={() => router.push(appRoutes.guideArticle(featured.id))}
            accessibilityRole="button"
            accessibilityLabel={`Read ${featured.title}${featured.bookmarked ? ", bookmarked" : ""}`}
          >
            <HeroMediaCard
              uri={heroImageForId(featured.id)}
              badge={`${featured.readMinutes} min read`}
              metric={featured.bookmarked ? "Saved" : undefined}
              height={200}
            />
            <View style={[styles.heroBody, shadows.soft, { backgroundColor: theme.colors.surface }]}>
              <AppText variant="title" numberOfLines={2}>
                {featured.title}
              </AppText>
              <AppText variant="bodySmall" tone="secondary" numberOfLines={2}>
                {featured.summary}
              </AppText>
            </View>
          </Pressable>
        </View>
      ) : null}

      {rest.length ? (
        <>
          <View style={styles.gutter}>
            <SectionHeader title="More to read" actionLabel={`${rest.length} articles`} />
          </View>

          <View style={[styles.gutter, styles.grid]}>
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
                    { backgroundColor: theme.colors.surface },
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: layout.tabBarScrollPadding,
    gap: spacing.xl - 4,
  },
  gutter: { paddingHorizontal: spacing.page },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroBody: {
    marginTop: -spacing.xl,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
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
