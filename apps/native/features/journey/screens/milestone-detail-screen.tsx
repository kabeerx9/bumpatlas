import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { MilestoneStatus } from "@bumpatlas/contracts";

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
import { useMilestonesQuery, useUpsertMilestoneObservationMutation } from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

const STATUSES: Array<{ id: MilestoneStatus; label: string }> = [
  { id: "not_observed", label: "Not observed" },
  { id: "emerging", label: "Emerging" },
  { id: "observed", label: "Observed" },
  { id: "skipped", label: "Skipped" },
];

export function MilestoneDetailScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const milestonesQuery = useMilestonesQuery();
  const upsertObservation = useUpsertMilestoneObservationMutation();

  const definition = milestonesQuery.data?.definitions.find((item) => item.id === id);
  const observation = milestonesQuery.data?.observations.find((item) => item.definitionId === id);
  const childId = milestonesQuery.data?.childId ?? null;
  const currentStatus: MilestoneStatus = observation?.status ?? "not_observed";

  const [linked, setLinked] = useState(false);

  function recordStatus(status: MilestoneStatus) {
    if (!definition || !childId) return;
    upsertObservation.mutate({
      definitionId: definition.id,
      body: { childId, status, memoryId: observation?.memoryId ?? null },
    });
  }

  if (milestonesQuery.isLoading) {
    return (
      <Screen contentStyle={styles.loadingScreen}>
        <ActivityIndicator color={theme.colors.secondary} />
      </Screen>
    );
  }

  if (!definition) {
    return (
      <Screen contentStyle={styles.loadingScreen}>
        <AppText variant="heading" align="center">
          Milestone not found
        </AppText>
        <Button size="lg" onPress={() => router.back()} style={styles.notFoundCta}>
          Back
        </Button>
      </Screen>
    );
  }

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
          {definition.stageTags.length > 0 ? (
            <View style={styles.agePillFloating}>
              <AppText variant="caption" weight="semibold">
                {definition.stageTags.join(", ")}
              </AppText>
            </View>
          ) : null}
          <View style={styles.iconChip}>
            <Feather name="star" size={22} color={theme.colors.text} />
          </View>
          <AppText variant="heading">{definition.title}</AppText>
          <Pill tone="selected">
            {STATUSES.find((s) => s.id === currentStatus)?.label ?? currentStatus}
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
                  onPress={() => recordStatus(status.id)}
                  disabled={!childId || upsertObservation.isPending}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: !childId }}
                >
                  <Pill tone={active ? "selected" : "neutral"}>{status.label}</Pill>
                </Pressable>
              );
            })}
          </View>
          {!childId ? (
            <AppText variant="caption" tone="secondary">
              Observations unlock once a child is added to your household.
            </AppText>
          ) : null}
        </Surface>

        <Surface style={styles.card} radiusSize="xl">
          <AppText weight="semibold">What this means</AppText>
          <AppText variant="bodySmall" tone="secondary" style={styles.note}>
            {definition.guidance}
          </AppText>
        </Surface>

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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenFlex: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  notFoundCta: { marginTop: spacing.lg, alignSelf: "stretch" },
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
