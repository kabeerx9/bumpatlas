import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";

export function ExportDataScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "preparing" | "ready">("idle");

  function startExport() {
    setStatus("preparing");
    setTimeout(() => setStatus("ready"), 1200);
  }

  return (
    <SoftStackShell
      title="Export data"
      onBack={() => router.back()}
      footer={
        <Button
          size="lg"
          disabled={status === "preparing"}
          onPress={status === "ready" ? () => router.back() : startExport}
        >
          {status === "idle"
            ? "Request export"
            : status === "preparing"
              ? "Preparing..."
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
        {["Journal memories (text + photos)", "Milestones & recaps", "Wellness completions", "Account & consent records"].map(
          (item) => (
            <View key={item} style={styles.row}>
              <Feather name="check" size={16} color={colors.brand.peach} />
              <AppText variant="bodySmall">{item}</AppText>
            </View>
          ),
        )}
      </View>

      {status === "ready" ? (
        <View style={styles.ready}>
          <AppText weight="semibold">Export ready</AppText>
          <AppText variant="bodySmall" tone="secondary">
            In production, a download link would arrive by email within 48 hours.
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
