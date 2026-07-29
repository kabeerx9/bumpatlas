import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockMilestones, mockRecaps } from "@/features/mock/demo-data";
import { mockOnThisDay } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftHeader } from "@/features/shared/components/soft-header";
import { SoftPanel } from "@/features/shared/components/soft-panel";
import { SoftScreen } from "@/features/shared/components/soft-screen";
import { SoftSkeleton } from "@/features/shared/components/soft-skeleton";
import { appRoutes } from "@/navigation/routes";

type Filter = "all" | "memories" | "milestones" | "recaps";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "memories", label: "Memories" },
  { id: "milestones", label: "Milestones" },
  { id: "recaps", label: "Recaps" },
];

const PAGE_SIZE = 2;
const STATUS_LABEL: Record<string, string> = {
  NOT_OBSERVED: "Not observed",
  EMERGING: "Emerging",
  OBSERVED: "Observed",
  SKIPPED: "Skipped",
};

export function JourneyScreen() {
  const router = useRouter();
  const {
    showEmptyJourney,
    journalQuery,
    setJournalQuery,
    isPremiumPreview,
    setPremiumPreview,
    milestoneStatuses,
    recapEligible,
    childDisplayName,
    journeyMemories,
  } = useMockUi();
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, journalQuery]);

  const showMemories = filter === "all" || filter === "memories";
  const showMilestones = filter === "all" || filter === "milestones";
  const showRecaps = filter === "all" || filter === "recaps";

  const filteredMemories = useMemo(() => {
    const q = journalQuery.trim().toLowerCase();
    if (!q) return journeyMemories;
    if (!isPremiumPreview) return journeyMemories;
    return journeyMemories.filter(
      (memory) =>
        memory.title.toLowerCase().includes(q) || memory.body.toLowerCase().includes(q),
    );
  }, [journalQuery, isPremiumPreview, journeyMemories]);

  const visibleMemories = useMemo(
    () => filteredMemories.slice(0, visibleCount),
    [filteredMemories, visibleCount],
  );

  const hasMore =
    visibleCount < filteredMemories.length && (filter === "all" || filter === "memories");

  function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((count) => count + PAGE_SIZE);
      setLoadingMore(false);
    }, 500);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
    if (nearBottom) loadMore();
  }

  if (showEmptyJourney || journeyMemories.length === 0) {
    return (
      <SoftScreen>
        <SoftHeader
          eyebrow="Journey"
          title={`${childDisplayName}'s story`}
          subtitle="A private timeline of moments, milestones, and recaps — household only."
        />
        <SoftPanel style={styles.empty}>
          <Feather name="book-open" size={28} color={colors.brand.peach} />
          <AppText weight="semibold">Start {childDisplayName}&apos;s first page</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Capture one small moment — a photo or a short note is enough.
          </AppText>
          <Button onPress={() => router.push(appRoutes.capture)}>Capture moment</Button>
        </SoftPanel>
      </SoftScreen>
    );
  }

  if (initialLoading) {
    return (
      <SoftScreen>
        <SoftHeader
          eyebrow="Journey"
          title={`${childDisplayName}'s story`}
          subtitle="Loading your timeline…"
        />
        <SoftSkeleton lines={4} />
        <SoftSkeleton lines={2} />
      </SoftScreen>
    );
  }

  return (
    <SoftScreen
      scroll
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <SoftHeader
        eyebrow="Journey"
        title={`${childDisplayName}'s story`}
        subtitle="A private timeline of moments, milestones, and recaps — household only."
        right={
          <Pressable
            style={styles.captureChip}
            onPress={() => router.push(appRoutes.capture)}
            accessibilityLabel="Capture moment"
          >
            <Feather name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="caption" weight="semibold" tone="inverse">
              Capture
            </AppText>
          </Pressable>
        }
      />

      <SoftPanel style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Feather name="search" size={16} color={colors.text.muted} />
          <TextInput
            value={journalQuery}
            onChangeText={setJournalQuery}
            placeholder={
              isPremiumPreview ? "Search your journal…" : "Journal search · Premium"
            }
            placeholderTextColor={colors.text.muted}
            style={styles.searchInput}
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
            <AppText variant="caption" weight="semibold" style={styles.peachLabel}>
              Unlock advanced journal search
            </AppText>
            <Feather name="arrow-up-right" size={14} color={colors.brand.peach} />
          </Pressable>
        ) : (
          <Pressable onPress={() => setPremiumPreview(false)} hitSlop={8}>
            <AppText variant="caption" tone="secondary">
              Demo: exit premium search preview
            </AppText>
          </Pressable>
        )}
        {!isPremiumPreview ? (
          <Pressable onPress={() => setPremiumPreview(true)} hitSlop={8}>
            <AppText variant="caption" tone="secondary">
              Demo: preview premium search
            </AppText>
          </Pressable>
        ) : null}
      </SoftPanel>

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
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <AppText
                variant="caption"
                weight="semibold"
                style={active ? styles.chipTextActive : styles.chipText}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
        <Pressable
          style={styles.badgesChip}
          onPress={() => router.push(appRoutes.badges)}
          accessibilityLabel="Open badges"
        >
          <Feather name="award" size={14} color={colors.brand.peach} />
          <AppText variant="caption" weight="semibold" style={styles.peachLabel}>
            Badges
          </AppText>
        </Pressable>
      </ScrollView>

      {isPremiumPreview ? (
        <Pressable onPress={() => router.push(appRoutes.memory("2"))}>
          <SoftPanel style={styles.onThisDay}>
            <AppText variant="caption" style={styles.peachLabel}>
              On this day · Premium · {mockOnThisDay.dateLabel}
            </AppText>
            <AppText weight="semibold">{mockOnThisDay.title}</AppText>
            <AppText variant="bodySmall" tone="secondary">
              {mockOnThisDay.body}
            </AppText>
          </SoftPanel>
        </Pressable>
      ) : (
        <SoftPanel style={styles.onThisDay}>
          <AppText variant="caption" style={styles.peachLabel}>
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
            <AppText variant="caption" weight="semibold" style={styles.peachLabel}>
              Preview premium on this day
            </AppText>
            <Feather name="arrow-up-right" size={14} color={colors.brand.peach} />
          </Pressable>
        </SoftPanel>
      )}

      {showRecaps ? (
        <View style={styles.section}>
          <AppText weight="semibold">Weekly recaps</AppText>
          {!recapEligible ? (
            <SoftPanel>
              <AppText weight="semibold">Not quite ready</AppText>
              <AppText variant="bodySmall" tone="secondary">
                Recaps unlock with ≥3 memories this week, or ≥2 story days + ≥1 wellness day. Keep
                going gently — no streak to protect.
              </AppText>
              <Button size="sm" onPress={() => router.push(appRoutes.capture)}>
                Capture a moment
              </Button>
            </SoftPanel>
          ) : (
            mockRecaps.map((recap) => (
              <Pressable key={recap.id} onPress={() => router.push(appRoutes.recap(recap.id))}>
                <SoftPanel style={styles.recapCard}>
                  <AppText variant="caption" style={styles.peachLabel}>
                    {recap.weekLabel}
                  </AppText>
                  <AppText weight="semibold">{recap.title}</AppText>
                  <AppText variant="bodySmall" tone="secondary">
                    {recap.summary}
                  </AppText>
                </SoftPanel>
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
            {mockMilestones.map((item) => {
              const status = milestoneStatuses[item.id] ?? item.status.toUpperCase().replace(" ", "_");
              return (
                <Pressable key={item.id} onPress={() => router.push(appRoutes.milestone(item.id))}>
                  <SoftPanel style={styles.milestoneCard}>
                    <View style={styles.milestoneDot} />
                    <AppText variant="caption" style={styles.peachLabel}>
                      {STATUS_LABEL[status] ?? item.status}
                    </AppText>
                    <AppText weight="semibold">{item.title}</AppText>
                  </SoftPanel>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {showMemories ? (
        <View style={styles.section}>
          <AppText weight="semibold">Recent memories</AppText>
          {visibleMemories.map((memory) => (
            <Pressable key={memory.id} onPress={() => router.push(appRoutes.memory(memory.id))}>
              <SoftPanel style={styles.memoryCard}>
                <View style={styles.memoryTop}>
                  <View style={styles.photo}>
                    <Feather name="image" size={20} color={colors.brand.peach} />
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
                  <Feather name="chevron-right" size={18} color={colors.text.muted} />
                </View>
              </SoftPanel>
            </Pressable>
          ))}
          {loadingMore ? (
            <View style={styles.loadMore}>
              <ActivityIndicator color={colors.brand.peach} />
            </View>
          ) : null}
          {!hasMore && filteredMemories.length > 0 ? (
            <AppText variant="caption" tone="secondary" align="center">
              End of timeline
            </AppText>
          ) : null}
        </View>
      ) : null}
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  captureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand.peach,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
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
    color: colors.text.primary,
    fontSize: 15,
  },
  searchUnlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 44,
  },
  filters: { gap: spacing.sm },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.72)",
    minHeight: 44,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.brand.peach },
  chipText: { color: colors.brand.ink },
  chipTextActive: { color: colors.text.inverse },
  badgesChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: colors.brand.peachSoft,
    minHeight: 44,
  },
  onThisDay: { gap: 4 },
  section: { gap: spacing.md },
  milestoneRow: { gap: spacing.md, paddingRight: spacing.page },
  milestoneCard: { width: 148, minHeight: 110 },
  milestoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.peach,
    marginBottom: spacing.xs,
  },
  peachLabel: { color: colors.brand.peach },
  recapCard: { gap: 4 },
  memoryCard: { padding: spacing.md },
  memoryTop: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  photo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryCopy: { flex: 1, gap: 4, justifyContent: "center" },
  empty: { alignItems: "flex-start", gap: spacing.sm },
  loadMore: {
    alignItems: "center",
    paddingVertical: spacing.md,
    minHeight: 44,
  },
});
