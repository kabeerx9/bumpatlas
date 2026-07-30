import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  Surface,
  colors,
  radius,
  spacing,
  useAppTheme,
} from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useCreateDataRequestMutation } from "@/lib/api/hooks";

export function ExportDataScreen() {
  const router = useRouter();
  const theme = useAppTheme();
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
        <View style={styles.heroIcon}>
          <Feather name="download" size={24} color={colors.brand.honeyDeep} />
        </View>
        <AppText variant="heading" weight="semibold" align="center">
          Your household data
        </AppText>
        <AppText variant="bodySmall" tone="secondary" style={styles.heroCopy} align="center">
          Export includes memories, milestones, wellness history, and account metadata. Free
          forever — never paywalled.
        </AppText>
      </View>

      <Surface tone="card" elevated radiusSize="xl" style={styles.list}>
        {[
          "Journal memories (text + photos)",
          "Milestones & recaps",
          "Wellness completions",
          "Account & consent records",
        ].map((item) => (
          <View key={item} style={styles.row}>
            <Feather name="check" size={16} color={colors.brand.honeyDeep} />
            <AppText variant="bodySmall">{item}</AppText>
          </View>
        ))}
      </Surface>

      {status === "ready" ? (
        <Surface tone="card" elevated radiusSize="lg" style={styles.ready}>
          <AppText weight="semibold">Export requested</AppText>
          <AppText variant="bodySmall" tone="secondary">
            {requestId
              ? `Request ${requestId}. A download link will arrive by email within 48 hours.`
              : "A download link will arrive by email within 48 hours."}
          </AppText>
        </Surface>
      ) : null}

      {status === "failed" ? (
        <View
          style={[
            styles.ready,
            {
              backgroundColor: theme.colors.dangerSurface,
              borderColor: theme.colors.dangerBorder,
              borderWidth: 1,
              borderRadius: radius.lg,
            },
          ]}
        >
          <AppText weight="semibold" style={{ color: theme.colors.danger }}>
            Couldn’t start export
          </AppText>
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
    gap: spacing.sm,
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { maxWidth: 300 },
  list: {
    gap: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ready: {
    gap: spacing.xs,
  },
});
