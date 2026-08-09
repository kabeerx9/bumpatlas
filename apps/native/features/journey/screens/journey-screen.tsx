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
  ChipRow,
  IconButton,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedToggle,
  Surface,
  Timeline,
  colors,
  layout,
  radius,
  shadows,
  spacing,
  useAppTheme,
} from "@/design-system";
import type { TimelineEntry } from "@/design-system";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import { formatShortDate } from "@/features/shared/lib/format-date";
import {
  useCurrentRecapQuery,
  useEntitlementsQuery,
  useFamilyQuery,
  useMemoriesQuery,
  useMilestonesQuery,
} from "@/lib/api/hooks";
import { FEATURES } from "@/lib/features";
import { appRoutes } from "@/navigation/routes";

type Filter = "all" | "memories" | "milestones" | "recaps";

const PAGE_SIZE = 6;
const STATUS_LABEL: Record<string, string> = {
  not_observed: "Not observed",
  emerging: "Emerging",
  observed: "Observed",
  skipped: "Skipped",
};
const PASTEL_CHIPS = [colors.pastel.petal, colors.pastel.mint, colors.pastel.lemon, colors.pastel.sky];

/** Sentinel subject id for the pregnancy track in the subject toggle. */
const PREGNANCY_SUBJECT = "__pregnancy__";

