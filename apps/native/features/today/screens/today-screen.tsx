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

import { AppText, colors, radius, spacing } from "@/design-system";
import { mockProfile, mockToday } from "@/features/mock/demo-data";
import { mockOnThisDay, mockPregnancy, mockStageGroups } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import {
  gestationalWeekFromDueDate,
  pregnancyWeekLabel,
} from "@/features/pregnancy/lib/gestational-week";
import { OfflineBanner } from "@/features/shared/components/offline-banner";
import { DraftQueuePanel } from "@/features/shared/components/draft-queue-panel";
import { SoftPanel } from "@/features/shared/components/soft-panel";
import { SoftScreen } from "@/features/shared/components/soft-screen";
import { useRespectReduceMotion } from "@/features/shared/hooks/use-respect-reduce-motion";
import { ageBucketFromDob, ageBucketLabel, approximateAgeLabel } from "@/features/shared/lib/age-bucket";
import { CaptureHeroCard } from "@/features/today/components/capture-hero-card";
import { ConnectBanner } from "@/features/today/components/connect-banner";
import { InvitePartnerBanner } from "@/features/today/components/invite-partner-banner";
import { MemoryPreviewCard } from "@/features/today/components/memory-preview-card";
import { TodayActionTile } from "@/features/today/components/today-action-tile";
import { TodayProfileBar } from "@/features/today/components/today-profile-bar";
import { appRoutes } from "@/navigation/routes";

