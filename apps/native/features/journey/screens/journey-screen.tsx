import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import {
  AppText,
  Button,
  CardStack,
  IconButton,
  Pill,
  Screen,
  Surface,
  colors,
  radius,
  spacing,
  useAppTheme,
} from "@/design-system";
import { mockMilestones, mockRecaps } from "@/features/mock/demo-data";
import { mockOnThisDay } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { useMemoriesQuery } from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

type Filter = "all" | "memories" | "milestones" | "recaps";

const PAGE_SIZE = 2;
const STATUS_LABEL: Record<string, string> = {
  NOT_OBSERVED: "Not observed",
  EMERGING: "Emerging",
  OBSERVED: "Observed",
  SKIPPED: "Skipped",
};

export function JourneyScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const {
    showEmptyJourney,
    journalQuery,
    setJournalQuery,
    isPremiumPreview,
    milestoneStatuses,
    recapEligible,
    childDisplayName,
  } = useMockUi();
  const memoriesQuery = useMemoriesQuery();
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const memories = useMemo(() => {
    const items = memoriesQuery.data?.items;
    if (!items) return [];
    return items.map((memory) => ({
      id: memory.id,
      dateLabel: memory.eventDate,
      title: memory.title,
      body: memory.body,
      author: memory.authorName,
      visibility: memory.visibility,
    }));
  }, [memoriesQuery.data?.items]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, journalQuery]);

  const showMemories = filter === "all" || filter === "memories";
  const showMilestones = filter === "all" || filter === "milestones";
  const showRecaps = filter === "all" || filter === "recaps";

  const filteredMemories = useMemo(() => {
    const q = journalQuery.trim().toLowerCase();
    if (!q) return memories;
    if (!isPremiumPreview) return memories;
    return memories.filter(
      (memory) =>
        memory.title.toLowerCase().includes(q) || memory.body.toLowerCase().includes(q),
    );
  }, [journalQuery, isPremiumPreview, memories]);

  const visibleMemories = useMemo(
    () => filteredMemories.slice(0, visibleCount),
    [filteredMemories, visibleCount],
  );

  const hasMore =
    visibleCount < filteredMemories.length && (filter === "all" || filter === "memories");

  const recapsCount = recapEligible ? mockRecaps.length : 0;
  const totalCount = memories.length + mockMilestones.length + recapsCount;

  const FILTERS: Array<{ id: Filter; label: string; count: number }> = [
    { id: "all", label: "All", count: totalCount },
    { id: "memories", label: "Memories", count: memories.length },
    { id: "milestones", label: "Milestones", count: mockMilestones.length },
    { id: "recaps", label: "Recaps", count: recapsCount },
  ];

  function loadMore() {
    if (!hasMore) return;
    setVisibleCount((count) => count + PAGE_SIZE);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
    if (nearBottom) loadMore();
  }

  const headerRow = (
    <View style={styles.headerRow}>
      <View style={styles.headerCopy}>
        <AppText variant="caption" tone="brand" weight="semibold" style={styles.eyebrow}>
          Journey
        </AppText>
        <AppText variant="heading">{childDisplayName}&apos;s story</AppText>
        <AppText variant="body" tone="secondary">
          A private timeline of moments, milestones, and recaps — household only.
        </AppText>
      </View>
      <IconButton
        tone="mint"
        accessibilityLabel="Capture moment"
        onPress={() => router.push(appRoutes.capture)}
      >
        <Feather name="plus" size={18} color={theme.colors.primaryText} />
      </IconButton>
    </View>
  );

  if (memoriesQuery.isLoading) {
    return (
      <Screen contentStyle={styles.screenContent}>
        {headerRow}
        <Surface style={styles.loadingCard}>
          <AppText tone="secondary">Loading your timeline…</AppText>
        </Surface>
      </Screen>
    );
  }

  if (showEmptyJourney || memories.length === 0) {
    return (
      <Screen contentStyle={styles.screenContent}>
        {headerRow}
        <Surface tone="lavender" style={styles.empty} radiusSize="xl">
          <Feather name="book-open" size={28} color={theme.colors.accentText} />
          <AppText weight="semibold">Start {childDisplayName}&apos;s first page</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Capture one small moment — a photo or a short note is enough.
          </AppText>
          <Button onPress={() => router.push(appRoutes.capture)}>Capture moment</Button>
        </Surface>
      </Screen>
    );
  }

  const featuredMemory = visibleMemories[0];
  const restMemories = visibleMemories.slice(1);

  return (
    <Screen padded={false} contentStyle={styles.screenFlex}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {headerRow}

        <Surface style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={theme.colors.textMuted} />
            <TextInput
              value={journalQuery}
              onChangeText={setJournalQuery}
              placeholder={isPremiumPreview ? "Search your journal…" : "Journal search · Premium"}
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.searchInput, { color: theme.colors.text }]}
              editable={isPremiumPreview}
              accessibilityLabel="Search journal"
            />
          </View>
          {!isPremiumPreview ? (
            <Pressable
              onPress={() => router.push(appRoutes.paywall("search"))}
              style={styles.searchUnlock}
              accessibilityLabel="Unlock journal search"
            >
              <AppText variant="caption" weight="semibold" tone="brand">
                Unlock advanced journal search
              </AppText>
              <Feather name="arrow-up-right" size={14} color={theme.colors.brandText} />
            </Pressable>
          ) : null}
        </Surface>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Pill tone={active ? "selected" : "neutral"}>
                  {item.label} {item.count}
                </Pill>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => router.push(appRoutes.badges)}
            accessibilityLabel="Open badges"
          >
            <Pill tone="neutral" leadingDot={false}>
              Badges
            </Pill>
          </Pressable>
        </ScrollView>

        {isPremiumPreview ? (
          <Pressable onPress={() => router.push(appRoutes.memory("2"))}>
            <Surface tone="lavender" style={styles.onThisDay}>
              <AppText variant="caption" tone="brand" weight="semibold">
                On this day · Premium · {mockOnThisDay.dateLabel}
              </AppText>
              <AppText weight="semibold">{mockOnThisDay.title}</AppText>
              <AppText variant="bodySmall" tone="secondary">
                {mockOnThisDay.body}
              </AppText>
            </Surface>
          </Pressable>
        ) : (
          <Surface tone="lavender" style={styles.onThisDay}>
            <AppText variant="caption" tone="brand" weight="semibold">
              On this day · Premium
            </AppText>
            <AppText weight="semibold">Resurface a moment from 30+ days ago</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Free keeps your full journal private timeline. Premium unlocks “on this day” cards.
            </AppText>
            <Pressable
              onPress={() => router.push(appRoutes.paywall("on-this-day"))}
              style={styles.searchUnlock}
              accessibilityLabel="Unlock on this day"
            >
              <AppText variant="caption" weight="semibold" tone="brand">
                Unlock on this day
              </AppText>
              <Feather name="arrow-up-right" size={14} color={theme.colors.brandText} />
            </Pressable>
          </Surface>
        )}

        {showRecaps ? (
          <View style={styles.section}>
            <AppText weight="semibold">Weekly recaps</AppText>
            {!recapEligible ? (
              <Surface style={styles.gapCard}>
                <AppText weight="semibold">Not quite ready</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Recaps unlock with ≥3 memories this week, or ≥2 story days + ≥1 wellness day.
                  Keep going gently — no streak to protect.
                </AppText>
                <Button size="sm" onPress={() => router.push(appRoutes.capture)}>
                  Capture a moment
                </Button>
              </Surface>
            ) : (
              mockRecaps.map((recap) => (
                <Pressable key={recap.id} onPress={() => router.push(appRoutes.recap(recap.id))}>
                  <Surface style={styles.gapCard}>
                    <AppText variant="caption" tone="brand" weight="semibold">
                      {recap.weekLabel}
                    </AppText>
                    <AppText weight="semibold">{recap.title}</AppText>
                    <AppText variant="bodySmall" tone="secondary">
                      {recap.summary}
                    </AppText>
                  </Surface>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {showMilestones ? (
          <View style={styles.section}>
            <AppText weight="semibold">Milestones</AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.milestoneRow}
            >
              {mockMilestones.map((item, index) => {
                const status =
                  milestoneStatuses[item.id] ?? item.status.toUpperCase().replace(" ", "_");
                const pastelChip = PASTEL_CHIPS[index % PASTEL_CHIPS.length];
                return (
                  <Pressable key={item.id} onPress={() => router.push(appRoutes.milestone(item.id))}>
                    <Surface style={styles.milestoneCard} radiusSize="lg">
                      <View style={[styles.iconChip, { backgroundColor: pastelChip }]}>
                        <Feather name="star" size={16} color={theme.colors.text} />
                      </View>
                      <AppText variant="caption" tone="brand" weight="semibold">
                        {STATUS_LABEL[status] ?? item.status}
                      </AppText>
                      <AppText weight="semibold">{item.title}</AppText>
                    </Surface>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {showMemories ? (
          <View style={styles.section}>
            <AppText weight="semibold">Recent memories</AppText>

            {featuredMemory ? (
              <CardStack>
                <Pressable onPress={() => router.push(appRoutes.memory(featuredMemory.id))}>
                  <Surface style={styles.featuredCard} elevated radiusSize="xl">
                    <View style={styles.memoryTop}>
                      <View style={[styles.photo, { backgroundColor: colors.pastel.lemon }]}>
                        <Feather name="image" size={22} color={theme.colors.text} />
                      </View>
                      <View style={styles.memoryCopy}>
                        <AppText variant="caption" tone="secondary">
                          {featuredMemory.dateLabel} · {featuredMemory.author}
                        </AppText>
                        <AppText weight="semibold">{featuredMemory.title}</AppText>
                        <AppText variant="bodySmall" tone="secondary">
                          {featuredMemory.body}
                        </AppText>
                      </View>
                      <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                    </View>
                  </Surface>
                </Pressable>
              </CardStack>
            ) : null}

            {restMemories.map((memory) => (
              <Pressable key={memory.id} onPress={() => router.push(appRoutes.memory(memory.id))}>
                <Surface style={styles.memoryCard}>
                  <View style={styles.memoryTop}>
                    <View style={[styles.photo, { backgroundColor: colors.pastel.sky }]}>
                      <Feather name="image" size={20} color={theme.colors.text} />
                    </View>
                    <View style={styles.memoryCopy}>
                      <AppText variant="caption" tone="secondary">
                        {memory.dateLabel} · {memory.author}
                      </AppText>
                      <AppText weight="semibold">{memory.title}</AppText>
                      <AppText variant="bodySmall" tone="secondary">
                        {memory.body}
                      </AppText>
                    </View>
                    <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                  </View>
                </Surface>
              </Pressable>
            ))}
            {!hasMore && filteredMemories.length > 0 ? (
              <AppText variant="caption" tone="secondary" align="center">
                End of timeline
              </AppText>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const PASTEL_CHIPS = [colors.pastel.petal, colors.pastel.mint, colors.pastel.lemon, colors.pastel.sky];

const styles = StyleSheet.create({
  screenContent: { gap: spacing.lg },
  screenFlex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: 132,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerCopy: { flex: 1, gap: spacing.xs },
  eyebrow: { letterSpacing: 1, textTransform: "uppercase" },
  loadingCard: { alignItems: "center" },
  searchCard: { gap: spacing.sm },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
  },
  searchUnlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 44,
  },
  filters: { gap: spacing.sm, paddingRight: spacing.page },
  onThisDay: { gap: 4 },
  section: { gap: spacing.md },
  gapCard: { gap: spacing.sm },
  milestoneRow: { gap: spacing.md, paddingRight: spacing.page },
  milestoneCard: { width: 150, minHeight: 118, gap: spacing.xs },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  featuredCard: { padding: spacing.md },
  memoryCard: { padding: spacing.md },
  memoryTop: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  photo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryCopy: { flex: 1, gap: 4, justifyContent: "center" },
  empty: { alignItems: "flex-start", gap: spacing.sm, padding: spacing.xl },
});
