import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  IconButton,
  Screen,
  Surface,
  spacing,
  useAppTheme,
} from "@/design-system";
import { useModerationActionMutation, useModerationQueueQuery } from "@/lib/api/hooks";

export function ModerationScreen() {
  const router = useRouter();
  const theme = useAppTheme();
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
    <Screen padded={false}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={theme.colors.text} />
        </IconButton>
        <AppText variant="title">Moderation queue</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <AppText variant="bodySmall" tone="secondary">
          Founder/admin only during beta. High-risk items escalate automatically.
        </AppText>

        {items.map((item) => {
          const status = statusOverrides[item.id] ?? item.status;
          const statusLower = status.toLowerCase();
          const hidden = statusLower === "hide" || statusLower === "hidden";
          const reviewed = statusLower === "review" || statusLower === "reviewed";
          const isHighPriority = item.priority === "high";
          return (
            <Surface
              key={item.id}
              radiusSize="xl"
              style={[
                styles.card,
                isHighPriority && {
                  borderColor: theme.colors.dangerBorder,
                  borderWidth: 1.5,
                },
              ]}
            >
              <View style={styles.cardTop}>
                <AppText variant="caption" weight="semibold" tone="brand">
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
                  variant="destructive"
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
            </Surface>
          );
        })}
      </ScrollView>
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
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  card: { gap: spacing.sm },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});
