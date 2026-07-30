import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { SignOutButton } from "@/components/sign-out-button";
import {
  AppText,
  Button,
  CardStack,
  IconButton,
  Pill,
  Screen,
  Surface,
  borderWidth,
  colors,
  radius,
  spacing,
  useAppTheme,
} from "@/design-system";
import type { FamilyMemberRole } from "@bumpatlas/contracts";
import { gestationalWeekFromDueDate, pregnancyWeekLabel } from "@/features/pregnancy/lib/gestational-week";
import { ageBucketFromDob, ageBucketLabel, approximateAgeLabel } from "@/features/shared/lib/age-bucket";
import { useFamilyQuery, useCurrentRecapQuery, useSetPremiumEntitlement } from "@/lib/api/hooks";
import { restorePurchases } from "@/lib/purchases/revenuecat";
import { appRoutes } from "@/navigation/routes";

const HONEY_ROLES: FamilyMemberRole[] = ["OWNER", "PARENT"];

export function FamilyScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const familyQuery = useFamilyQuery();
  const recapQuery = useCurrentRecapQuery();
  const setPremium = useSetPremiumEntitlement();

  const members = familyQuery.data?.members ?? [];
  const familyTitle = familyQuery.data?.name ?? "Your household";
  const childName = familyQuery.data?.childDisplayName ?? "your child";
  const stageMode = familyQuery.data?.stageMode ?? "unknown";
  const activeChild = familyQuery.data?.children.find((child) => child.isActive) ?? null;
  const recap = recapQuery.data;

  const stageLabel =
    stageMode === "pregnancy"
      ? "Pregnancy"
      : stageMode === "postpartum"
        ? "Postpartum"
        : "Getting started";

  const weekLabel =
    stageMode === "pregnancy" && familyQuery.data?.dueDate
      ? pregnancyWeekLabel(gestationalWeekFromDueDate(familyQuery.data.dueDate))
      : stageMode === "postpartum" && activeChild
        ? `${approximateAgeLabel(activeChild.dateOfBirth)} · ${ageBucketLabel(ageBucketFromDob(activeChild.dateOfBirth))}`
        : "Finish stage setup";

  async function handleRestore() {
    const result = await restorePurchases();
    if (result.status === "success") {
      setPremium(result.isPremium);
    }
    router.push(appRoutes.paywall());
  }

  return (
    <Screen padded={false} contentStyle={styles.flex}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <AppText variant="heading" weight="semibold">
              Family
            </AppText>
            <AppText variant="bodySmall" tone="secondary">
              {familyTitle} · caring for {childName}
            </AppText>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              accessibilityLabel="Notification preferences"
              tone="card"
              onPress={() => router.push(appRoutes.notificationSettings)}
            >
              <Feather name="bell" size={18} color={theme.colors.text} />
            </IconButton>
            <IconButton
              accessibilityLabel="Account settings"
              tone="card"
              onPress={() => router.push(appRoutes.account)}
            >
              <Feather name="user" size={18} color={theme.colors.text} />
            </IconButton>
          </View>
        </View>

        <CardStack edges={[colors.pastel.lemon, colors.pastel.petal, colors.pastel.mint]}>
          <Surface tone="card" elevated radiusSize="xl" style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroIllustration}>
                <Feather
                  name={stageMode === "pregnancy" ? "sunrise" : "smile"}
                  size={22}
                  color={colors.brand.honeyDeep}
                />
              </View>
              <Pill tone="selected">{stageLabel}</Pill>
            </View>
            <AppText variant="title" weight="semibold">
              {childName}
            </AppText>
            <AppText variant="body" tone="secondary">
              {weekLabel}
            </AppText>
            {recap ? (
              <View style={styles.heroRecapRow}>
                <View style={styles.heroProgressDot} />
                <AppText variant="caption" tone="secondary">
                  {recap.title} · {recap.weekLabel}
                </AppText>
              </View>
            ) : null}
          </Surface>
        </CardStack>

        <View style={styles.section}>
          <AppText variant="label" tone="muted">
            Journal &amp; progress
          </AppText>
          <Surface tone="card" style={styles.linksCard}>
            <Button size="lg" onPress={() => router.push(appRoutes.pregnancy)}>
              Pregnancy journal
            </Button>
            <Button variant="ghost" onPress={() => router.push(appRoutes.wellnessPacks)}>
              Wellness packs
            </Button>
            <Button variant="ghost" onPress={() => router.push(appRoutes.badges)}>
              Badges
            </Button>
          </Surface>
        </View>

        <View style={styles.section}>
          <AppText variant="label" tone="muted">
            Members
          </AppText>
          <Surface tone="card" style={styles.membersCard}>
            {members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: HONEY_ROLES.includes(member.role) ? colors.brand.honey : colors.pastel.sky },
                  ]}
                >
                  <AppText weight="semibold" tone="primary">
                    {member.displayName.slice(0, 1)}
                  </AppText>
                </View>
                <View style={styles.memberCopy}>
                  <AppText weight="semibold">{member.displayName}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {member.status}
                  </AppText>
                </View>
                <Pill tone={HONEY_ROLES.includes(member.role) ? "selected" : "neutral"}>
                  {member.role}
                </Pill>
              </View>
            ))}

            <View style={styles.memberRow}>
              <View style={[styles.avatar, styles.avatarOpen]}>
                <Feather name="plus" size={16} color={colors.brand.honeyDeep} />
              </View>
              <View style={styles.memberCopy}>
                <AppText weight="semibold">Partner seat open</AppText>
                <AppText variant="caption" tone="secondary">
                  Free includes 2 adults
                </AppText>
              </View>
            </View>

            <Button size="lg" onPress={() => router.push(appRoutes.invite)}>
              Invite partner
            </Button>
            <Button variant="ghost" onPress={() => router.push(appRoutes.memberRoles)}>
              View roles &amp; permissions
            </Button>
          </Surface>
        </View>

        <View style={styles.section}>
          <Surface tone="card" style={styles.recapCard}>
            <View style={styles.recapTop}>
              <View style={styles.recapIcon}>
                <Feather name="calendar" size={18} color={colors.brand.honeyDeep} />
              </View>
              <AppText weight="semibold">Weekly recap</AppText>
            </View>
            <AppText variant="bodySmall" tone="secondary">
              {recap
                ? `${recap.title} — ${recap.weekLabel}`
                : "Your weekly card unlocks with gentle progress."}
            </AppText>
            <Button
              variant="ghost"
              size="sm"
              style={styles.recapCta}
              onPress={() => router.push(appRoutes.recap("latest"))}
              rightAccessory={<Feather name="arrow-up-right" size={14} color={theme.colors.text} />}
            >
              Open recap card
            </Button>
          </Surface>
        </View>

        <View style={styles.section}>
          <Surface tone="card" style={styles.linksCard}>
            <AppText variant="label" tone="muted">
              Plan
            </AppText>
            <AppText weight="semibold">Free household</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Capture, Care, Learn, and Connect stay free. Premium unlocks deeper history for
              everyone you invite.
            </AppText>
            <Button variant="ghost" size="lg" onPress={() => router.push(appRoutes.paywall())}>
              View premium
            </Button>
            <Button variant="ghost" onPress={() => void handleRestore()}>
              Restore purchases
            </Button>
          </Surface>
        </View>

        <View style={styles.section}>
          <Surface tone="card" style={styles.linksCard}>
            <AppText weight="semibold">Privacy &amp; data</AppText>
            <Button variant="ghost" onPress={() => router.push(appRoutes.exportData)}>
              Export household data
            </Button>
            <Button variant="ghost" onPress={() => router.push(appRoutes.notificationSettings)}>
              Notification preferences
            </Button>
            <Button variant="ghost" onPress={() => router.push(appRoutes.legal("privacy"))}>
              Privacy policy
            </Button>
            <Button variant="ghost" onPress={() => router.push(appRoutes.legal("terms"))}>
              Terms of service
            </Button>
            <Button variant="ghost" onPress={() => router.push(appRoutes.legal("community"))}>
              Community rules
            </Button>
          </Surface>
        </View>

        <View style={styles.section}>
          <Surface tone="card" style={styles.linksCard}>
            <AppText weight="semibold">Support</AppText>
            <AppText variant="bodySmall" tone="secondary">
              help@bumpatlas.app · we reply within 1 business day during beta
            </AppText>
            <Button variant="ghost" onPress={() => router.push(appRoutes.account)}>
              Account settings
            </Button>
            <SignOutButton />
          </Surface>
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
    paddingBottom: 120,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerCopy: { flex: 1, gap: spacing.xxs },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  heroCard: { gap: spacing.sm },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroIllustration: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.pastel.lemon,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRecapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  heroProgressDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.brand.honey,
  },
  section: { gap: spacing.sm },
  linksCard: { gap: spacing.sm },
  membersCard: { gap: spacing.sm },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOpen: {
    backgroundColor: colors.brand.honeySoft,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border.warm,
  },
  memberCopy: { flex: 1, gap: 2 },
  recapCard: { gap: spacing.sm },
  recapTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  recapIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  recapCta: { alignSelf: "flex-start", paddingHorizontal: 0 },
});
