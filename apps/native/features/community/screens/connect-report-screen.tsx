import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockGroupPosts } from "@/features/mock/demo-data";
import { HighRiskEscalatePanel } from "@/features/shared/components/high-risk-escalate";

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
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [highRiskAcknowledged, setHighRiskAcknowledged] = useState(false);

  const post = useMemo(
    () => mockGroupPosts.find((item) => item.id === postId) ?? mockGroupPosts[0],
    [postId],
  );

  const isHighRisk = selected === HIGH_RISK_REASON || selected === CSAM_REASON;
  const canSubmit = selected && (!isHighRisk || highRiskAcknowledged);

  function selectReason(reason: string) {
    setSelected(reason);
    if (reason !== HIGH_RISK_REASON && reason !== CSAM_REASON) {
      setHighRiskAcknowledged(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="x" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Report</AppText>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
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
                Why are you reporting this post from {post.author}?
              </AppText>
              <View style={styles.preview}>
                <AppText variant="bodySmall" tone="secondary" numberOfLines={3}>
                  {post.body}
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
        </ScrollView>

        {!submitted ? (
          <View style={styles.footer}>
            <Button size="lg" disabled={!canSubmit} onPress={() => setSubmitted(true)}>
              Submit report
            </Button>
          </View>
        ) : (
          <View style={styles.footer}>
            <Button size="lg" onPress={() => router.back()}>
              Done
            </Button>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8EDE6" },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  iconBtn: { width: 44, height: 44 },
  scroll: {
    paddingHorizontal: spacing.page,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
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
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
  },
});
