import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  AppText,
  Avatar,
  HeroMediaCard,
  IconButton,
  ProgressRing,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatRow,
  Surface,
  colors,
  layout,
  radius,
  shadows,
  spacing,
  useAppTheme,
} from "@/design-system";
import { mockProfile, mockToday } from "@/features/mock/demo-data";
import { mockOnThisDay, mockPregnancy, mockStageGroups } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import {
  gestationalWeekFromDueDate,
  pregnancyWeekLabel,
} from "@/features/pregnancy/lib/gestational-week";
import { OfflineBanner } from "@/features/shared/components/offline-banner";
import { DraftQueuePanel } from "@/features/shared/components/draft-queue-panel";
import { useRespectReduceMotion } from "@/features/shared/hooks/use-respect-reduce-motion";
import { formatShortDate } from "@/features/shared/lib/format-date";
import { ageBucketFromDob, ageBucketLabel, approximateAgeLabel } from "@/features/shared/lib/age-bucket";
import { ConnectBanner } from "@/features/today/components/connect-banner";
import { InvitePartnerBanner } from "@/features/today/components/invite-partner-banner";
import { TodayActionTile } from "@/features/today/components/today-action-tile";
import {
  queryKeys,
  useFamilyQuery,
  useGroupsQuery,
  useMemoriesQuery,
  useTodayQuery,
} from "@/lib/api/hooks";
import { queryClient } from "@/lib/queryClient";
import { appRoutes } from "@/navigation/routes";

const FULL_TERM_WEEKS = 40;

