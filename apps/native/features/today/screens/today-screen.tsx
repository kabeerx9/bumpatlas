import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText, Screen, Surface, colors, radius, shadows, spacing, useAppTheme } from "@/design-system";
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
import { ageBucketFromDob, ageBucketLabel, approximateAgeLabel } from "@/features/shared/lib/age-bucket";
import { CaptureHeroCard } from "@/features/today/components/capture-hero-card";
import { ConnectBanner } from "@/features/today/components/connect-banner";
import { InvitePartnerBanner } from "@/features/today/components/invite-partner-banner";
import { MemoryPreviewCard } from "@/features/today/components/memory-preview-card";
import { TodayActionTile } from "@/features/today/components/today-action-tile";
import { TodayProfileBar } from "@/features/today/components/today-profile-bar";
import {
  queryKeys,
  useFamilyQuery,
  useGroupsQuery,
  useMemoriesQuery,
  useTodayQuery,
} from "@/lib/api/hooks";
import { queryClient } from "@/lib/queryClient";
import { appRoutes } from "@/navigation/routes";

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
  const childDisplayName =
    familyQuery.data?.childDisplayName ?? "your child";
  const resolvedStage = familyQuery.data?.stageMode ?? stageMode;
  const memoryCount = memoriesQuery.data?.items.length ?? 0;
  const journeyMemories = (memoriesQuery.data?.items ?? []).map((memory) => ({
    id: memory.id,
    title: memory.title,
    body: memory.body,
  }));
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
  const latestMemory = memoriesQuery.data?.items[0];
  const fade = useRef(new Animated.Value(0)).current;
  const { reduceMotion } = useRespectReduceMotion();
  const stageUnknown = resolvedStage === "unknown";
  const pregnancyWeek = gestationalWeekFromDueDate(
    familyQuery.data?.dueDate ?? mockPregnancy.dueDate,
  );
  const pregnancyLabel = pregnancyWeekLabel(pregnancyWeek);
  const childBucket = ageBucketFromDob(mockProfile.dob);
  const childStageLabel = `${approximateAgeLabel(mockProfile.dob)} · ${ageBucketLabel(childBucket)}`;

  const onThisDayMemory = journeyMemories.find((m) => m.title === mockOnThisDay.title);

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
        <Animated.View style={{ opacity: fade }}>
          <TodayProfileBar
            displayName={childDisplayName}
            stageLabel={
              stageUnknown
                ? "Finish setup"
                : resolvedStage === "pregnancy"
                  ? pregnancyLabel
                  : childStageLabel
            }
            onSettingsPress={() => router.push(appRoutes.family)}
          />
        </Animated.View>

        <AppText variant="caption" tone="secondary" style={styles.welcomeStrip}>
          Welcome back — your week still counts. No streak to protect.
        </AppText>

        {stageUnknown ? (
          <Surface tone="card" radiusSize="xl" style={styles.unknownCard}>
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

        {resolvedStage === "pregnancy" ? (
          <Pressable onPress={() => router.push(appRoutes.pregnancy)}>
            <Surface tone="card" radiusSize="xl" style={styles.pregnancyCard}>
              <AppText variant="caption" weight="semibold" style={styles.honeyLabel}>
                {mockPregnancy.trimester}
              </AppText>
              <AppText variant="title">{pregnancyLabel}</AppText>
              <AppText variant="bodySmall" tone="secondary">
                {mockPregnancy.weeklyTip.title}
              </AppText>
              <View style={styles.rowCta}>
                <AppText variant="caption" weight="semibold" style={styles.honeyLabel}>
                  Open pregnancy journal
                </AppText>
                <Feather name="arrow-right" size={14} color={colors.brand.honeyDeep} />
              </View>
            </Surface>
          </Pressable>
        ) : null}

        <CaptureHeroCard
          babyName={childDisplayName}
          prompt={prompt}
          activeDays={progress.activeDays}
          goal={progress.goal}
          emphasized={primaryGoal === "memories"}
          onCapture={() => router.push(appRoutes.capture)}
        />

        <Surface tone="card" radiusSize="xl" style={styles.progressSplit}>
          <AppText variant="caption" weight="semibold" style={styles.honeyLabel}>
            Soft week · {progress.activeDays} of {progress.goal}
          </AppText>
          <AppText variant="bodySmall" tone="secondary">
            Story days {storyDays}/{progress.goal} · Wellness days{" "}
            {wellnessDays}/{progress.goal} · either counts as a calm day
          </AppText>
          {primaryGoal ? (
            <AppText variant="caption" weight="semibold" style={styles.honeyLabel}>
              Your focus · {primaryGoal}
            </AppText>
          ) : null}
        </Surface>

        <View style={styles.quickLinks}>
          <Pressable
            onPress={() => router.push(appRoutes.wellnessPacks)}
            accessibilityRole="button"
            accessibilityLabel="Open wellness packs"
            style={[styles.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Feather name="heart" size={13} color={colors.brand.honeyDeep} />
            <AppText variant="caption" weight="semibold" style={styles.chipText}>
              Wellness packs
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => router.push(appRoutes.badges)}
            accessibilityRole="button"
            accessibilityLabel="Open badges"
            style={[styles.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Feather name="award" size={13} color={colors.brand.honeyDeep} />
            <AppText variant="caption" weight="semibold" style={styles.chipText}>
              Badges
            </AppText>
          </Pressable>
        </View>

        <View style={styles.sectionHead}>
          <AppText variant="subhead" weight="semibold">
            Keep going gently
          </AppText>
          <AppText variant="bodySmall" tone="secondary">
            Care · Learn · Connect — a few calm minutes
          </AppText>
        </View>

        <View
          style={[
            styles.gridRow,
            primaryGoal === "learn" && styles.gridRowReverse,
          ]}
        >
          <TodayActionTile
            icon="wind"
            label="Care"
            title={
              resolvedStage === "pregnancy"
                ? mockToday.pregnancyWellnessAction.title
                : mockToday.wellnessAction.title
            }
            detail={
              resolvedStage === "pregnancy"
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
            title={
              resolvedStage === "pregnancy"
                ? mockPregnancy.weeklyTip.title
                : mockToday.learnCard.title
            }
            detail="Stage tip"
            done={loop.learn}
            emphasized={primaryGoal === "learn"}
            onPress={() => {
              markLearnDone();
              router.push(
                appRoutes.guideArticle(
                  resolvedStage === "pregnancy" ? mockPregnancy.weeklyTip.id : mockToday.learnCard.id,
                ),
              );
            }}
          />
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

        {loop.connect ? (
          <AppText variant="caption" tone="secondary">
            Connect touched today · counts toward your calm week
          </AppText>
        ) : null}

        {memoryCount >= 3 && !inviteCtaDismissed && connectTodayMode !== "alone" ? (
          <Surface tone="card" radiusSize="xl" style={styles.inviteCta}>
            <View style={styles.inviteCtaCopy}>
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
            <Surface tone="card" radiusSize="xl" style={styles.onThisDay}>
              <AppText variant="caption" weight="semibold" style={styles.honeyLabel}>
                On this day · Premium · {mockOnThisDay.dateLabel}
              </AppText>
              <AppText weight="semibold">{mockOnThisDay.title}</AppText>
              <AppText variant="bodySmall" tone="secondary">
                {mockOnThisDay.body}
              </AppText>
            </Surface>
          </Pressable>
        ) : (
          <Surface tone="card" radiusSize="xl" style={styles.onThisDay}>
            <AppText variant="caption" weight="semibold" style={styles.honeyLabel}>
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
              <AppText variant="caption" weight="semibold" style={styles.honeyLabel}>
                Unlock with Premium
              </AppText>
              <Feather name="arrow-up-right" size={14} color={colors.brand.honeyDeep} />
            </Pressable>
          </Surface>
        )}

        {latestMemory ? (
          <MemoryPreviewCard
            title={latestMemory.title}
            dateLabel={latestMemory.eventDate}
            onPress={() => router.push(appRoutes.memory(latestMemory.id))}
          />
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
    paddingTop: spacing.lg,
    paddingBottom: 132,
    gap: spacing.lg,
  },
  welcomeStrip: {
    marginTop: -spacing.sm,
  },
  unknownCard: { gap: spacing.sm },
  pillButton: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  progressSplit: { gap: 4 },
  pregnancyCard: { gap: spacing.sm },
  rowCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
  },
  honeyLabel: {
    color: colors.brand.honeyDeep,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  quickLinks: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    color: colors.brand.honeyDeep,
  },
  sectionHead: {
    gap: 4,
    marginTop: spacing.xs,
  },
  gridRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  gridRowReverse: {
    flexDirection: "row-reverse",
  },
  inviteCta: { gap: spacing.md },
  inviteCtaCopy: { gap: 4 },
  inviteCtaActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  onThisDay: { gap: 4 },
  fab: {
    position: "absolute",
    right: spacing.page,
    bottom: 132,
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
