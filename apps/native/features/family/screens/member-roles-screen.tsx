import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, colors, radius, spacing } from "@/design-system";
import { mockHouseholdMembers } from "@/features/mock/mock-content";
import { appRoutes } from "@/navigation/routes";

export function MemberRolesScreen() {
  const router = useRouter();
  const adultCount = mockHouseholdMembers.length;
  const freeSeatLimit = 2;
  const atFreeSeatLimit = adultCount >= freeSeatLimit;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Household roles</AppText>
          <View style={styles.spacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <AppText variant="bodySmall" tone="secondary">
            Owners manage billing and invites. Contributors can add memories and view recaps. Free
            includes 2 adults · {adultCount}/{freeSeatLimit} seats used.
          </AppText>

          {atFreeSeatLimit ? (
            <Pressable
              style={styles.seatCard}
              onPress={() => router.push(appRoutes.paywall("third-seat"))}
              accessibilityLabel="Upgrade for more household seats"
            >
              <Feather name="users" size={18} color={colors.brand.peach} />
              <View style={styles.seatCopy}>
                <AppText weight="semibold">Need a 3rd adult?</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Premium unlocks up to 6 household seats for grandparents and caregivers.
                </AppText>
              </View>
              <Feather name="arrow-up-right" size={16} color={colors.brand.peach} />
            </Pressable>
          ) : null}

          {mockHouseholdMembers.map((member) => (
            <View key={member.id} style={styles.card}>
              <View style={styles.top}>
                <View style={styles.avatar}>
                  <AppText weight="semibold" tone="inverse">
                    {member.name.slice(0, 1)}
                  </AppText>
                </View>
                <View style={styles.copy}>
                  <AppText weight="semibold">{member.name}</AppText>
                  <AppText variant="caption" style={styles.role}>
                    {member.role}
                  </AppText>
                </View>
              </View>
              <View style={styles.perms}>
                <AppText variant="caption" tone="secondary">
                  {member.canInvite ? "Can invite · " : ""}
                  {member.canManageBilling ? "Manages billing · " : ""}
                  {member.canExport ? "Can export" : "Cannot export"}
                </AppText>
              </View>
            </View>
          ))}
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
  spacer: { width: 44 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: spacing.page, gap: spacing.md, paddingBottom: spacing.xxl },
  seatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.brand.peachSoft,
    padding: spacing.lg,
    minHeight: 44,
  },
  seatCopy: { flex: 1, gap: 2 },
  card: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  top: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { gap: 2 },
  role: { color: colors.brand.peach },
  perms: { paddingTop: spacing.xs },
});
