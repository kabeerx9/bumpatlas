import { useRouter } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockModerationQueue } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";

export function ModerationScreen() {
  const router = useRouter();
  const { moderationStatuses, resolveModerationItem } = useMockUi();

  function hidePost(id: string) {
    resolveModerationItem(id, "Hidden");
    Alert.alert("Post hidden", "Removed from the group feed for review follow-up.");
  }

  function markReviewed(id: string) {
    resolveModerationItem(id, "Reviewed");
    Alert.alert("Marked reviewed", "Logged for founder follow-up during beta.");
  }

  return (
    <SoftStackShell title="Moderation queue" onBack={() => router.back()}>
      <AppText variant="bodySmall" tone="secondary">
        Founder/admin only during beta. High-risk items escalate automatically.
      </AppText>

      {mockModerationQueue.map((item) => {
        const status = moderationStatuses[item.id] ?? item.status;
        return (
          <View
            key={item.id}
            style={[styles.card, item.severity === "high" && styles.cardHigh]}
          >
            <View style={styles.cardTop}>
              <AppText variant="caption" weight="semibold" style={styles.type}>
                {item.type}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {item.createdAt}
              </AppText>
            </View>
            <AppText weight="semibold">{item.summary}</AppText>
            <AppText variant="bodySmall" tone="secondary" numberOfLines={2}>
              {item.postPreview}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {item.reporter} · {status}
            </AppText>
            <View style={styles.actions}>
              <Button
                size="sm"
                variant="ghost"
                disabled={status === "Hidden"}
                onPress={() => hidePost(item.id)}
              >
                {status === "Hidden" ? "Hidden" : "Hide post"}
              </Button>
              <Button
                size="sm"
                disabled={status === "Reviewed"}
                onPress={() => markReviewed(item.id)}
              >
                {status === "Reviewed" ? "Reviewed" : "Review"}
              </Button>
            </View>
          </View>
        );
      })}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHigh: {
    borderWidth: 1.5,
    borderColor: colors.brand.terracotta,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  type: { color: colors.brand.peach },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});
