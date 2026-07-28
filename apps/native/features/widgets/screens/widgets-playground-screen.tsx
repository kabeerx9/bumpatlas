import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  addUserInteractionListener,
  widgetsDirectory,
  type LiveActivity,
  type UserInteractionEvent,
} from "expo-widgets";

import { AppText, Button, Screen, Surface, colors, spacing } from "@/design-system";
import CityWalkActivity, {
  type CityWalkActivityProps,
} from "@/features/widgets/widgets/city-walk-activity";
import TodayHintWidget, {
  type TodayHintWidgetProps,
} from "@/features/widgets/widgets/today-hint-widget";

const sampleHints: TodayHintWidgetProps[] = [
  {
    area: "Downtown",
    progress: 34,
    savedCount: 3,
    seed: 1,
    subtitle: "Coffee, murals, and a short golden-hour loop.",
    title: "Evening food walk",
    updatedAt: "Now",
  },
  {
    area: "Riverside",
    progress: 62,
    savedCount: 5,
    seed: 2,
    subtitle: "Quiet route with two scenic stops and one dessert idea.",
    title: "Waterfront reset",
    updatedAt: "In 5 min",
  },
  {
    area: "Old Town",
    progress: 88,
    savedCount: 7,
    seed: 3,
    subtitle: "History-heavy path with a compact lunch break.",
    title: "Architecture loop",
    updatedAt: "In 10 min",
  },
];

const initialActivity: CityWalkActivityProps = {
  currentStop: "Union Square",
  etaMinutes: 24,
  nextStop: "Market Street mural wall",
  progress: 18,
  status: "Walk in progress",
  step: 1,
  title: "Downtown discovery walk",
  totalStops: 5,
};

const activityUpdates: CityWalkActivityProps[] = [
  {
    currentStop: "Market Street mural wall",
    etaMinutes: 17,
    nextStop: "Pocket garden",
    progress: 42,
    status: "Second stop reached",
    step: 2,
    title: "Downtown discovery walk",
    totalStops: 5,
  },
  {
    currentStop: "Pocket garden",
    etaMinutes: 9,
    nextStop: "Dessert counter",
    progress: 72,
    status: "Almost done",
    step: 4,
    title: "Downtown discovery walk",
    totalStops: 5,
  },
  {
    currentStop: "Dessert counter",
    etaMinutes: 2,
    nextStop: "Wrap up",
    progress: 96,
    status: "Final stop",
    step: 5,
    title: "Downtown discovery walk",
    totalStops: 5,
  },
];

