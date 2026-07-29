import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Atmosphere, colors, radius, spacing } from "@/design-system";
import { mockProfile, mockToday } from "@/features/mock/demo-data";
import { CaptureHeroCard } from "@/features/today/components/capture-hero-card";
import { ConnectBanner } from "@/features/today/components/connect-banner";
import { MemoryPreviewCard } from "@/features/today/components/memory-preview-card";
import { TodayActionTile } from "@/features/today/components/today-action-tile";
import { TodayProfileBar } from "@/features/today/components/today-profile-bar";
import { appRoutes } from "@/navigation/routes";

export function TodayScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const connect = mockToday.connectCard;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  }, []);

  return (
    <Atmosphere variant="cream">
      <SafeAreaView style={styles.safe} edges={["top"]}>
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
          <TodayProfileBar
            displayName={mockProfile.displayName}
            stageLabel={mockProfile.stageLabel}
            onSettingsPress={() => router.push(appRoutes.family)}
          />

          <CaptureHeroCard
            prompt={mockToday.memoryPrompt}
            activeDays={mockToday.weekProgress.activeDays}
            goal={mockToday.weekProgress.goal}
            onCapture={() => router.push(appRoutes.capture)}
          />

          <View style={styles.sectionHead}>
            <AppText variant="subhead" weight="semibold">
              For you today
            </AppText>
          </View>

          <View style={styles.gridRow}>
            <TodayActionTile
              icon="wind"
              label="Care"
              title={mockToday.wellnessAction.title}
              detail={mockToday.wellnessAction.duration}
              done={mockToday.loopCompletion.care}
              onPress={() => undefined}
            />
            <TodayActionTile
              icon="book-open"
              label="Learn"
              title={mockToday.learnCard.title}
              detail="Stage tip"
              done={mockToday.loopCompletion.learn}
              onPress={() => router.push(appRoutes.guide)}
            />
          </View>

          <ConnectBanner
            prompt={connect.prompt}
            groupName={connect.groupName}
            replyCount={connect.replyCount}
            onPress={() => router.push(appRoutes.connect)}
          />

          <MemoryPreviewCard
            title={mockToday.latestMemory.title}
            dateLabel={mockToday.latestMemory.dateLabel}
            onPress={() => router.push(appRoutes.journey)}
          />

          <Pressable
            style={styles.assistantPill}
            onPress={() => router.push(appRoutes.assistant)}
          >
            <AppText variant="bodySmall" weight="semibold" style={styles.assistantText}>
              Ask BumpAtlas
            </AppText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  sectionHead: {
    marginTop: spacing.xs,
  },
  gridRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  assistantPill: {
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.peach,
    backgroundColor: colors.surface.card,
  },
  assistantText: {
    color: colors.brand.peach,
  },
});
