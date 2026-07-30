import type { FamilyMemberRole } from "@bumpatlas/contracts";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppText, Pill, Surface, borderWidth, colors, radius, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useFamilyQuery } from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

const HONEY_ROLES: FamilyMemberRole[] = ["OWNER", "PARENT"];

function permissionsForRole(role: FamilyMemberRole) {
  return {
    canInvite: role === "OWNER" || role === "PARENT",
    canManageBilling: role === "OWNER",
    canExport: role !== "VIEWER",
  };
}

export function MemberRolesScreen() {
  const router = useRouter();
  const familyQuery = useFamilyQuery();
  const members = familyQuery.data?.members ?? [];
  const adultCount = members.length;
  const freeSeatLimit = 2;
  const atFreeSeatLimit = adultCount >= freeSeatLimit;

  return (
    <SoftStackShell title="Household roles" onBack={() => router.back()}>
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
          <Feather name="users" size={18} color={colors.brand.honeyDeep} />
          <View style={styles.seatCopy}>
            <AppText weight="semibold">Need a 3rd adult?</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Premium unlocks up to 6 household seats for grandparents and caregivers.
            </AppText>
          </View>
          <Feather name="arrow-up-right" size={16} color={colors.brand.honeyDeep} />
        </Pressable>
      ) : null}

      {familyQuery.isLoading ? (
        <ActivityIndicator color={colors.brand.honeyDeep} />
      ) : (
        members.map((member) => {
          const perms = permissionsForRole(member.role);
          const isElevated = HONEY_ROLES.includes(member.role);
          return (
            <Surface
              key={member.id}
              tone="card"
              elevated
              radiusSize="xl"
              style={[styles.card, isElevated && styles.cardSelected]}
            >
              <View style={styles.top}>
                <View style={[styles.avatar, isElevated && styles.avatarSelected]}>
                  <AppText weight="semibold" tone={isElevated ? "primary" : "inverse"}>
                    {member.displayName.slice(0, 1)}
                  </AppText>
                </View>
                <View style={styles.copy}>
                  <AppText weight="semibold">{member.displayName}</AppText>
                </View>
                <Pill tone={isElevated ? "selected" : "neutral"}>{member.role}</Pill>
              </View>
              <View style={styles.perms}>
                <AppText variant="caption" tone="secondary">
                  {perms.canInvite ? "Can invite · " : ""}
                  {perms.canManageBilling ? "Manages billing · " : ""}
                  {perms.canExport ? "Can export" : "Cannot export"}
                </AppText>
              </View>
            </Surface>
          );
        })
      )}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  seatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.brand.honeySoft,
    padding: spacing.lg,
    minHeight: 44,
  },
  seatCopy: { flex: 1, gap: 2 },
  card: {
    gap: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.brand.honey,
    borderWidth: borderWidth.emphasis,
  },
  top: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSelected: {
    backgroundColor: colors.brand.honey,
  },
  copy: { flex: 1, gap: 2 },
  perms: { paddingTop: spacing.xs },
});
