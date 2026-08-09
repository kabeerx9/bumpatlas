import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import { AppText, IconButton, Screen, colors, radius, spacing, useAppTheme } from "@/design-system";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import { formatShortDate } from "@/features/shared/lib/format-date";
import { useBadgesQuery } from "@/lib/api/hooks";

const TILE_PASTELS = [colors.pastel.petal, colors.pastel.mint, colors.pastel.lemon, colors.pastel.sky];

export function BadgesScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { newlyEarnedBadgeId } = useAppState();
  const badgesQuery = useBadgesQuery();
  const badges = badgesQuery.data?.items ?? [];

  return (
    <Screen padded={false} contentStyle={styles.screenFlex}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={theme.colors.text} />
        </IconButton>
        <AppText variant="title" weight="semibold">
          Badges
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AppText variant="bodySmall" tone="secondary">
          Cosmetic only — never a streak to protect. Missing a day never takes these away.
        </AppText>

        {badgesQuery.isLoading ? (
          <ActivityIndicator color={theme.colors.secondary} style={styles.loading} />
        ) : (
          <View style={styles.grid}>
            {badges.map((badge, index) => {
            const earned = Boolean(badge.earnedAt);
            const justEarned = newlyEarnedBadgeId === badge.id;
            const pastel = TILE_PASTELS[index % TILE_PASTELS.length];

            return (
              <View key={badge.id} style={styles.tileWrap}>
                <View
                  style={[
                    styles.tile,
                    { backgroundColor: earned ? theme.colors.secondary : theme.colors.surfaceMuted },
                    justEarned && { borderWidth: 2, borderColor: theme.colors.secondary },
                    !earned && { borderWidth: 1, borderColor: theme.colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.tileGlow,
                      { backgroundColor: earned ? "transparent" : pastel, opacity: earned ? 0 : 0.5 },
                    ]}
                  />
                  <Feather
                    name={earned ? "award" : "lock"}
                    size={22}
                    color={earned ? theme.colors.text : theme.colors.textMuted}
                  />
                </View>
                <AppText variant="bodySmall" weight="semibold" align="center" numberOfLines={2}>
                  {badge.title}
                </AppText>
                <AppText variant="caption" tone="secondary" align="center" numberOfLines={2}>
                  {badge.description}
                </AppText>
                <AppText
                  variant="caption"
                  weight="semibold"
                  tone={earned ? "brand" : "muted"}
                  align="center"
                >
                  {earned
                    ? justEarned
                      ? "Just earned"
                      : `Earned ${formatShortDate(badge.earnedAt)}`
                    : "Not yet earned"}
                </AppText>
              </View>
            );
          })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenFlex: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.page, paddingTop: spacing.md, paddingBottom: 132, gap: spacing.lg },
  loading: { marginTop: spacing.lg },
  header: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: { width: 44, height: 44 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  tileWrap: {
    width: "30%",
    alignItems: "center",
    gap: spacing.xs,
  },
  tile: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tileGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
  },
});
