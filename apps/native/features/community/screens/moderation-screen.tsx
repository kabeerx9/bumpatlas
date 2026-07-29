import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockModerationQueue } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";

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
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Moderation queue</AppText>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
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
        </ScrollView>
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
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: spacing.page, gap: spacing.md, paddingBottom: spacing.xxl },
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
