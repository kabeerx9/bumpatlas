import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  IconButton,
  Pill,
  Screen,
  Surface,
  colors,
  spacing,
  useAppTheme,
} from "@/design-system";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import { useGroupsQuery } from "@/lib/api/hooks";

const GROUP_TONES = [colors.pastel.petal, colors.pastel.mint, colors.pastel.lemon, colors.pastel.sky];

export function ConnectGroupsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const {
    activeGroupId,
    setActiveGroupId,
    postsUsedToday,
    commentsUsedToday,
    commentsDailyLimit,
    accountAgeDays,
    linksAllowed,
  } = useAppState();

  const groupsQuery = useGroupsQuery();
  const groups = groupsQuery.data?.items ?? [];

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={theme.colors.text} />
        </IconButton>
        <AppText variant="title">Stage groups</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <AppText variant="bodySmall" tone="secondary">
          Join one primary stage group. You can switch anytime. Text only — no child photos, no
          stranger DMs.
        </AppText>

        <Surface tone="warm" style={styles.limits}>
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
        </Surface>

        {groups.map((group, index) => {
          const active = activeGroupId === group.id;
          return (
            <Pressable
              key={group.id}
              onPress={() => setActiveGroupId(group.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Surface
                radiusSize="xl"
                bordered={active}
                elevated={active}
                style={[styles.card, active && { borderColor: theme.colors.secondary, borderWidth: 1.5 }]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTitle}>
                    <View
                      style={[
                        styles.iconChip,
                        { backgroundColor: GROUP_TONES[index % GROUP_TONES.length] },
                      ]}
                    >
                      <Feather name="users" size={16} color={theme.colors.text} />
                    </View>
                    <AppText weight="semibold">{group.name}</AppText>
                  </View>
                  {active ? <Pill tone="selected">Primary</Pill> : null}
                </View>
                <AppText variant="bodySmall" tone="secondary">
                  {group.stageLabel}
                </AppText>
                <Pill tone="neutral">{group.memberCount} parents</Pill>
              </Surface>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" onPress={() => router.back()}>
          Save primary group
        </Button>
      </View>
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
  limits: { gap: spacing.xs },
  card: { gap: spacing.sm, alignSelf: "stretch" },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
});
