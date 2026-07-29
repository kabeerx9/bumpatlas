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
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, colors, spacing } from "@/design-system";
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
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.atmosphere}>
        <View style={styles.blobPeach} />
        <View style={styles.blobSoft} />
        <View style={styles.blobWash} />
      </View>

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
          <Animated.View style={{ opacity: fade }}>
            <TodayProfileBar
              displayName={mockProfile.displayName}
              stageLabel={mockProfile.stageLabel}
              onSettingsPress={() => router.push(appRoutes.family)}
            />
          </Animated.View>

          <CaptureHeroCard
            babyName={mockProfile.displayName}
            prompt={mockToday.memoryPrompt}
            activeDays={mockToday.weekProgress.activeDays}
            goal={mockToday.weekProgress.goal}
            onCapture={() => router.push(appRoutes.capture)}
          />

          <View style={styles.sectionHead}>
            <AppText variant="subhead" weight="semibold">
              Keep going gently
            </AppText>
            <AppText variant="bodySmall" tone="secondary">
              Care · Learn · Connect — a few calm minutes
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
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask BumpAtlas"
          onPress={() => router.push(appRoutes.assistant)}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Feather name="message-circle" size={22} color={colors.text.inverse} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8EDE6",
  },
  atmosphere: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blobPeach: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(229,155,138,0.28)",
    top: -100,
    right: -90,
  },
  blobSoft: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,248,244,0.9)",
    top: 220,
    left: -110,
  },
  blobWash: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(243,199,188,0.35)",
    bottom: -80,
    right: -60,
  },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: 100,
    gap: spacing.lg,
  },
  sectionHead: {
    gap: 4,
    marginTop: spacing.xs,
  },
  gridRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
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
