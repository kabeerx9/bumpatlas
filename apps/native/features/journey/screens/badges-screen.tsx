import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";
import { mockBadges } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";

export function BadgesScreen() {
  const router = useRouter();
  const { earnedBadgeIds, newlyEarnedBadgeId } = useMockUi();

  return (
    <SoftStackShell title="Badges" onBack={() => router.back()}>
      <AppText variant="bodySmall" tone="secondary">
        Cosmetic only — never a streak to protect. Missing a day never takes these away.
      </AppText>

      {mockBadges.map((badge) => {
        const earned = earnedBadgeIds.includes(badge.id);
        const justEarned = newlyEarnedBadgeId === badge.id;
        return (
          <View
            key={badge.id}
            style={[styles.card, !earned && styles.cardLocked, justEarned && styles.cardFresh]}
          >
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
                {earned
                  ? justEarned
                    ? "Just earned"
                    : "Earned · yours to keep"
                  : badge.earnedLabel}
              </AppText>
            </View>
          </View>
        );
      })}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
  },
  cardLocked: { opacity: 0.72 },
  cardFresh: {
    borderWidth: 1,
    borderColor: "rgba(229,155,138,0.55)",
  },
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
