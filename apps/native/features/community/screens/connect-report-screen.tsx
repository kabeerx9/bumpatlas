import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { HighRiskEscalatePanel } from "@/features/shared/components/high-risk-escalate";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
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
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const { activeGroupId } = useMockUi();
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
    <SoftStackShell
      title="Report"
      closeIcon="x"
      onBack={() => router.back()}
      footer={
        submitted ? (
          <Button size="lg" onPress={() => router.back()}>
            Done
          </Button>
        ) : (
          <Button size="lg" disabled={!canSubmit} onPress={() => void submitReport()}>
            {reportMutation.isPending ? "Submitting…" : "Submit report"}
          </Button>
        )
      }
    >
      {submitted ? (
        <View style={styles.success}>
          <Feather name="check-circle" size={24} color={colors.brand.peach} />
          <AppText weight="semibold">Report received</AppText>
          <AppText variant="bodySmall" tone="secondary" align="center">
            Founders review reports during beta — usually within a few hours.
            {selected === CSAM_REASON
              ? " CSAM reports are escalated immediately for priority review and platform action."
              : isHighRisk
                ? " This report was flagged for priority safety review."
                : ""}
          </AppText>
        </View>
      ) : (
        <>
          <AppText variant="body" tone="secondary">
            Why are you reporting this post from {post?.authorName ?? "this member"}?
          </AppText>
          <View style={styles.preview}>
            <AppText variant="bodySmall" tone="secondary" numberOfLines={3}>
              {post?.body ?? "This post"}
            </AppText>
          </View>
          {REASONS.map((reason) => (
            <Pressable
              key={reason}
              onPress={() => selectReason(reason)}
              style={[styles.reason, selected === reason && styles.reasonActive]}
            >
              <AppText variant="bodySmall">{reason}</AppText>
            </Pressable>
          ))}

          {isHighRisk ? (
            <HighRiskEscalatePanel
              onAcknowledge={() => setHighRiskAcknowledged(true)}
              onKeepReporting={() => setHighRiskAcknowledged(true)}
            />
          ) : null}
        </>
      )}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  preview: {
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.md,
  },
  reason: {
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  reasonActive: {
    borderColor: colors.brand.peach,
    backgroundColor: colors.brand.peachSoft,
  },
  success: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.brand.peachSoft,
  },
});
