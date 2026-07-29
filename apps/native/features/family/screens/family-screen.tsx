import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { SignOutButton } from "@/components/sign-out-button";
import { AppText, Button, colors, spacing } from "@/design-system";
import { mockHouseholdMembers, mockRecaps } from "@/features/mock/demo-data";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftHeader } from "@/features/shared/components/soft-header";
import { SoftPanel } from "@/features/shared/components/soft-panel";
import { SoftScreen } from "@/features/shared/components/soft-screen";
import { appRoutes } from "@/navigation/routes";

export function FamilyScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const {
    isOffline,
    setOffline,
    setConnectScenario,
    connectScenario,
    setConnectTodayMode,
    connectTodayMode,
    stageMode,
    setStageMode,
    showEmptyJourney,
    setShowEmptyJourney,
    householdName,
    childDisplayName,
  } = useMockUi();

  function cycleStageMode() {
    if (stageMode === "postpartum") setStageMode("pregnancy");
    else if (stageMode === "pregnancy") setStageMode("unknown");
    else setStageMode("postpartum");
  }

  const stageDemoLabel =
    stageMode === "pregnancy"
      ? "Simulate UNKNOWN stage (finish onboarding)"
      : stageMode === "unknown"
        ? "Switch Today to postpartum mode"
        : "Switch Today to pregnancy mode";

  return (
    <SoftScreen>
      <SoftHeader
        eyebrow="Family"
        title="Your household"
        subtitle={`${householdName} · caring for ${childDisplayName}`}
      />

      <SoftPanel>
        <AppText variant="caption" style={styles.peachLabel}>
          Journal & progress
        </AppText>
        <Button size="lg" onPress={() => router.push(appRoutes.pregnancy)}>
          Pregnancy journal
        </Button>
        <Button variant="ghost" onPress={() => router.push(appRoutes.wellnessPacks)}>
          Wellness packs
        </Button>
        <Button variant="ghost" onPress={() => router.push(appRoutes.badges)}>
          Badges
        </Button>
      </SoftPanel>

      <SoftPanel>
        <AppText variant="caption" style={styles.peachLabel}>
          Members
        </AppText>

        {mockHouseholdMembers.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.avatar}>
              <AppText weight="semibold" tone="inverse">
                {member.name.slice(0, 1)}
              </AppText>
            </View>
            <View style={styles.memberCopy}>
              <AppText weight="semibold">
                {member.name} · {member.role}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {member.email}
              </AppText>
            </View>
          </View>
        ))}

        <View style={styles.memberRow}>
          <View style={[styles.avatar, styles.avatarOpen]}>
            <Feather name="plus" size={16} color={colors.brand.peach} />
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
          View roles & permissions
        </Button>
      </SoftPanel>

      <SoftPanel>
        <View style={styles.recapTop}>
          <View style={styles.recapIcon}>
            <Feather name="calendar" size={18} color={colors.brand.peach} />
          </View>
          <AppText weight="semibold">Weekly recap</AppText>
        </View>
        <AppText variant="bodySmall" tone="secondary">
          {mockRecaps[0].title} — {mockRecaps[0].summary}
        </AppText>
        <Pressable
          style={styles.linkRow}
          onPress={() => router.push(appRoutes.recap("latest"))}
        >
          <AppText variant="caption" weight="semibold" style={styles.link}>
            Open recap card
          </AppText>
          <Feather name="arrow-up-right" size={14} color={colors.brand.peach} />
        </Pressable>
      </SoftPanel>

      <SoftPanel>
        <AppText variant="caption" style={styles.peachLabel}>
          Plan
        </AppText>
        <AppText weight="semibold">Free household</AppText>
        <AppText variant="bodySmall" tone="secondary">
          Capture, Care, Learn, and Connect stay free. Premium unlocks deeper history for everyone
          you invite.
        </AppText>
        <Button
          variant="ghost"
          size="lg"
          onPress={() => router.push(appRoutes.paywall())}
          style={styles.planCta}
        >
          View premium
        </Button>
        <Button
          variant="ghost"
          onPress={() =>
            Alert.alert(
              "Restore purchases",
              "Checking App Store / Play purchases… (mock) No active premium found.",
              [
                { text: "Open paywall", onPress: () => router.push(appRoutes.paywall()) },
                { text: "OK", style: "cancel" },
              ],
            )
          }
        >
          Restore purchases
        </Button>
      </SoftPanel>

      <SoftPanel>
        <AppText weight="semibold">Privacy & data</AppText>
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
      </SoftPanel>

      <SoftPanel>
        <AppText weight="semibold">Support</AppText>
        <AppText variant="bodySmall" tone="secondary">
          help@bumpatlas.app · we reply within 1 business day during beta
        </AppText>
        <Pressable style={styles.linkRow} onPress={() => setOffline(!isOffline)}>
          <AppText variant="caption" weight="semibold" style={styles.link}>
            {isOffline ? "Simulate online" : "Simulate offline (preview banner)"}
          </AppText>
        </Pressable>
        <Pressable
          style={styles.linkRow}
          onPress={() =>
            setConnectScenario(connectScenario === "warming" ? "active" : "warming")
          }
        >
          <AppText variant="caption" weight="semibold" style={styles.link}>
            {connectScenario === "warming"
              ? "Simulate active Connect group"
              : "Simulate warming Connect group"}
          </AppText>
        </Pressable>
        <Pressable
          style={styles.linkRow}
          onPress={() =>
            setConnectTodayMode(connectTodayMode === "alone" ? "group" : "alone")
          }
        >
          <AppText variant="caption" weight="semibold" style={styles.link}>
            {connectTodayMode === "alone"
              ? "Show group Connect on Today"
              : "Show invite-partner Connect on Today"}
          </AppText>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={cycleStageMode}>
          <AppText variant="caption" weight="semibold" style={styles.link}>
            {stageDemoLabel}
          </AppText>
        </Pressable>
        <Pressable
          style={styles.linkRow}
          onPress={() => setShowEmptyJourney(!showEmptyJourney)}
        >
          <AppText variant="caption" weight="semibold" style={styles.link}>
            {showEmptyJourney ? "Show Journey with content" : "Simulate empty Journey"}
          </AppText>
        </Pressable>
        <Pressable
          style={styles.linkRow}
          onPress={() => router.push(appRoutes.sessionExpired)}
        >
          <AppText variant="caption" weight="semibold" style={styles.link}>
            Preview session expired (401)
          </AppText>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => router.push(appRoutes.noAccess)}>
          <AppText variant="caption" weight="semibold" style={styles.link}>
            Preview no household access (403)
          </AppText>
        </Pressable>
      </SoftPanel>

      <SoftPanel>
        <AppText weight="semibold">Account</AppText>
        <AppText variant="caption" tone="secondary">
          {userId ? "Signed in" : "Local preview"}
        </AppText>
        <Button variant="ghost" onPress={() => router.push(appRoutes.account)}>
          Account settings & delete
        </Button>
        <SignOutButton />
      </SoftPanel>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  peachLabel: {
    color: colors.brand.peach,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOpen: {
    backgroundColor: colors.brand.peachSoft,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.brand.peach,
  },
  memberCopy: { flex: 1, gap: 2 },
  recapTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  recapIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  link: { color: colors.brand.peach },
  planCta: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand.peachSoft,
    borderColor: colors.brand.peachSoft,
  },
});
