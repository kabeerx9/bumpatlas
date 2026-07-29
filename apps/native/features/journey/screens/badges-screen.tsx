import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, colors, radius, spacing } from "@/design-system";
import { mockBadges } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";

export function BadgesScreen() {
  const router = useRouter();
  const { earnedBadgeIds } = useMockUi();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Go back">
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Badges</AppText>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <AppText variant="bodySmall" tone="secondary">
            Cosmetic only — never a streak to protect. Missing a day never takes these away.
          </AppText>

          {mockBadges.map((badge) => {
            const earned = earnedBadgeIds.includes(badge.id) || badge.earned;
            return (
              <View key={badge.id} style={[styles.card, !earned && styles.cardLocked]}>
                <View style={[styles.icon, earned && styles.iconEarned]}>
                  <Feather
                    name={earned ? "award" : "lock"}
                    size={18}
                    color={earned ? colors.text.inverse : colors.text.muted}
                  />
                </View>
                <View style={styles.copy}>
                  <AppText weight="semibold">{badge.title}</AppText>
                  <AppText variant="bodySmall" tone="secondary">
                    {badge.description}
                  </AppText>
                  <AppText variant="caption" style={earned ? styles.earned : undefined}>
                    {badge.earnedLabel}
                  </AppText>
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
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
  },
  cardLocked: { opacity: 0.72 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEarned: { backgroundColor: colors.brand.peach },
  copy: { flex: 1, gap: 4 },
  earned: { color: colors.brand.peach },
});
