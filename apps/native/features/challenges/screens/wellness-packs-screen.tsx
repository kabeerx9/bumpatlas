import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockWellnessPacks } from "@/features/mock/mock-content";
import { appRoutes } from "@/navigation/routes";

export function WellnessPacksScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Go back">
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Wellness packs</AppText>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <AppText variant="bodySmall" tone="secondary">
            Parent care only — not workouts. Skip anytime. Completing Care never takes away your
            memory progress.
          </AppText>

          {mockWellnessPacks.map((pack) => (
            <View key={pack.id} style={styles.card}>
              <View style={styles.cardTop}>
                <AppText weight="semibold">{pack.title}</AppText>
                <AppText variant="caption" style={styles.stage}>
                  {pack.free ? "Free" : "Premium"} · {pack.stage}
                </AppText>
              </View>
              <AppText variant="caption" tone="secondary">
                Reviewed by {pack.reviewerName} · {pack.reviewedOn}
              </AppText>
              <AppText variant="caption" tone="secondary">
                Source: {pack.sourceName}
              </AppText>
              {pack.actions.map((action) => (
                <Pressable
                  key={action.id}
                  style={styles.actionRow}
                  onPress={() => {
                    if (!pack.free) {
                      router.push(appRoutes.paywall("wellness"));
                      return;
                    }
                    router.push(appRoutes.care);
                  }}
                  accessibilityLabel={`${action.title}, ${action.duration}`}
                >
                  <View style={styles.actionIcon}>
                    <Feather name="wind" size={16} color={colors.brand.peach} />
                  </View>
                  <View style={styles.actionCopy}>
                    <AppText weight="semibold">{action.title}</AppText>
                    <AppText variant="caption" tone="secondary">
                      {action.duration}
                    </AppText>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.text.muted} />
                </Pressable>
              ))}
              {!pack.free ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => router.push(appRoutes.paywall("wellness"))}
                  style={styles.unlock}
                >
                  Unlock with Premium
                </Button>
              ) : null}
            </View>
          ))}
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
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTop: { gap: 4, marginBottom: spacing.xs },
  stage: { color: colors.brand.peach, textTransform: "uppercase", letterSpacing: 0.4 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: { flex: 1, gap: 2 },
  unlock: {
    marginTop: spacing.xs,
    backgroundColor: colors.brand.peachSoft,
    borderColor: colors.brand.peachSoft,
  },
});
