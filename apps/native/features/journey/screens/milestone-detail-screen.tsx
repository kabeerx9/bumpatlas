import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockMilestoneDetails } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
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
    <SoftStackShell title="Milestone" onBack={() => router.back()} scroll={false}>
      <View style={styles.body}>
        <View style={styles.hero}>
          <AppText variant="caption" style={styles.eyebrow}>
            {STATUSES.find((s) => s.id === currentStatus)?.label ?? milestone.status}
          </AppText>
          <AppText variant="heading" tone="inverse">
            {milestone.title}
          </AppText>
          <AppText variant="bodySmall" style={styles.meta}>
            {milestone.window}
          </AppText>
        </View>

        <View style={styles.card}>
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
                  style={[styles.statusChip, active && styles.statusChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <AppText
                    variant="caption"
                    weight="semibold"
                    style={active ? styles.statusTextActive : undefined}
                  >
                    {status.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <AppText weight="semibold">What this means</AppText>
          <AppText variant="bodySmall" tone="secondary" style={styles.note}>
            {milestone.note}
          </AppText>
        </View>

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
      </View>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.lg },
  hero: {
    borderRadius: 28,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.78)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  meta: { color: "rgba(255,255,255,0.88)" },
  card: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  note: { lineHeight: 20 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statusChip: {
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  statusChipActive: {
    backgroundColor: colors.brand.peach,
    borderColor: colors.brand.peach,
  },
  statusTextActive: { color: colors.text.inverse },
});
