import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockInvitePreview } from "@/features/mock/demo-data";
import { useMockUi } from "@/features/mock/mock-ui-context";
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
    <View style={styles.root}>
      <View style={styles.atmosphere} pointerEvents="none">
        <View style={styles.blob} />
        <View style={styles.blobSoft} />
      </View>

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityLabel="Close"
          >
            <Feather name="x" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Household invite</AppText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.body}>
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
        </View>

        <View style={styles.footer}>
          <Button size="lg" disabled={accepted} onPress={handleAccept}>
            Accept invite
          </Button>
          <Button variant="ghost" size="lg" onPress={() => router.back()} disabled={accepted}>
            Decline
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8EDE6",
  },
  atmosphere: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(229,155,138,0.26)",
    top: -90,
    right: -70,
  },
  blobSoft: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(243,199,188,0.28)",
    bottom: 100,
    left: -60,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 40 },
  body: {
    flex: 1,
    paddingHorizontal: spacing.page,
    gap: spacing.lg,
  },
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
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});
