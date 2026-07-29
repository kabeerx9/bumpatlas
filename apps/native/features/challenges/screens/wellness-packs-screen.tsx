import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockWellnessPacks } from "@/features/mock/mock-content";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

export function WellnessPacksScreen() {
  const router = useRouter();

  return (
    <SoftStackShell title="Wellness packs" onBack={() => router.back()}>
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
