import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import {
  AppText,
  Button,
  Surface,
  borderWidth,
  colors,
  radius,
  spacing,
  useAppTheme,
} from "@/design-system";
import { createInviteDeliveryCoordinator } from "@/features/family/lib/invite-delivery";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import { useCreateInviteMutation, useFamilyQuery } from "@/lib/api/hooks";

export function InviteScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { markPartnerJoined } = useAppState();
  const familyQuery = useFamilyQuery();
  const childDisplayName = familyQuery.data?.childDisplayName ?? "your child";
  const householdName = familyQuery.data?.name ?? "your household";
  const createInvite = useCreateInviteMutation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [invite, setInvite] = useState<{
    token: string;
    inviteUrl: string;
    expiresAt: string;
  } | null>(null);
  const inviteDeliveryRef = useRef<ReturnType<
    typeof createInviteDeliveryCoordinator
  > | null>(null);
  if (!inviteDeliveryRef.current) {
    inviteDeliveryRef.current = createInviteDeliveryCoordinator((input) =>
      createInvite.mutateAsync(input),
    );
  }

  const inviteLink = invite?.inviteUrl ?? null;

  async function shareLink() {
    if (linkLoading || sending) return;
    setLinkLoading(true);
    try {
      const prepared = await inviteDeliveryRef.current!.prepare({ kind: "link" });
      setInvite(prepared.invite);
      await Share.share({
        message: `Join our BumpAtlas household for ${childDisplayName}: ${prepared.invite.inviteUrl}`,
      });
    } catch {
      Alert.alert("Couldn’t create invite", "Check your connection and try again.");
    } finally {
      setLinkLoading(false);
    }
  }

  async function handleSend() {
    if (sending || linkLoading || email.trim().length === 0 || invite) return;
    setSending(true);
    try {
      const prepared = await inviteDeliveryRef.current!.prepare({
        kind: "email",
        email: email.trim(),
      });
      if (prepared.delivery.kind !== "email") {
        Alert.alert("Invite link already created", "Share the existing link instead.");
        return;
      }
      setInvite(prepared.invite);
      setSent(true);
      markPartnerJoined();
    } catch {
      Alert.alert("Couldn’t send invite", "Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <SoftStackShell
      title="Invite partner"
      closeIcon="x"
      onBack={() => router.back()}
      footer={
        <>
          {sent ? (
            <View style={styles.sentBanner}>
              <Feather name="check-circle" size={18} color={colors.brand.honeyDeep} />
              <AppText variant="bodySmall">
                Invite sent — they&apos;ll join {householdName} when they accept.
              </AppText>
            </View>
          ) : null}
          <Button
            size="lg"
            disabled={
              email.trim().length === 0 || sending || linkLoading || Boolean(invite)
            }
            onPress={() => void handleSend()}
          >
            {sending ? "Sending…" : "Send invite"}
          </Button>
          <Button variant="ghost" size="lg" onPress={() => router.back()}>
            Not now
          </Button>
        </>
      }
    >
      <>
        <View style={styles.hero}>
          <AppText variant="caption" tone="brand" style={styles.heroEyebrow}>
            Free · 2 adults included
          </AppText>
          <AppText variant="heading" weight="semibold">
            Bring your partner into {childDisplayName}&apos;s story
          </AppText>
          <AppText variant="bodySmall" tone="secondary">
            They can capture moments, see the weekly recap, and help — memories stay private to
            your household.
          </AppText>
        </View>

        <Surface tone="card" elevated radiusSize="xl" style={styles.fieldCard}>
          <AppText weight="semibold">Partner email</AppText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="partner@email.com"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
          />
          <AppText variant="caption" tone="secondary">
            Or share a link if email isn&apos;t handy. Links are single-use, expire in 7 days, and
            require an adult (18+) account.
          </AppText>
        </Surface>

        <Pressable onPress={() => void shareLink()} disabled={linkLoading || sending}>
          <Surface tone="card" elevated radiusSize="xl" style={styles.linkCard}>
            <View style={styles.linkIcon}>
              <Feather name="link" size={18} color={colors.brand.honeyDeep} />
            </View>
            <View style={styles.linkCopy}>
              <AppText weight="semibold">Copy invite link</AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {linkLoading
                  ? "Preparing your invite link…"
                  : inviteLink ?? "Create a single-use invite link"}
              </AppText>
            </View>
            <Feather name="share-2" size={18} color={theme.colors.text} />
          </Surface>
        </Pressable>

        <View style={styles.note}>
          <Feather name="shield" size={16} color={colors.brand.honeyDeep} />
          <AppText variant="bodySmall" tone="secondary" style={styles.noteCopy}>
            Invites expire after 7 days. You can revoke access anytime from Family.
          </AppText>
        </View>
      </>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
  },
  heroEyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  fieldCard: { gap: spacing.sm },
  input: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  linkCopy: {
    flex: 1,
    gap: 2,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  noteCopy: {
    flex: 1,
    lineHeight: 20,
  },
  sentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.honeySoft,
    padding: spacing.md,
  },
});