export function JourneyScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { journalQuery, setJournalQuery } = useAppState();
  const memoriesQuery = useMemoriesQuery();
  const familyQuery = useFamilyQuery();
  const milestonesQuery = useMilestonesQuery();
  const recapQuery = useCurrentRecapQuery();
  const entitlementsQuery = useEntitlementsQuery();
  const childDisplayName = familyQuery.data?.childDisplayName ?? "your child";
  const isPremium = entitlementsQuery.data?.isPremium ?? false;
  const recapEligible = recapQuery.data?.eligible ?? false;
  const milestoneDefinitions = useMemo(
    () => milestonesQuery.data?.definitions ?? [],
    [milestonesQuery.data?.definitions],
  );
  const milestoneObservations = useMemo(
    () => milestonesQuery.data?.observations ?? [],
    [milestonesQuery.data?.observations],
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const rawMemories = useMemo(() => memoriesQuery.data?.items ?? [], [memoriesQuery.data?.items]);

  /**
   * The design's Pregnancy / child toggle, driven by real household shape
   * rather than a hardcoded pair: one segment per child, plus a pregnancy
   * segment when one is active. With a single subject there is nothing to
   * switch between, so the toggle doesn't render at all.
   */
  const subjects = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    if (familyQuery.data?.dueDate) {
      list.push({ value: PREGNANCY_SUBJECT, label: "Pregnancy" });
    }
    for (const child of familyQuery.data?.children ?? []) {
      list.push({ value: child.id, label: child.displayName });
    }
    return list;
  }, [familyQuery.data?.children, familyQuery.data?.dueDate]);

  const [subject, setSubject] = useState<string | null>(null);
  const activeSubject = subject ?? subjects[0]?.value ?? null;

  const subjectMemories = useMemo(() => {
    if (!activeSubject || subjects.length < 2) return rawMemories;
    if (activeSubject === PREGNANCY_SUBJECT) {
      return rawMemories.filter((memory) => memory.pregnancyId !== null);
    }
    return rawMemories.filter((memory) => memory.childId === activeSubject);
  }, [activeSubject, rawMemories, subjects.length]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, journalQuery, activeSubject]);

  const showMemories = filter === "all" || filter === "memories";
  const showMilestones = filter === "all" || filter === "milestones";
  const showRecaps = filter === "all" || filter === "recaps";

  const filteredMemories = useMemo(() => {
    const q = journalQuery.trim().toLowerCase();
    if (!q || !isPremium) return subjectMemories;
    return subjectMemories.filter(
      (memory) =>
        memory.title.toLowerCase().includes(q) || memory.body.toLowerCase().includes(q),
    );
  }, [journalQuery, isPremium, subjectMemories]);

  const timelineEntries: TimelineEntry[] = useMemo(
    () =>
      filteredMemories.slice(0, visibleCount).map((memory) => ({
        id: memory.id,
        date: `${formatShortDate(memory.eventDate)} · ${memory.authorName}`,
        title: memory.title,
        description: memory.body,
        onPress: () => router.push(appRoutes.memory(memory.id)),
      })),
    [filteredMemories, router, visibleCount],
  );

  const hasMore =
    visibleCount < filteredMemories.length && (filter === "all" || filter === "memories");

  const recapsCount = recapEligible && recapQuery.data ? 1 : 0;
  const totalCount = subjectMemories.length + milestoneDefinitions.length + recapsCount;

  const filterChips = [
    { value: "all" as const, label: `All ${totalCount}` },
    { value: "memories" as const, label: `Memories ${subjectMemories.length}` },
    { value: "milestones" as const, label: `Milestones ${milestoneDefinitions.length}` },
    { value: "recaps" as const, label: `Recaps ${recapsCount}` },
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

  const header = (
    <ScreenHeader
      title="Milestones"
      subtitle={`Every step of ${childDisplayName}'s story, saved.`}
      action={
        <IconButton
          accessibilityLabel="Capture moment"
          size={40}
          onPress={() => router.push(appRoutes.capture)}
        >
          <Feather name="plus" size={18} color={theme.colors.text} />
        </IconButton>
      }
    />
  );

  if (memoriesQuery.isLoading) {
    return (
      <Screen contentStyle={styles.screenContent}>
        {header}
        <Surface tone="card" radiusSize="lg" elevated bordered={false} style={styles.loadingCard}>
          <AppText tone="secondary">Loading your timeline…</AppText>
        </Surface>
      </Screen>
    );
  }

  if (rawMemories.length === 0) {
    return (
      <Screen contentStyle={styles.screenContent}>
        {header}
        <Surface tone="lavender" style={styles.empty} radiusSize="xl" bordered={false}>
          <Feather name="book-open" size={28} color={theme.colors.accentText} />
          <AppText weight="semibold">Start {childDisplayName}&apos;s first page</AppText>
          <AppText variant="bodySmall" tone="secondary">
            {FEATURES.photos
              ? "Capture one small moment — a photo or a short note is enough."
              : "Capture one small moment — a short note is enough."}
          </AppText>
          <Button onPress={() => router.push(appRoutes.capture)}>Capture moment</Button>
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen padded={false} contentStyle={styles.screenFlex}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.gutter}>{header}</View>

        {subjects.length > 1 ? (
          <View style={styles.gutter}>
            <SegmentedToggle
              segments={subjects}
              value={activeSubject ?? subjects[0]!.value}
              onChange={setSubject}
            />
          </View>
        ) : null}

        <View style={styles.gutter}>
          <View style={[styles.searchCard, shadows.soft, { backgroundColor: theme.colors.surface }]}>
            <Feather name="search" size={16} color={theme.colors.textMuted} />
            <TextInput
              value={journalQuery}
              onChangeText={setJournalQuery}
              placeholder={isPremium ? "Search your journal…" : "Journal search · Premium"}
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.searchInput, { color: theme.colors.text }]}
              editable={isPremium}
              accessibilityLabel="Search journal"
            />
            {!isPremium ? (
              <Pressable
                onPress={() => router.push(appRoutes.paywall("search"))}
                hitSlop={8}
                accessibilityLabel="Unlock journal search"
              >
                <Feather name="arrow-up-right" size={16} color={theme.colors.brandText} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <ChipRow chips={filterChips} value={filter} onChange={setFilter} />

        {/*
          "On this day" resurfacing has no real content source yet — there is
          no server endpoint that picks a past memory for a given date. Rather
          than fake a memory (the old mock branch navigated to a hardcoded
          id), this always renders the upsell card until that ships.
        */}
        <View style={styles.gutter}>
          <Surface tone="lavender" radiusSize="lg" bordered={false} style={styles.gapCard}>
            <AppText variant="label" style={styles.honeyLabel}>
              On this day · Premium
            </AppText>
            <AppText weight="semibold">Resurface a moment from 30+ days ago</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Free keeps your full private timeline. Premium unlocks “on this day” cards.
            </AppText>
            <Pressable
              onPress={() => router.push(appRoutes.paywall("on-this-day"))}
              accessibilityRole="button"
              accessibilityLabel="Unlock on this day"
              style={styles.inlineLink}
            >
              <AppText variant="caption" weight="bold" style={styles.honeyLabel}>
                Unlock on this day
              </AppText>
              <Feather name="arrow-up-right" size={13} color={colors.brand.honeyDeep} />
            </Pressable>
          </Surface>
        </View>

        {showRecaps ? (
          <View style={styles.gutter}>
            <SectionHeader title="Weekly recaps" />
            {!recapEligible ? (
              <Surface tone="card" radiusSize="lg" elevated bordered={false} style={styles.gapCard}>
                <AppText weight="semibold">Not quite ready</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Recaps unlock with ≥3 memories this week, or ≥2 story days + ≥1 wellness day.
                  Keep going gently — no streak to protect.
                </AppText>
                <Button size="sm" onPress={() => router.push(appRoutes.capture)}>
                  Capture a moment
                </Button>
              </Surface>
            ) : recapQuery.data ? (
              <View style={styles.stackSm}>
                <Pressable onPress={() => router.push(appRoutes.recap(recapQuery.data.id))}>
                  <Surface tone="card" radiusSize="lg" elevated bordered={false} style={styles.gapCard}>
                    <AppText variant="label" style={styles.honeyLabel}>
                      {recapQuery.data.weekLabel}
                    </AppText>
                    <AppText weight="semibold">{recapQuery.data.title}</AppText>
                    <AppText variant="bodySmall" tone="secondary">
                      {recapQuery.data.highlights.join(" · ")}
                    </AppText>
                  </Surface>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {showMilestones ? (
          <View>
            <View style={styles.gutter}>
              <SectionHeader
                title="Milestones"
                actionLabel="Badges"
                onActionPress={() => router.push(appRoutes.badges)}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.milestoneRow}
            >
              {milestoneDefinitions.map((item, index) => {
                const status =
                  milestoneObservations.find((observation) => observation.definitionId === item.id)
                    ?.status ?? "not_observed";
                const pastelChip = PASTEL_CHIPS[index % PASTEL_CHIPS.length];
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={item.title}
                    onPress={() => router.push(appRoutes.milestone(item.id))}
                    style={[styles.milestoneCard, shadows.soft, { backgroundColor: theme.colors.surface }]}
                  >
                    <View style={[styles.iconChip, { backgroundColor: pastelChip }]}>
                      <Feather name="star" size={16} color={theme.colors.text} />
                    </View>
                    <AppText variant="label" style={styles.honeyLabel}>
                      {STATUS_LABEL[status] ?? status}
                    </AppText>
                    <AppText variant="bodySmall" weight="bold">
                      {item.title}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {showMemories ? (
          <View style={styles.gutter}>
            <SectionHeader title="Timeline" />
            <Timeline
              entries={timelineEntries}
              footer={
                !hasMore && timelineEntries.length > 0 ? (
                  <AppText variant="caption" tone="muted" align="center" style={styles.endNote}>
                    End of timeline
                  </AppText>
                ) : null
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { gap: spacing.lg },
  screenFlex: { flex: 1 },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: layout.tabBarScrollPadding,
    gap: spacing.xl - 4,
  },
  /** Sections sit inside the gutter; chip and card rows bleed past it. */
  gutter: { paddingHorizontal: spacing.page },
  stackSm: { gap: spacing.sm },
  loadingCard: { alignItems: "center" },
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  gapCard: { gap: spacing.sm },
  inlineLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
    minHeight: 32,
  },
  honeyLabel: { color: colors.brand.honeyDeep },
  milestoneRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.page,
  },
  milestoneCard: {
    width: 150,
    minHeight: 122,
    gap: spacing.xs,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  endNote: { marginTop: spacing.lg },
  empty: { alignItems: "flex-start", gap: spacing.sm, padding: spacing.xl },
});
