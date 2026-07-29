import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockInvitePreview } from "@/features/mock/demo-data";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useMockData } from "@/lib/api/client";
import { useAcceptInviteMutation } from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

type AcceptedFamily = {
  name: string;
  childDisplayName: string | null;
};

export function InviteAcceptScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { markPartnerJoined } = useMockUi();
  const acceptInvite = useAcceptInviteMutation();
  const [accepted, setAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptedFamily, setAcceptedFamily] = useState<AcceptedFamily | null>(null);

  async function handleAccept() {
    if (accepting || !token) return;
    setAccepting(true);
    try {
      const family = await acceptInvite.mutateAsync({ token });
      setAcceptedFamily({
        name: family.name,
        childDisplayName: family.childDisplayName ?? null,
      });
      setAccepted(true);
      markPartnerJoined();
      setTimeout(() => {
        router.replace(appRoutes.family);
      }, 1200);
    } catch {
      Alert.alert("Couldn’t accept invite", "Check your connection and try again.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <SoftStackShell
      title="Household invite"
      closeIcon="x"
      onBack={() => router.back()}
      footer={
        <>
          <Button
            size="lg"
            disabled={accepted || accepting || !token}
            onPress={() => void handleAccept()}
          >
            {accepting ? "Accepting…" : "Accept invite"}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onPress={() => router.back()}
            disabled={accepted || accepting}
          >
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
            {accepted && acceptedFamily ? `Welcome to ${acceptedFamily.name}` : "Join a household"}
          </AppText>
          <AppText variant="bodySmall" style={styles.heroCopy}>
            {accepted && acceptedFamily
              ? `You can now help capture ${
                  acceptedFamily.childDisplayName ?? "their"
                }'s moments and see the weekly recap.`
              : "Accept below to join the household that sent you this invite. You'll see their name once you accept."}
          </AppText>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <AppText variant="caption" tone="secondary">
              Invite code
            </AppText>
            <AppText weight="semibold">{token ?? "Missing invite code"}</AppText>
          </View>
          <View style={styles.detailRow}>
            <AppText variant="caption" tone="secondary">
              Rules
            </AppText>
            <AppText weight="semibold">Single-use · adult 18+ account required</AppText>
          </View>
          {useMockData ? (
            <View style={styles.detailRow}>
              <AppText variant="caption" tone="secondary">
                Demo preview
              </AppText>
              <AppText weight="semibold">
                {mockInvitePreview.householdName} · {mockInvitePreview.childName}
              </AppText>
            </View>
          ) : null}
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
