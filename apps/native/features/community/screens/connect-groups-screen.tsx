import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useGroupsQuery } from "@/lib/api/hooks";

export function ConnectGroupsScreen() {
  const router = useRouter();
  const {
    activeGroupId,
    setActiveGroupId,
    postsUsedToday,
    commentsUsedToday,
    commentsDailyLimit,
    accountAgeDays,
    linksAllowed,
  } = useMockUi();

  const groupsQuery = useGroupsQuery();
  const groups = groupsQuery.data?.items ?? [];

  return (
    <SoftStackShell
      title="Stage groups"
      onBack={() => router.back()}
      footer={
        <Button size="lg" onPress={() => router.back()}>
          Save primary group
        </Button>
      }
    >
      <AppText variant="bodySmall" tone="secondary">
        Join one primary stage group. You can switch anytime. Text only — no child photos, no
        stranger DMs.
      </AppText>

      <View style={styles.limits}>
        <AppText weight="semibold">Today&apos;s write limits</AppText>
        <AppText variant="bodySmall" tone="secondary">
          Posts {postsUsedToday}/10 · Comments {commentsUsedToday}/{commentsDailyLimit}
        </AppText>
        {!linksAllowed ? (
          <AppText variant="caption" tone="secondary">
            Links paused for the first 14 days · day {accountAgeDays} of your account.
          </AppText>
        ) : (
          <AppText variant="caption" tone="secondary">
            Account age {accountAgeDays} days · links allowed
          </AppText>
        )}
      </View>

      {groups.map((group) => {
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
              {group.stageLabel}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {group.memberCount} parents
            </AppText>
          </Pressable>
        );
      })}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
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
  },
  cardActive: {
    borderWidth: 1.5,
    borderColor: colors.brand.peach,
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
