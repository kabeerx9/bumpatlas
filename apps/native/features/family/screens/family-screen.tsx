import { Feather } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { SignOutButton } from "@/components/sign-out-button";
import {
  AppText,
  Avatar,
  IconButton,
  ListCard,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatRow,
  Surface,
  colors,
  layout,
  radius,
  shadows,
  spacing,
  useAppTheme,
} from "@/design-system";
import type { FamilyMemberRole } from "@bumpatlas/contracts";
import {
  gestationalWeekFromDueDate,
  pregnancyWeekLabel,
} from "@/features/pregnancy/lib/gestational-week";
import {
  ageBucketFromDob,
  ageBucketLabel,
  approximateAgeLabel,
} from "@/features/shared/lib/age-bucket";
import { formatLongDate } from "@/features/shared/lib/format-date";
import { useFamilyQuery, useCurrentRecapQuery, useSetPremiumEntitlement } from "@/lib/api/hooks";
import { restorePurchases } from "@/lib/purchases/revenuecat";
import { appRoutes } from "@/navigation/routes";

const HONEY_ROLES: FamilyMemberRole[] = ["OWNER", "PARENT"];

const ROLE_LABEL: Record<FamilyMemberRole, string> = {
  OWNER: "Full access",
  PARENT: "Full access",
  CONTRIBUTOR: "View + log",
  VIEWER: "View only",
};

const ROLE_RELATION: Record<FamilyMemberRole, string> = {
  OWNER: "Parent",
  PARENT: "Parent",
  CONTRIBUTOR: "Contributor",
  VIEWER: "Viewer",
};

