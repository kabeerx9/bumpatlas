import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockPostLimits, mockStageGroups } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";

export function ConnectGroupsScreen() {
  const router = useRouter();
  const { activeGroupId, setActiveGroupId } = useMockUi();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Go back">
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Stage groups</AppText>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <AppText variant="bodySmall" tone="secondary">
            Join one primary stage group. You can switch anytime. Text only — no child photos, no
            stranger DMs.
          </AppText>

          <View style={styles.limits}>
            <AppText weight="semibold">Today&apos;s write limits</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Posts {mockPostLimits.postsUsed}/{mockPostLimits.postsLimit} · Comments{" "}
              {mockPostLimits.commentsUsed}/{mockPostLimits.commentsLimit}
            </AppText>
            {!mockPostLimits.linksAllowed || mockPostLimits.accountAgeDays < 14 ? (
              <AppText variant="caption" tone="secondary">
                Links are limited for the first 14 days of new accounts.
              </AppText>
            ) : (
              <AppText variant="caption" tone="secondary">
                Account age {mockPostLimits.accountAgeDays} days · links allowed
              </AppText>
            )}
          </View>

          {mockStageGroups.map((group) => {
            const active = activeGroupId === group.id;
            return (
              <Pressable
                key={group.id}
                onPress={() => setActiveGroupId(group.id)}
                style={[styles.card, active && styles.cardActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <View style={styles.cardTop}>
                  <AppText weight="semibold">{group.name}</AppText>
                  {active ? (
                    <View style={styles.badge}>
                      <AppText variant="caption" weight="semibold" tone="inverse">
                        Primary
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText variant="bodySmall" tone="secondary">
                  {group.description}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {group.memberCount} parents
                </AppText>
              </Pressable>
            );
          })}

          <Button size="lg" onPress={() => router.back()}>
            Save primary group
          </Button>
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
  limits: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.peachSoft,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardActive: {
    borderColor: colors.brand.peach,
    backgroundColor: colors.surface.warm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.brand.peach,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
