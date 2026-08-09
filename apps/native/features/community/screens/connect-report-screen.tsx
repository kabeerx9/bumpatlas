import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  IconButton,
  Screen,
  Surface,
  spacing,
  useAppTheme,
} from "@/design-system";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import { HighRiskEscalatePanel } from "@/features/shared/components/high-risk-escalate";
import { useCreateReportMutation, useGroupPostDetailQuery } from "@/lib/api/hooks";

const REASONS = [
  "Medical advice for my child",
  "Harassment or shaming",
  "Spam or suspicious link",
  "Self-harm or safety concern",
  "Child sexual exploitation / CSAM",
  "Other",
];

const HIGH_RISK_REASON = "Self-harm or safety concern";
const CSAM_REASON = "Child sexual exploitation / CSAM";

export function ConnectReportScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const { activeGroupId } = useAppState();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [highRiskAcknowledged, setHighRiskAcknowledged] = useState(false);

  const postQuery = useGroupPostDetailQuery(activeGroupId, postId ?? "");
  const reportMutation = useCreateReportMutation();
  const post = postQuery.data;

  const isHighRisk = selected === HIGH_RISK_REASON || selected === CSAM_REASON;
  const canSubmit =
    Boolean(selected) &&
    Boolean(postId) &&
    (!isHighRisk || highRiskAcknowledged) &&
    !reportMutation.isPending;

  function selectReason(reason: string) {
    setSelected(reason);
    if (reason !== HIGH_RISK_REASON && reason !== CSAM_REASON) {
      setHighRiskAcknowledged(false);
    }
  }

  async function submitReport() {
    if (!canSubmit || !selected || !postId) return;
    try {
      await reportMutation.mutateAsync({
        targetType: "post",
        targetId: postId,
        reason: selected,
      });
      setSubmitted(true);
    } catch {
      Alert.alert("Couldn’t submit report", "Check your connection and try again.");
    }
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close" onPress={() => router.back()}>
          <Feather name="x" size={20} color={theme.colors.text} />
        </IconButton>
        <AppText variant="title">Report</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {submitted ? (
          <Surface tone="mint" radiusSize="xl" style={styles.success}>
            <Feather name="check-circle" size={24} color={theme.colors.brandText} />
            <AppText weight="semibold">Report received</AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              Founders review reports during beta — usually within a few hours.
              {selected === CSAM_REASON
                ? " CSAM reports are escalated immediately for priority review and platform action."
                : isHighRisk
                  ? " This report was flagged for priority safety review."
                  : ""}
            </AppText>
          </Surface>
        ) : (
          <>
            <AppText variant="body" tone="secondary">
              Why are you reporting this post from {post?.authorName ?? "this member"}?
            </AppText>
            <Surface radiusSize="lg" style={styles.preview}>
              <AppText variant="bodySmall" tone="secondary" numberOfLines={3}>
                {post?.body ?? "This post"}
              </AppText>
            </Surface>
            {REASONS.map((reason) => {
              const active = selected === reason;
              return (
                <Pressable
                  key={reason}
                  onPress={() => selectReason(reason)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Surface
                    radiusSize="lg"
                    style={[
                      styles.reason,
                      active && {
                        backgroundColor: theme.colors.secondary,
                        borderColor: theme.colors.secondary,
                      },
                    ]}
                  >
                    <AppText variant="bodySmall" weight={active ? "semibold" : "regular"}>
                      {reason}
                    </AppText>
                  </Surface>
                </Pressable>
              );
            })}

            {isHighRisk ? (
              <HighRiskEscalatePanel
                onAcknowledge={() => setHighRiskAcknowledged(true)}
                onKeepReporting={() => setHighRiskAcknowledged(true)}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {submitted ? (
          <Button size="lg" onPress={() => router.back()}>
            Done
          </Button>
        ) : (
          <Button size="lg" disabled={!canSubmit} onPress={() => void submitReport()}>
            {reportMutation.isPending ? "Submitting…" : "Submit report"}
          </Button>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  headerSpacer: { width: 44 },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  preview: { gap: 0 },
  reason: { gap: 0 },
  success: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
});
