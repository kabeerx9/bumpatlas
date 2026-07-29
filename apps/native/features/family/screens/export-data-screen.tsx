import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useCreateDataRequestMutation } from "@/lib/api/hooks";

export function ExportDataScreen() {
  const router = useRouter();
  const createDataRequest = useCreateDataRequestMutation();
  const [status, setStatus] = useState<"idle" | "preparing" | "ready" | "failed">("idle");
  const [requestId, setRequestId] = useState<string | null>(null);

  async function startExport() {
    setStatus("preparing");
    try {
      const request = await createDataRequest.mutateAsync({ type: "export" });
      setRequestId(request.id);
      setStatus(request.status === "failed" ? "failed" : "ready");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <SoftStackShell
      title="Export data"
      onBack={() => router.back()}
      footer={
        <Button
          size="lg"
          disabled={status === "preparing"}
          onPress={status === "ready" ? () => router.back() : () => void startExport()}
        >
          {status === "idle"
            ? "Request export"
            : status === "preparing"
              ? "Preparing..."
              : status === "failed"
                ? "Try again"
                : "Done"}
        </Button>
      }
    >
      <View style={styles.hero}>
        <Feather name="download" size={28} color={colors.text.inverse} />
        <AppText variant="heading" tone="inverse" align="center">
          Your household data
        </AppText>
        <AppText variant="bodySmall" style={styles.heroCopy} align="center">
          Export includes memories, milestones, wellness history, and account metadata. Free
          forever — never paywalled.
        </AppText>
      </View>

      <View style={styles.list}>
        {[
          "Journal memories (text + photos)",
          "Milestones & recaps",
          "Wellness completions",
          "Account & consent records",
        ].map((item) => (
          <View key={item} style={styles.row}>
            <Feather name="check" size={16} color={colors.brand.peach} />
            <AppText variant="bodySmall">{item}</AppText>
          </View>
        ))}
      </View>

      {status === "ready" ? (
        <View style={styles.ready}>
          <AppText weight="semibold">Export requested</AppText>
          <AppText variant="bodySmall" tone="secondary">
            {requestId
              ? `Request ${requestId}. A download link will arrive by email within 48 hours.`
              : "A download link will arrive by email within 48 hours."}
          </AppText>
        </View>
      ) : null}

      {status === "failed" ? (
        <View style={styles.ready}>
          <AppText weight="semibold">Couldn’t start export</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Check your connection and try again.
          </AppText>
        </View>
      ) : null}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
  },
  heroCopy: { color: "rgba(255,255,255,0.88)", maxWidth: 300 },
  list: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ready: {
    borderRadius: radius.lg,
    backgroundColor: colors.brand.peachSoft,
    padding: spacing.lg,
    gap: spacing.xs,
  },
});
