import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useModerationActionMutation, useModerationQueueQuery } from "@/lib/api/hooks";

export function ModerationScreen() {
  const router = useRouter();
  const moderationQuery = useModerationQueueQuery();
  const actionMutation = useModerationActionMutation();
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const items = moderationQuery.data?.items ?? [];

  async function hidePost(id: string) {
    try {
      const updated = await actionMutation.mutateAsync({ id, action: { action: "hide" } });
      setStatusOverrides((current) => ({ ...current, [id]: updated.status }));
      Alert.alert("Post hidden", "Removed from the group feed for review follow-up.");
    } catch {
      Alert.alert("Couldn’t hide post", "Check your connection and try again.");
    }
  }

  async function markReviewed(id: string) {
    try {
      const updated = await actionMutation.mutateAsync({ id, action: { action: "review" } });
      setStatusOverrides((current) => ({ ...current, [id]: updated.status }));
      Alert.alert("Marked reviewed", "Logged for founder follow-up during beta.");
    } catch {
      Alert.alert("Couldn’t update", "Check your connection and try again.");
    }
  }

  return (
    <SoftStackShell title="Moderation queue" onBack={() => router.back()}>
      <AppText variant="bodySmall" tone="secondary">
        Founder/admin only during beta. High-risk items escalate automatically.
      </AppText>

      {items.map((item) => {
        const status = statusOverrides[item.id] ?? item.status;
        const statusLower = status.toLowerCase();
        const hidden = statusLower === "hide" || statusLower === "hidden";
        const reviewed = statusLower === "review" || statusLower === "reviewed";
        return (
          <View
            key={item.id}
            style={[styles.card, item.priority === "high" && styles.cardHigh]}
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
                disabled={hidden || actionMutation.isPending}
                onPress={() => void hidePost(item.id)}
              >
                {hidden ? "Hidden" : "Hide post"}
              </Button>
              <Button
                size="sm"
                disabled={reviewed || actionMutation.isPending}
                onPress={() => void markReviewed(item.id)}
              >
                {reviewed ? "Reviewed" : "Review"}
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
