import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockInvitePreview } from "@/features/mock/demo-data";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

export function InviteAcceptScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { markPartnerJoined } = useMockUi();
  const [accepted, setAccepted] = useState(false);

  const invite = mockInvitePreview;

  function handleAccept() {
    setAccepted(true);
    markPartnerJoined();
    setTimeout(() => {
      router.replace(appRoutes.family);
    }, 1200);
  }

  return (
    <SoftStackShell
      title="Household invite"
      closeIcon="x"
      onBack={() => router.back()}
      footer={
        <>
          <Button size="lg" disabled={accepted} onPress={handleAccept}>
            Accept invite
          </Button>
          <Button variant="ghost" size="lg" onPress={() => router.back()} disabled={accepted}>
            Decline
          </Button>
        </>
      }
    >
      <>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Feather name="users" size={28} color={colors.text.inverse} />
          </View>
          <AppText variant="caption" style={styles.heroEyebrow}>
            You&apos;re invited
          </AppText>
          <AppText variant="heading" style={styles.heroTitle}>
            Join {invite.householdName}
          </AppText>
          <AppText variant="bodySmall" style={styles.heroCopy}>
            {invite.inviterName} invited you to help with {invite.childName}&apos;s journal and
            weekly recap.
          </AppText>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <AppText variant="caption" tone="secondary">
              Role
            </AppText>
            <AppText weight="semibold">{invite.role}</AppText>
          </View>
          <View style={styles.detailRow}>
            <AppText variant="caption" tone="secondary">
              Invite code
            </AppText>
            <AppText weight="semibold">{token ?? invite.token}</AppText>
          </View>
          <View style={styles.detailRow}>
            <AppText variant="caption" tone="secondary">
              Valid for
            </AppText>
            <AppText weight="semibold">{invite.expiresLabel}</AppText>
          </View>
          <View style={styles.detailRow}>
            <AppText variant="caption" tone="secondary">
              Rules
            </AppText>
            <AppText weight="semibold">Single-use · adult 18+ account required</AppText>
          </View>
        </View>

        <View style={styles.note}>
          <Feather name="lock" size={16} color={colors.brand.peach} />
          <AppText variant="bodySmall" tone="secondary" style={styles.noteCopy}>
            Household memories are private. Connect posts stay separate — text only, no child
            photos.
          </AppText>
        </View>

        {accepted ? (
          <View style={styles.success}>
            <Feather name="check-circle" size={20} color={colors.brand.peach} />
            <AppText weight="semibold">Welcome to the household</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Opening Family...
            </AppText>
          </View>
        ) : null}
      </>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.text.inverse,
    lineHeight: 34,
    textAlign: "center",
  },
  heroCopy: {
    color: "rgba(255,255,255,0.88)",
    lineHeight: 20,
    textAlign: "center",
  },
  detailCard: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  noteCopy: {
    flex: 1,
    lineHeight: 20,
  },
  success: {
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.brand.peachSoft,
  },
});