export function TodayScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const {
    isOffline,
    offlineBannerDismissed,
    dismissOfflineBanner,
    pendingDraft,
    connectTodayMode,
    stageMode,
    memoryCount,
    inviteCtaDismissed,
    dismissInviteCta,
    weekProgress,
    loopCompletion,
    storyDaysThisWeek,
    wellnessDaysThisWeek,
    markLearnDone,
    isPremiumPreview,
    childDisplayName,
    activeGroupId,
    primaryGoal,
    journeyMemories,
  } = useMockUi();

  const activeGroup =
    mockStageGroups.find((group) => group.id === activeGroupId) ?? mockStageGroups[1];
  const connectPrompt = activeGroup?.prompt ?? mockToday.connectCard.prompt;
  const connectGroupName = activeGroup?.name ?? mockToday.connectCard.groupName;
  const connectReplyCount = Math.max(
    activeGroup?.posts?.length ?? 0,
    mockToday.connectCard.replyCount,
  );
  const fade = useRef(new Animated.Value(0)).current;
  const { reduceMotion } = useRespectReduceMotion();
  const stageUnknown = stageMode === "unknown";
  const pregnancyWeek = gestationalWeekFromDueDate(mockPregnancy.dueDate);
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
    setTimeout(() => setRefreshing(false), 700);
  }, []);

  return (
    <SoftScreen scroll={false} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.peach}
          />
        }
      >
          <Animated.View style={{ opacity: fade }}>
            <TodayProfileBar
              displayName={childDisplayName}
              stageLabel={
                stageUnknown
                  ? "Finish setup"
                  : stageMode === "pregnancy"
                    ? pregnancyLabel
                    : childStageLabel
              }
              onSettingsPress={() => router.push(appRoutes.family)}
            />
          </Animated.View>

          <View style={styles.welcomeStrip}>
            <AppText variant="caption" tone="secondary">
              Welcome back — your week still counts. No streak to protect.
            </AppText>
          </View>

          {stageUnknown ? (
            <SoftPanel style={styles.unknownCard}>
              <AppText weight="semibold">Finish setting up your stage</AppText>
              <AppText variant="bodySmall" tone="secondary">
                We don’t know pregnancy vs postpartum yet — complete onboarding so Care, Guide, and
                Connect can match your week.
              </AppText>
              <Pressable
                style={styles.unknownBtn}
                onPress={() => router.push(appRoutes.stageSetup)}
                accessibilityLabel="Complete stage setup"
              >
                <AppText variant="caption" weight="semibold" tone="inverse">
                  Complete stage setup
                </AppText>
              </Pressable>
            </SoftPanel>
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

          {stageMode === "pregnancy" ? (
            <Pressable onPress={() => router.push(appRoutes.pregnancy)}>
              <SoftPanel tinted style={styles.pregnancyCard}>
                <AppText variant="caption" style={styles.pregnancyEyebrow}>
                  {mockPregnancy.trimester}
                </AppText>
                <AppText variant="title" tone="inverse">
                  {pregnancyLabel}
                </AppText>
                <AppText variant="bodySmall" style={styles.pregnancyTip}>
                  {mockPregnancy.weeklyTip.title}
                </AppText>
                <View style={styles.pregnancyCta}>
                  <AppText variant="caption" weight="semibold" style={styles.pregnancyCtaText}>
                    Open pregnancy journal
                  </AppText>
                  <Feather name="arrow-right" size={14} color={colors.text.inverse} />
                </View>
              </SoftPanel>
            </Pressable>
          ) : null}

          <CaptureHeroCard
            babyName={childDisplayName}
            prompt={
              stageMode === "pregnancy" ? mockPregnancy.bumpPrompt : mockToday.memoryPrompt
            }
            activeDays={weekProgress.activeDays}
            goal={weekProgress.goal}
            emphasized={primaryGoal === "memories"}
            onCapture={() => router.push(appRoutes.capture)}
          />

          <SoftPanel style={styles.progressSplit}>
            <AppText variant="caption" style={styles.peachLabel}>
              Soft week · 4 of 7
            </AppText>
            <AppText variant="bodySmall" tone="secondary">
              Story days {storyDaysThisWeek}/{weekProgress.goal} · Wellness days{" "}
              {wellnessDaysThisWeek}/{weekProgress.goal} · either counts as a calm day
            </AppText>
            {primaryGoal ? (
              <AppText variant="caption" style={styles.peachLabel}>
                Your focus · {primaryGoal}
              </AppText>
            ) : null}
          </SoftPanel>

          <View style={styles.quickLinks}>
            <Pressable
              style={styles.quickChip}
              onPress={() => router.push(appRoutes.wellnessPacks)}
              accessibilityLabel="Open wellness packs"
            >
              <Feather name="heart" size={14} color={colors.brand.peach} />
              <AppText variant="caption" weight="semibold" style={styles.chipText}>
                Wellness packs
              </AppText>
            </Pressable>
            <Pressable
              style={styles.quickChip}
              onPress={() => router.push(appRoutes.badges)}
              accessibilityLabel="Open badges"
            >
              <Feather name="award" size={14} color={colors.brand.peach} />
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
                stageMode === "pregnancy"
                  ? mockToday.pregnancyWellnessAction.title
                  : mockToday.wellnessAction.title
              }
              detail={
                stageMode === "pregnancy"
                  ? mockToday.pregnancyWellnessAction.duration
                  : mockToday.wellnessAction.duration
              }
              done={loopCompletion.care}
              emphasized={primaryGoal === "wellness"}
              onPress={() => router.push(appRoutes.care)}
            />
            <TodayActionTile
              icon="book-open"
              label="Learn"
              title={
                stageMode === "pregnancy"
                  ? mockPregnancy.weeklyTip.title
                  : mockToday.learnCard.title
              }
              detail="Stage tip"
              done={loopCompletion.learn}
              emphasized={primaryGoal === "learn"}
              onPress={() => {
                markLearnDone();
                router.push(
                  appRoutes.guideArticle(
                    stageMode === "pregnancy" ? mockPregnancy.weeklyTip.id : mockToday.learnCard.id,
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

          {loopCompletion.connect ? (
            <AppText variant="caption" tone="secondary">
              Connect touched today · counts toward your calm week
            </AppText>
          ) : null}

          {memoryCount >= 3 && !inviteCtaDismissed && connectTodayMode !== "alone" ? (
            <SoftPanel style={styles.inviteCta}>
              <View style={styles.inviteCtaCopy}>
                <AppText weight="semibold">Invite your partner after 3 memories</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Both of you can add to {childDisplayName}&apos;s story — free includes 2 adults.
                </AppText>
              </View>
              <View style={styles.inviteCtaActions}>
                <Pressable style={styles.inviteBtn} onPress={() => router.push(appRoutes.invite)}>
                  <AppText variant="caption" weight="semibold" tone="inverse">
                    Invite
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={dismissInviteCta}
                  hitSlop={8}
                  accessibilityLabel="Dismiss invite reminder"
                >
                  <Feather name="x" size={18} color={colors.text.muted} />
                </Pressable>
              </View>
            </SoftPanel>
          ) : null}

          {isPremiumPreview ? (
            <Pressable
              onPress={() =>
                router.push(onThisDayMemory ? appRoutes.memory(onThisDayMemory.id) : appRoutes.capture)
              }
            >
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
              <AppText weight="semibold">A soft look back after 30+ days</AppText>
              <AppText variant="bodySmall" tone="secondary">
                Free keeps your private timeline. Premium resurfaces moments from this day.
              </AppText>
              <Pressable
                onPress={() => router.push(appRoutes.paywall("on-this-day"))}
                style={styles.pregnancyCta}
                accessibilityLabel="Unlock on this day"
              >
                <AppText variant="caption" weight="semibold" style={styles.peachLabel}>
                  Preview premium
                </AppText>
                <Feather name="arrow-up-right" size={14} color={colors.brand.peach} />
              </Pressable>
            </SoftPanel>
          )}

          <MemoryPreviewCard
            title={mockToday.latestMemory.title}
            dateLabel={mockToday.latestMemory.dateLabel}
            onPress={() => router.push(appRoutes.memory("1"))}
          />
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask BumpAtlas"
        onPress={() => router.push(appRoutes.assistant)}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Feather name="message-circle" size={22} color={colors.text.inverse} />
      </Pressable>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: 100,
    gap: spacing.lg,
  },
  welcomeStrip: {
    marginTop: -spacing.sm,
  },
  unknownCard: { gap: spacing.sm },
  unknownBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand.peach,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  draftBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.md,
  },
  draftCopy: { flex: 1 },
  progressSplit: { gap: 4 },
  pregnancyCard: { gap: spacing.sm, padding: spacing.xl },
  pregnancyEyebrow: {
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  pregnancyTip: { color: "rgba(255,255,255,0.88)" },
  pregnancyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
  },
  pregnancyCtaText: { color: colors.text.inverse },
  quickLinks: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.78)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.brand.peach },
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
  inviteBtn: {
    backgroundColor: colors.brand.peach,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  onThisDay: { gap: 4 },
  peachLabel: { color: colors.brand.peach },
  fab: {
    position: "absolute",
    right: spacing.page,
    bottom: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand.peach,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});
