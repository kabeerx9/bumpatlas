import type { FamilyMemberRole } from "@bumpatlas/contracts";
import { ApiError } from "@bumpatlas/contracts";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText, Pill, Surface, borderWidth, colors, radius, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import {
  useFamilyQuery,
  useRemoveMemberMutation,
  useUpdateMemberMutation,
} from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

const HONEY_ROLES: FamilyMemberRole[] = ["OWNER", "PARENT"];

/** Assignable roles, in cycle order. OWNER is never assigned here — a household always keeps exactly one owner. */
const ASSIGNABLE_ROLES: FamilyMemberRole[] = ["PARENT", "CONTRIBUTOR", "VIEWER"];

function permissionsForRole(role: FamilyMemberRole) {
  return {
    canInvite: role === "OWNER" || role === "PARENT",
    canManageBilling: role === "OWNER",
    canExport: role !== "VIEWER",
  };
}

function nextAssignableRole(role: FamilyMemberRole): FamilyMemberRole {
  const index = ASSIGNABLE_ROLES.indexOf(role);
  if (index === -1) return ASSIGNABLE_ROLES[0];
  return ASSIGNABLE_ROLES[(index + 1) % ASSIGNABLE_ROLES.length];
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function MemberRolesScreen() {
  const router = useRouter();
  const familyQuery = useFamilyQuery();
  const updateMember = useUpdateMemberMutation();
  const removeMember = useRemoveMemberMutation();
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const members = familyQuery.data?.members ?? [];
  const adultCount = members.length;
  const freeSeatLimit = 2;
  const atFreeSeatLimit = adultCount >= freeSeatLimit;

  async function handleRoleChange(memberId: string, role: FamilyMemberRole) {
    setActionError(null);
    setPendingMemberId(memberId);
    try {
      await updateMember.mutateAsync({ memberId, patch: { role } });
    } catch (error) {
      setActionError(errorMessage(error, "Couldn’t change role. Check your connection and try again."));
    } finally {
      setPendingMemberId(null);
    }
  }

  function confirmRemove(memberId: string, displayName: string) {
    Alert.alert(
      `Remove ${displayName}?`,
      "They lose access to this household immediately. Memories they authored stay in the journal.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void handleRemove(memberId),
        },
      ],
    );
  }

  async function handleRemove(memberId: string) {
    setActionError(null);
    setPendingMemberId(memberId);
    try {
      await removeMember.mutateAsync(memberId);
    } catch (error) {
      setActionError(errorMessage(error, "Couldn’t remove member. Check your connection and try again."));
    } finally {
      setPendingMemberId(null);
    }
  }

  return (
    <SoftStackShell title="Household roles" onBack={() => router.back()}>
      <AppText variant="bodySmall" tone="secondary">
        Owners manage billing and invites. Contributors can add memories and view recaps. Free
        includes 2 adults · {adultCount}/{freeSeatLimit} seats used.
      </AppText>

      {actionError ? (
        <Surface tone="card" radiusSize="lg" style={styles.errorCard}>
          <AppText variant="bodySmall" style={{ color: colors.status.error }}>
            {actionError}
          </AppText>
        </Surface>
      ) : null}

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
          const isOwner = member.role === "OWNER";
          const isPending = pendingMemberId === member.id;
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

              {!isOwner ? (
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Change ${member.displayName}'s role`}
                    disabled={isPending}
                    onPress={() => void handleRoleChange(member.id, nextAssignableRole(member.role))}
                    style={styles.actionBtn}
                  >
                    <Feather name="repeat" size={14} color={colors.brand.honeyDeep} />
                    <AppText variant="caption" weight="semibold" style={styles.actionLabel}>
                      {isPending ? "Updating…" : "Change role"}
                    </AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.displayName} from household`}
                    disabled={isPending}
                    onPress={() => confirmRemove(member.id, member.displayName)}
                    style={styles.actionBtn}
                  >
                    <Feather name="user-x" size={14} color={colors.status.error} />
                    <AppText variant="caption" weight="semibold" style={{ color: colors.status.error }}>
                      Remove
                    </AppText>
                  </Pressable>
                </View>
              ) : null}
            </Surface>
          );
        })
      )}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    borderColor: colors.status.error,
    borderWidth: borderWidth.hairline,
  },
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
  actions: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 32,
  },
  actionLabel: {
    color: colors.brand.honeyDeep,
  },
});
