import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  IconButton,
  Pill,
  Screen,
  Surface,
  colors,
  radius,
  spacing,
  useAppTheme,
} from "@/design-system";
import { mockMilestoneDetails } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { appRoutes } from "@/navigation/routes";

type MilestoneStatus = "NOT_OBSERVED" | "EMERGING" | "OBSERVED" | "SKIPPED";

const STATUSES: Array<{ id: MilestoneStatus; label: string }> = [
  { id: "NOT_OBSERVED", label: "Not observed" },
  { id: "EMERGING", label: "Emerging" },
  { id: "OBSERVED", label: "Observed" },
  { id: "SKIPPED", label: "Skipped" },
];

export function MilestoneDetailScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { milestoneStatuses, setMilestoneStatus } = useMockUi();

  const milestone = useMemo(
    () => mockMilestoneDetails.find((item) => item.id === id) ?? mockMilestoneDetails[0],
    [id],
  );

  const currentStatus =
    milestoneStatuses[milestone.id] ??
    (milestone.status.toUpperCase().replace(" ", "_") as MilestoneStatus);

  const [linked, setLinked] = useState(false);

  return (
    <Screen padded={false} contentStyle={styles.screenFlex}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={theme.colors.text} />
        </IconButton>
        <AppText variant="title" weight="semibold">
          Milestone
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.hero, { backgroundColor: colors.pastel.lemon }]}>
          <View style={styles.agePillFloating}>
            <AppText variant="caption" weight="semibold">
              {milestone.window}
            </AppText>
          </View>
          <View style={styles.iconChip}>
            <Feather name="star" size={22} color={theme.colors.text} />
          </View>
          <AppText variant="heading">{milestone.title}</AppText>
          <Pill tone="selected">
            {STATUSES.find((s) => s.id === currentStatus)?.label ?? milestone.status}
          </Pill>
        </View>

        <Surface style={styles.card} radiusSize="xl">
          <AppText weight="semibold">Observation status</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Non-diagnostic windows only — never a measure of health or delay.
          </AppText>
          <View style={styles.statusRow}>
            {STATUSES.map((status) => {
              const active = currentStatus === status.id;
              return (
                <Pressable
                  key={status.id}
                  onPress={() => setMilestoneStatus(milestone.id, status.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Pill tone={active ? "selected" : "neutral"}>{status.label}</Pill>
                </Pressable>
              );
            })}
          </View>
        </Surface>

        <Surface style={styles.card} radiusSize="xl">
          <AppText weight="semibold">What this means</AppText>
          <AppText variant="bodySmall" tone="secondary" style={styles.note}>
            {milestone.note}
          </AppText>
        </Surface>

        {milestone.canLinkMemory ? (
          <>
            <Button
              size="lg"
              onPress={() => {
                setLinked(true);
                router.push(appRoutes.capture);
              }}
            >
              Link a memory to this milestone
            </Button>
            {linked ? (
              <AppText variant="caption" tone="secondary" align="center">
                Opening Capture — you can attach a moment for this milestone.
              </AppText>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenFlex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: { width: 44, height: 44 },
  scrollContent: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "flex-start",
    position: "relative",
  },
  iconChip: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  agePillFloating: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  card: { gap: spacing.sm },
  note: { lineHeight: 20 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