export function FamilyScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { user } = useUser();
  const familyQuery = useFamilyQuery();
  const recapQuery = useCurrentRecapQuery();
  const setPremium = useSetPremiumEntitlement();

  const members = familyQuery.data?.members ?? [];
  const children = familyQuery.data?.children ?? [];
  const childName = familyQuery.data?.childDisplayName ?? "your child";
  const stageMode = familyQuery.data?.stageMode ?? "unknown";
  const dueDate = familyQuery.data?.dueDate ?? null;
  const recap = recapQuery.data;

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    familyQuery.data?.name ||
    "Your household";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const pregnancyWeek = dueDate ? gestationalWeekFromDueDate(dueDate) : null;
  const activeChild = children.find((child) => child.isActive) ?? children[0] ?? null;

  /**
   * Two tiles rather than the design's three: a household is a pregnancy, a
   * child, or both — never three things. Padding the row with a filler stat
   * would be decoration pretending to be information.
   */
  const stats = [
    ...(pregnancyWeek !== null
      ? [
          {
            icon: <Feather name="sunrise" size={16} color={colors.brand.honeyDeep} />,
            value: pregnancyWeekLabel(pregnancyWeek),
            label: "Pregnancy",
          },
        ]
      : []),
    ...(activeChild
      ? [
          {
            icon: <Feather name="smile" size={16} color={colors.brand.honeyDeep} />,
            value: approximateAgeLabel(activeChild.dateOfBirth),
            label: activeChild.displayName,
          },
        ]
      : []),
  ];

  async function handleRestore() {
    const result = await restorePurchases();
    if (result.status === "success") {
      setPremium(result.isPremium);
    }
    router.push(appRoutes.paywall());
  }

  return (
    <Screen padded={false} contentStyle={styles.flex}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <ScreenHeader
          size="compact"
          title={displayName}
          subtitle={email || `Caring for ${childName}`}
          leading={<Avatar name={displayName} uri={user?.imageUrl} size={64} />}
          action={
            <IconButton
              accessibilityLabel="Account settings"
              size={40}
              onPress={() => router.push(appRoutes.account)}
            >
              <Feather name="settings" size={16} color={theme.colors.text} />
            </IconButton>
          }
        />

        {stats.length > 0 ? <StatRow items={stats} /> : null}

        {/* One card per subject — the design's stacked "who this household is about" block. */}
        <View style={styles.stackSm}>
          {dueDate ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open pregnancy journal"
              onPress={() => router.push(appRoutes.pregnancy)}
              style={[styles.subjectCard, shadows.soft, { backgroundColor: theme.colors.surface }]}
            >
              <View style={[styles.subjectThumb, { backgroundColor: colors.pastel.lemon }]}>
                <Feather name="sunrise" size={20} color={colors.brand.honeyDeep} />
              </View>
              <View style={styles.flex}>
                <AppText variant="label" style={styles.honeyLabel}>
                  Pregnancy · due {formatLongDate(dueDate)}
                </AppText>
                <AppText variant="subhead" style={styles.tight}>
                  {pregnancyWeek !== null ? pregnancyWeekLabel(pregnancyWeek) : "Due date set"}
                </AppText>
              </View>
              <Feather name="chevron-right" size={16} color={theme.colors.textFaint} />
            </Pressable>
          ) : null}

          {children.map((child) => (
            <View
              key={child.id}
              style={[styles.subjectCard, shadows.soft, { backgroundColor: theme.colors.surface }]}
            >
              <View style={[styles.subjectThumb, { backgroundColor: colors.pastel.mint }]}>
                <Feather name="smile" size={20} color={colors.brand.honeyDeep} />
              </View>
              <View style={styles.flex}>
                <AppText variant="label" style={styles.honeyLabel}>
                  {child.displayName} · born {formatLongDate(child.dateOfBirth)}
                </AppText>
                <AppText variant="subhead" style={styles.tight}>
                  {approximateAgeLabel(child.dateOfBirth)} ·{" "}
                  {ageBucketLabel(ageBucketFromDob(child.dateOfBirth))}
                </AppText>
              </View>
            </View>
          ))}

          {stageMode === "unknown" ? (
            <Surface tone="lavender" radiusSize="lg" bordered={false} style={styles.gapSm}>
              <AppText weight="semibold">Finish stage setup</AppText>
              <AppText variant="bodySmall" tone="secondary">
                Tell us pregnancy or postpartum so Care, Guide, and Connect match your week.
              </AppText>
            </Surface>
          ) : null}
        </View>

        <View>
          <SectionHeader
            title="Family & care team"
            actionLabel="+ Invite"
            onActionPress={() => router.push(appRoutes.invite)}
          />
          <View style={styles.stackSm}>
            {members.map((member) => (
              <View
                key={member.id}
                style={[styles.memberRow, shadows.soft, { backgroundColor: theme.colors.surface }]}
              >
                <Avatar
                  name={member.displayName}
                  size={42}
                  tint={HONEY_ROLES.includes(member.role) ? colors.brand.honeySoft : undefined}
                />
                <View style={styles.flex}>
                  <AppText variant="bodySmall" weight="bold" numberOfLines={1}>
                    {member.displayName}
                  </AppText>
                  <AppText variant="caption" tone="muted" weight="medium" style={styles.tightXs}>
                    {ROLE_RELATION[member.role]}
                    {member.status !== "active" ? ` · ${member.status}` : ""}
                  </AppText>
                </View>
                <View style={[styles.accessChip, { backgroundColor: theme.colors.surfaceWarm }]}>
                  <AppText variant="label" weight="bold" style={styles.accessChipText}>
                    {ROLE_LABEL[member.role]}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View roles and permissions"
            onPress={() => router.push(appRoutes.memberRoles)}
            style={styles.inlineLink}
          >
            <AppText variant="caption" weight="bold" style={styles.honeyLabel}>
              Roles &amp; permissions
            </AppText>
            <Feather name="arrow-up-right" size={13} color={colors.brand.honeyDeep} />
          </Pressable>
        </View>

        <View>
          <SectionHeader title="Journal & progress" />
          <ListCard>
            <ListRow
              icon="calendar"
              label="Weekly recap"
              trailing={
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {recap ? recap.weekLabel : "Not ready"}
                </AppText>
              }
              onPress={() => router.push(appRoutes.recap("latest"))}
            />
            <ListRow
              icon="heart"
              label="Wellness packs"
              onPress={() => router.push(appRoutes.wellnessPacks)}
            />
            <ListRow icon="award" label="Badges" onPress={() => router.push(appRoutes.badges)} />
          </ListCard>
        </View>

        <View>
          <SectionHeader title="Plan" />
          <ListCard>
            <ListRow
              icon="star"
              label="View premium"
              trailing={
                <AppText variant="caption" tone="muted">
                  Free
                </AppText>
              }
              onPress={() => router.push(appRoutes.paywall())}
            />
            <ListRow
              icon="refresh-cw"
              label="Restore purchases"
              chevron={false}
              onPress={() => void handleRestore()}
            />
          </ListCard>
        </View>

        <View>
          <SectionHeader title="Settings" />
          <ListCard>
            <ListRow
              icon="bell"
              label="Notifications"
              onPress={() => router.push(appRoutes.notificationSettings)}
            />
            <ListRow
              icon="download"
              label="Export memories"
              onPress={() => router.push(appRoutes.exportData)}
            />
            <ListRow
              icon="lock"
              label="Privacy policy"
              onPress={() => router.push(appRoutes.legal("privacy"))}
            />
            <ListRow
              icon="file-text"
              label="Terms of service"
              onPress={() => router.push(appRoutes.legal("terms"))}
            />
            <ListRow
              icon="users"
              label="Community rules"
              onPress={() => router.push(appRoutes.legal("community"))}
            />
          </ListCard>
        </View>

        <View style={styles.support}>
          <AppText variant="caption" tone="muted" align="center">
            help@bumpatlas.app · we reply within 1 business day during beta
          </AppText>
          <View style={styles.signOut}>
            <SignOutButton />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollPadding,
    gap: spacing.xl - 4,
  },
  stackSm: { gap: spacing.sm + 2 },
  gapSm: { gap: spacing.sm },
  tight: { marginTop: 2 },
  tightXs: { marginTop: 1 },
  honeyLabel: { color: colors.brand.honeyDeep },
  subjectCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md + 2,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  subjectThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md + 2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  accessChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  accessChipText: {
    letterSpacing: 0,
    textTransform: "none",
  },
  inlineLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginTop: spacing.md,
    minHeight: 32,
  },
  support: {
    gap: spacing.lg,
    alignItems: "center",
  },
  signOut: {
    alignItems: "center",
  },
});
