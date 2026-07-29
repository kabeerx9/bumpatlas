import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockHousehold, mockInvitePreview } from "@/features/mock/demo-data";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";

const inviteLink = `https://bumpatlas.app/invite/${mockInvitePreview.token}`;

export function InviteScreen() {
  const router = useRouter();
  const { markPartnerJoined, childDisplayName } = useMockUi();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function shareLink() {
    await Share.share({
      message: `Join our BumpAtlas household for ${childDisplayName}: ${inviteLink}`,
    });
  }

  function handleSend() {
    setSent(true);
    markPartnerJoined();
  }

  return (
    <SoftStackShell
      title="Invite partner"
      closeIcon="x"
      onBack={() => router.back()}
      scroll={false}
      footer={
        <>
          {sent ? (
            <View style={styles.sentBanner}>
              <Feather name="check-circle" size={18} color={colors.brand.peach} />
              <AppText variant="bodySmall">
                Invite sent — they&apos;ll join {mockHousehold.name} when they accept.
              </AppText>
            </View>
          ) : null}
          <Button
            size="lg"
            disabled={email.trim().length === 0}
            onPress={handleSend}
          >
            Send invite
          </Button>
          <Button variant="ghost" size="lg" onPress={() => router.back()}>
            Not now
          </Button>
        </>
      }
    >
      <View style={styles.body}>
        <View style={styles.hero}>
          <AppText variant="caption" style={styles.heroEyebrow}>
            Free · 2 adults included
          </AppText>
          <AppText variant="heading" style={styles.heroTitle}>
            Bring your partner into {childDisplayName}&apos;s story
          </AppText>
          <AppText variant="bodySmall" style={styles.heroCopy}>
            They can capture moments, see the weekly recap, and help — memories stay private to
            your household.
          </AppText>
        </View>

        <View style={styles.fieldCard}>
          <AppText weight="semibold">Partner email</AppText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="partner@email.com"
            placeholderTextColor={colors.text.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          <AppText variant="caption" tone="secondary">
            Or share a link if email isn&apos;t handy. Links are single-use, expire in 7 days, and
            require an adult (18+) account.
          </AppText>
        </View>

        <Pressable onPress={shareLink} style={styles.linkCard}>
          <View style={styles.linkIcon}>
            <Feather name="link" size={18} color={colors.brand.peach} />
          </View>
          <View style={styles.linkCopy}>
            <AppText weight="semibold">Copy invite link</AppText>
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {inviteLink}
            </AppText>
          </View>
          <Feather name="share-2" size={18} color={colors.brand.peach} />
        </Pressable>

        <View style={styles.note}>
          <Feather name="shield" size={16} color={colors.brand.peach} />
          <AppText variant="bodySmall" tone="secondary" style={styles.noteCopy}>
            Invites expire after 7 days. You can revoke access anytime from Family.
          </AppText>
        </View>
      </View>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing.lg,
  },
  hero: {
    borderRadius: 28,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.text.inverse,
    lineHeight: 34,
  },
  heroCopy: {
    color: "rgba(255,255,255,0.88)",
    lineHeight: 20,
  },
  fieldCard: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: "Poppins_400Regular",
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.peachSoft,
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
    backgroundColor: colors.brand.peachSoft,
    padding: spacing.md,
  },
});