export function WidgetsPlaygroundScreen() {
  const router = useRouter();
  const activityRef = useRef<LiveActivity<CityWalkActivityProps> | null>(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [activityStep, setActivityStep] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [timelineCount, setTimelineCount] = useState<number | null>(null);
  const [lastInteraction, setLastInteraction] = useState<UserInteractionEvent | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }

    const subscription = addUserInteractionListener((event) => {
      setLastInteraction(event);
      setStatus(`Widget interaction: ${event.source} / ${event.target}`);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function runAction(label: string, action: () => void | Promise<void>) {
    if (Platform.OS !== "ios") {
      setStatus("Widgets and Live Activities are iOS-only.");
      return;
    }

    try {
      setStatus(`${label}...`);
      await action();
      setStatus(`${label} complete`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`${label} failed: ${message}`);
    }
  }

  function updateSnapshot() {
    const nextIndex = (hintIndex + 1) % sampleHints.length;
    const hint = sampleHints[nextIndex];
    TodayHintWidget.updateSnapshot({
      ...hint,
      seed: Date.now(),
      updatedAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    });
    setHintIndex(nextIndex);
  }

  function scheduleTimeline() {
    const now = Date.now();
    TodayHintWidget.updateTimeline(
      sampleHints.map((hint, index) => ({
        date: new Date(now + index * 60_000),
        props: {
          ...hint,
          seed: now + index,
          updatedAt: index === 0 ? "Now" : `+${String(index)} min`,
        },
      })),
    );
  }

  async function readTimeline() {
    const entries = await TodayHintWidget.getTimeline();
    setTimelineCount(entries.length);
  }

  function startActivity() {
    const instance = CityWalkActivity.start(initialActivity, "app-starter://widgets");
    activityRef.current = instance;
    setActivityStep(0);
  }

  async function recoverActivity() {
    const instances = CityWalkActivity.getInstances();
    activityRef.current = instances[0] ?? null;
    setStatus(
      instances.length > 0
        ? `Recovered ${String(instances.length)} active Live Activity instance(s)`
        : "No active Live Activities to recover",
    );
  }

  async function updateActivity() {
    const instance = activityRef.current ?? CityWalkActivity.getInstances()[0];
    if (!instance) {
      throw new Error("Start or recover a Live Activity first.");
    }

    const nextStep = (activityStep + 1) % activityUpdates.length;
    await instance.update(activityUpdates[nextStep]);
    activityRef.current = instance;
    setActivityStep(nextStep);
  }

  async function endActivity() {
    const instance = activityRef.current ?? CityWalkActivity.getInstances()[0];
    if (!instance) {
      throw new Error("No active Live Activity found.");
    }

    await instance.end(
      "default",
      {
        ...activityUpdates[activityUpdates.length - 1],
        etaMinutes: 0,
        progress: 100,
        status: "Walk complete",
      },
      new Date(),
    );
    activityRef.current = null;
  }

  if (Platform.OS !== "ios") {
    return (
      <Screen background={colors.surface.app}>
        <View style={styles.centered}>
          <AppText variant="title" align="center">
            iOS only
          </AppText>
          <AppText variant="body" tone="secondary" align="center">
            Expo Widgets and Live Activities only run on iOS.
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backButton}>
            <AppText variant="bodySmall" weight="semibold" tone="brand">
              Back
            </AppText>
          </Pressable>
          <View style={styles.titleGroup}>
            <AppText variant="caption" tone="tertiary" weight="semibold">
              SDK 56
            </AppText>
            <AppText variant="heading">Widgets</AppText>
            <AppText variant="body" tone="secondary">
              Push Home Screen widget timelines and try a route Live Activity from the app.
            </AppText>
          </View>
        </View>

        <Surface tone="cool" padding="lg" radiusSize="lg" style={styles.statusCard}>
          <AppText variant="caption" tone="tertiary" weight="semibold">
            Status
          </AppText>
          <AppText variant="bodySmall" tone="secondary">
            {status}
          </AppText>
          <AppText variant="caption" tone="tertiary">
            Shared directory: {widgetsDirectory || "not configured yet"}
          </AppText>
          {timelineCount !== null ? (
            <AppText variant="caption" tone="tertiary">
              Timeline entries: {timelineCount}
            </AppText>
          ) : null}
          {lastInteraction ? (
            <AppText variant="caption" tone="tertiary">
              Last tap: {lastInteraction.source} / {lastInteraction.target}
            </AppText>
          ) : null}
        </Surface>

        <PlaygroundSection
          title="Home Screen Widget"
          description="Adds Today Hint to the iOS widget gallery. After installing the widget on the simulator Home Screen, these actions update its content."
        >
          <Button variant="primary" onPress={() => void runAction("Update snapshot", updateSnapshot)}>
            Update widget snapshot
          </Button>
          <Button variant="secondary" onPress={() => void runAction("Schedule timeline", scheduleTimeline)}>
            Schedule 3-minute timeline
          </Button>
          <Button variant="secondary" onPress={() => void runAction("Read timeline", readTimeline)}>
            Read current timeline
          </Button>
          <Button variant="ghost" onPress={() => void runAction("Reload widget", () => TodayHintWidget.reload())}>
            Force widget reload
          </Button>
        </PlaygroundSection>

        <PlaygroundSection
          title="Live Activity"
          description="Starts a Downtown discovery walk on the Lock Screen and Dynamic Island where supported."
        >
          <Button variant="primary" onPress={() => void runAction("Start Live Activity", startActivity)}>
            Start route activity
          </Button>
          <Button variant="secondary" onPress={() => void runAction("Update Live Activity", updateActivity)}>
            Advance route progress
          </Button>
          <Button variant="secondary" onPress={() => void runAction("Recover Live Activities", recoverActivity)}>
            Recover active activity
          </Button>
          <Button variant="destructive" onPress={() => void runAction("End Live Activity", endActivity)}>
            End activity
          </Button>
        </PlaygroundSection>

        <Surface tone="warm" padding="lg" radiusSize="lg" style={styles.notes}>
          <AppText variant="title">What to look for</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Add the Today Hint widget from the simulator Home Screen widget gallery after rebuilding
            the dev client. Live Activities appear on the Lock Screen; Dynamic Island layouts depend
            on the simulated device model.
          </AppText>
          <AppText variant="bodySmall" tone="secondary">
            Widget code cannot use React Native views, hooks, async work, or app state. This screen
            pushes plain props into the isolated widget runtime.
          </AppText>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlaygroundSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Surface tone="card" elevated padding="lg" radiusSize="lg" style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="title">{title}</AppText>
        <AppText variant="bodySmall" tone="secondary">
          {description}
        </AppText>
      </View>
      <View style={styles.actions}>{children}</View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  container: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.lg,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
  },
  titleGroup: {
    gap: spacing.xs,
  },
  statusCard: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.lg,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.md,
  },
  notes: {
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
});
