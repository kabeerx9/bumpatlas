import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, Pill, Surface, colors, radius, spacing } from "@/design-system";
import { mockWellnessPacks } from "@/features/mock/mock-content";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

const pregnancyMedia =
  "https://images.unsplash.com/photo-1457342813143-a1ae27448a82?w=1200&q=80";
const parentMedia = "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?w=1200&q=80";

export function WellnessPacksScreen() {
  const router = useRouter();

  return (
    <SoftStackShell title="Wellness packs" onBack={() => router.back()}>
      <AppText variant="bodySmall" tone="secondary">
        Parent care only — not workouts. Skip anytime. Completing Care never takes away your
        memory progress.
      </AppText>

      {mockWellnessPacks.map((pack) => (
        <Surface key={pack.id} elevated radiusSize="xl" padding="none" style={styles.card}>
          <View style={styles.media}>
            <Image
              source={{ uri: pack.stage === "pregnancy" ? pregnancyMedia : parentMedia }}
              style={styles.mediaImage}
              accessibilityLabel=""
            />
            <View style={styles.mediaPill}>
              <Pill tone={pack.free ? "mint" : "selected"}>{pack.free ? "Free" : "Premium"}</Pill>
            </View>
            <View style={styles.mediaStagePill}>
              <Pill tone="neutral">{pack.stage}</Pill>
            </View>
          </View>

          <View style={styles.body}>
            <AppText weight="semibold" variant="title">
              {pack.title}
            </AppText>
            <AppText variant="caption" tone="tertiary">
              Reviewed by {pack.reviewerName} · {pack.reviewedOn}
            </AppText>
            <AppText variant="caption" tone="tertiary">
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
                  <Feather name="wind" size={16} color={colors.brand.honeyDeep} />
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
                variant="dark"
                onPress={() => router.push(appRoutes.paywall("wellness"))}
                style={styles.unlock}
              >
                Unlock with Premium
              </Button>
            ) : null}
          </View>
        </Surface>
      ))}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  media: {
    height: 140,
    position: "relative",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  mediaPill: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
  },
  mediaStagePill: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
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
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: { flex: 1, gap: 2 },
  unlock: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
});