export function TodayScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const todayQuery = useTodayQuery();
  const familyQuery = useFamilyQuery();
  const memoriesQuery = useMemoriesQuery();
  const groupsQuery = useGroupsQuery();
  const {
    isOffline,
    offlineBannerDismissed,
    dismissOfflineBanner,
    pendingDraft,
    connectTodayMode,
    stageMode,
    inviteCtaDismissed,
    dismissInviteCta,
    weekProgress,
    loopCompletion,
    storyDaysThisWeek,
    wellnessDaysThisWeek,
    markLearnDone,
    isPremiumPreview,
    activeGroupId,
    primaryGoal,
    flushDraftQueue,
  } = useMockUi();

  const today = todayQuery.data;
  const childDisplayName = familyQuery.data?.childDisplayName ?? "your child";
  const resolvedStage = familyQuery.data?.stageMode ?? stageMode;
  const memories = memoriesQuery.data?.items ?? [];
  const memoryCount = memories.length;
  const prompt =
    resolvedStage === "pregnancy"
      ? mockPregnancy.bumpPrompt
      : (today?.prompt ?? mockToday.memoryPrompt);
  const progress = today?.weekProgress ?? weekProgress;
  const loop = today?.loopCompletion ?? loopCompletion;
  const storyDays = today?.weekProgress.storyDays ?? storyDaysThisWeek;
  const wellnessDays = today?.weekProgress.wellnessDays ?? wellnessDaysThisWeek;
  const premium = today?.isPremium ?? isPremiumPreview;

  const activeGroupMock =
    mockStageGroups.find((group) => group.id === activeGroupId) ?? mockStageGroups[1];
  const activeGroupFromQuery = groupsQuery.data?.items.find((group) => group.id === activeGroupId);
  const connectPrompt = activeGroupMock?.prompt ?? mockToday.connectCard.prompt;
  const connectGroupName =
    activeGroupFromQuery?.name ?? activeGroupMock?.name ?? mockToday.connectCard.groupName;
  const connectReplyCount = Math.max(
    activeGroupMock?.posts?.length ?? 0,
    mockToday.connectCard.replyCount,
  );

  const latestMemory = memories[0];
  const fade = useRef(new Animated.Value(0)).current;
  const { reduceMotion } = useRespectReduceMotion();
  const stageUnknown = resolvedStage === "unknown";
  const isPregnancy = resolvedStage === "pregnancy";
  const dueDate = familyQuery.data?.dueDate ?? mockPregnancy.dueDate;
  const pregnancyWeek = gestationalWeekFromDueDate(dueDate);
  const pregnancyLabel = pregnancyWeekLabel(pregnancyWeek);
  const childBucket = ageBucketFromDob(mockProfile.dob);
  const childStageLabel = `${approximateAgeLabel(mockProfile.dob)} · ${ageBucketLabel(childBucket)}`;

  const onThisDayMemory = memories.find((m) => m.title === mockOnThisDay.title);

  /**
   * The design's three stat tiles. The mockup showed sensor readings (body
   * temp, heart rate) — we have no such source, so these carry the numbers
   * this app actually knows: how much is captured, where in the stage we are,
   * and how the soft week is going.
   */
  const stats = useMemo(
    () => [
      {
        icon: <Feather name="image" size={16} color={colors.brand.honeyDeep} />,
        value: String(memoryCount),
        label: memoryCount === 1 ? "Memory" : "Memories",
      },
      {
        icon: <Feather name="calendar" size={16} color={colors.brand.honeyDeep} />,
        value: isPregnancy ? `Wk ${pregnancyWeek}` : approximateAgeLabel(mockProfile.dob),
        label: isPregnancy ? "Pregnancy" : "Age",
      },
      {
        icon: <Feather name="sun" size={16} color={colors.brand.honeyDeep} />,
        value: `${progress.activeDays}/${progress.goal}`,
        label: "Calm days",
      },
    ],
    [isPregnancy, memoryCount, pregnancyWeek, progress.activeDays, progress.goal],
  );

  useEffect(() => {
    if (reduceMotion.current) {
      fade.setValue(1);
      return;
    }
    Animated.timing(fade, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    }).start();
  }, [fade, reduceMotion]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void (async () => {
      try {
        await Promise.all([
          todayQuery.refetch(),
          queryClient.invalidateQueries({ queryKey: queryKeys.memories }),
          flushDraftQueue(),
        ]);
      } finally {
        setRefreshing(false);
      }
    })();
  }, [flushDraftQueue, todayQuery]);

  return (
    <Screen padded={false} safe>
      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.honeyDeep}
          />
        }
      >
        <Animated.View style={[styles.stack, { opacity: fade }]}>
          <View style={styles.appBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open family settings"
              onPress={() => router.push(appRoutes.family)}
            >
              <Avatar name={childDisplayName} size={44} />
            </Pressable>
            <AppText variant="subhead" style={styles.flex}>
              BumpAtlas
            </AppText>
            <IconButton
              accessibilityLabel="Notification settings"
              size={40}
              onPress={() => router.push(appRoutes.notificationSettings)}
            >
              <Feather name="bell" size={16} color={theme.colors.text} />
            </IconButton>
          </View>

          <ScreenHeader
            title={childDisplayName}
            subtitle={
              stageUnknown
                ? "Finish setup to personalise your week"
                : isPregnancy
                  ? pregnancyLabel
                  : childStageLabel
            }
          />
        </Animated.View>

        {stageUnknown ? (
          <Surface tone="card" radiusSize="lg" elevated bordered={false} style={styles.gapSm}>
            <AppText weight="semibold">Finish setting up your stage</AppText>
            <AppText variant="bodySmall" tone="secondary">
              We don’t know pregnancy vs postpartum yet — complete onboarding so Care, Guide, and
              Connect can match your week.
            </AppText>
            <Pressable
              style={[styles.pillButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push(appRoutes.stageSetup)}
              accessibilityRole="button"
              accessibilityLabel="Complete stage setup"
            >
              <AppText variant="caption" weight="semibold" style={{ color: theme.colors.primaryText }}>
                Complete stage setup
              </AppText>
            </Pressable>
          </Surface>
        ) : null}

        {isOffline && !offlineBannerDismissed ? (
          <OfflineBanner
            onDismiss={dismissOfflineBanner}
            actionLabel="View draft"
            onAction={() => router.push(appRoutes.capture)}
          />
        ) : null}

        {pendingDraft ? (
          <DraftQueuePanel onOpenDraft={() => router.push(appRoutes.capture)} />
        ) : null}

        <HeroMediaCard
          uri={latestMemory?.mediaUrl ?? null}
          title={latestMemory?.title ?? "Capture today"}
          badge={pendingDraft ? "Draft waiting" : prompt.length > 34 ? "Today’s prompt" : prompt}
          metric={`${progress.activeDays}/${progress.goal} days`}
          onPress={() => router.push(appRoutes.capture)}
          accessibilityLabel="Capture a memory"
          placeholder={
            <View style={styles.heroEmpty}>
              <Feather name="camera" size={24} color={theme.colors.textTertiary} />
              <AppText variant="bodySmall" tone="tertiary" align="center">
                {prompt}
              </AppText>
            </View>
          }
        />

        <StatRow items={stats} />

        {isPregnancy ? (
          <View>
            <SectionHeader title="Pregnancy" actionLabel="Open journal" onActionPress={() => router.push(appRoutes.pregnancy)} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open pregnancy journal"
              onPress={() => router.push(appRoutes.pregnancy)}
              style={[styles.pregnancyCard, shadows.soft, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.flex}>
                <AppText variant="title">{pregnancyLabel}</AppText>
                <AppText variant="caption" tone="muted" weight="medium" style={styles.tight}>
                  {Math.max(0, FULL_TERM_WEEKS - pregnancyWeek)} weeks to go · due{" "}
                  {formatShortDate(dueDate)}
                </AppText>
              </View>
              <ProgressRing
                value={pregnancyWeek / FULL_TERM_WEEKS}
                label={`${pregnancyWeek} of ${FULL_TERM_WEEKS} weeks`}
              />
            </Pressable>
          </View>
        ) : null}

        <View>
          <SectionHeader title="Keep going gently" />
          <View style={[styles.gridRow, primaryGoal === "learn" && styles.gridRowReverse]}>
            <TodayActionTile
              icon="wind"
              label="Care"
              title={
                isPregnancy
                  ? mockToday.pregnancyWellnessAction.title
                  : mockToday.wellnessAction.title
              }
              detail={
                isPregnancy
                  ? mockToday.pregnancyWellnessAction.duration
                  : mockToday.wellnessAction.duration
              }
              done={loop.care}
              emphasized={primaryGoal === "wellness"}
              onPress={() => router.push(appRoutes.care)}
            />
            <TodayActionTile
              icon="book-open"
              label="Learn"
              title={isPregnancy ? mockPregnancy.weeklyTip.title : mockToday.learnCard.title}
              detail="Stage tip"
              done={loop.learn}
              emphasized={primaryGoal === "learn"}
              onPress={() => {
                markLearnDone();
                router.push(
                  appRoutes.guideArticle(
                    isPregnancy ? mockPregnancy.weeklyTip.id : mockToday.learnCard.id,
                  ),
                );
              }}
            />
          </View>
          <AppText variant="caption" tone="muted" weight="medium" style={styles.softNote}>
            Story days {storyDays}/{progress.goal} · Wellness days {wellnessDays}/{progress.goal} —
            either counts. No streak to protect.
          </AppText>
        </View>

        {connectTodayMode === "alone" ? (
          <InvitePartnerBanner
            childName={childDisplayName}
            onInvite={() => router.push(appRoutes.invite)}
          />
        ) : (
          <ConnectBanner
            prompt={connectPrompt}
            groupName={connectGroupName}
            replyCount={connectReplyCount}
            emphasized={primaryGoal === "connect"}
            onPress={() => router.push(appRoutes.connect)}
          />
        )}

        {memoryCount >= 3 && !inviteCtaDismissed && connectTodayMode !== "alone" ? (
          <Surface tone="card" radiusSize="lg" elevated bordered={false} style={styles.gapMd}>
            <View style={styles.gapXs}>
              <AppText weight="semibold">Invite your partner after 3 memories</AppText>
              <AppText variant="bodySmall" tone="secondary">
                Both of you can add to {childDisplayName}&apos;s story — free includes 2 adults.
              </AppText>
            </View>
            <View style={styles.inviteCtaActions}>
              <Pressable
                style={[styles.pillButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push(appRoutes.invite)}
                accessibilityRole="button"
                accessibilityLabel="Invite your partner"
              >
                <AppText variant="caption" weight="semibold" style={{ color: theme.colors.primaryText }}>
                  Invite
                </AppText>
              </Pressable>
              <Pressable
                onPress={dismissInviteCta}
                hitSlop={8}
                accessibilityLabel="Dismiss invite reminder"
              >
                <Feather name="x" size={18} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          </Surface>
        ) : null}

        {premium ? (
          <Pressable
            onPress={() =>
              router.push(onThisDayMemory ? appRoutes.memory(onThisDayMemory.id) : appRoutes.capture)
            }
          >
            <Surface tone="card" radiusSize="lg" elevated bordered={false} style={styles.gapXs}>
              <AppText variant="label" style={styles.honeyLabel}>
                On this day · {mockOnThisDay.dateLabel}
              </AppText>
              <AppText weight="semibold">{mockOnThisDay.title}</AppText>
              <AppText variant="bodySmall" tone="secondary">
                {mockOnThisDay.body}
              </AppText>
            </Surface>
          </Pressable>
        ) : (
          <Surface tone="card" radiusSize="lg" elevated bordered={false} style={styles.gapXs}>
            <AppText variant="label" style={styles.honeyLabel}>
              On this day · Premium
            </AppText>
            <AppText weight="semibold">A soft look back after 30+ days</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Free keeps your private timeline. Premium resurfaces moments from this day.
            </AppText>
            <Pressable
              onPress={() => router.push(appRoutes.paywall("on-this-day"))}
              style={styles.rowCta}
              accessibilityRole="button"
              accessibilityLabel="Unlock on this day"
            >
              <AppText variant="caption" weight="bold" style={styles.honeyText}>
                Unlock with Premium
              </AppText>
              <Feather name="arrow-up-right" size={14} color={colors.brand.honeyDeep} />
            </Pressable>
          </Surface>
        )}

        {memoryCount > 0 ? (
          <View>
            <SectionHeader
              title="Recent memories"
              actionLabel="See all"
              onActionPress={() => router.push(appRoutes.journey)}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}
            >
              {memories.slice(0, 8).map((memory) => (
                <Pressable
                  key={memory.id}
                  accessibilityRole="button"
                  accessibilityLabel={memory.title}
                  onPress={() => router.push(appRoutes.memory(memory.id))}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  {memory.mediaUrl ? (
                    <Image
                      source={{ uri: memory.mediaUrl }}
                      accessibilityIgnoresInvertColors
                      style={styles.thumb}
                    />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.colors.surface }]}>
                      <AppText variant="label" tone="muted" numberOfLines={3} style={styles.thumbText}>
                        {memory.title}
                      </AppText>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask BumpAtlas"
        onPress={() => router.push(appRoutes.assistant)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.colors.primary },
          pressed && styles.fabPressed,
        ]}
      >
        <Feather name="message-circle" size={22} color={theme.colors.primaryText} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
    paddingBottom: layout.tabBarScrollPadding,
    gap: spacing.xl - 4,
  },
  stack: {
    gap: spacing.lg,
  },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  gapXs: { gap: spacing.xs },
  gapSm: { gap: spacing.sm },
  gapMd: { gap: spacing.md },
  tight: { marginTop: 2 },
  pillButton: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  heroEmpty: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  pregnancyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  rowCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
  },
  honeyLabel: {
    color: colors.brand.honeyDeep,
  },
  honeyText: {
    color: colors.brand.honeyDeep,
  },
  gridRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  gridRowReverse: {
    flexDirection: "row-reverse",
  },
  softNote: {
    marginTop: spacing.md,
  },
  inviteCtaActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  thumbRow: {
    gap: spacing.sm + 2,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
  },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  thumbText: {
    letterSpacing: 0,
    textTransform: "none",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  fab: {
    position: "absolute",
    right: spacing.page,
    bottom: layout.tabBarScrollPadding + 4,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});
