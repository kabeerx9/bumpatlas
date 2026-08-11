import { useAuth, useClerk } from "@clerk/expo";
import { ApiError } from "@bumpatlas/contracts";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  Surface,
  colors,
  radius,
  spacing,
} from "@/design-system";
import { canSubmitInviteAcceptance } from "@/features/family/lib/complete-invite-onboarding";
import { useOnboarding } from "@/features/onboarding/providers/onboarding-provider";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import {
  useCompleteInviteOnboardingMutation,
  useInvitePreviewQuery,
} from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

function inviteErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Check your connection and try again.";
  }

  switch (error.code) {
    case "INVITE_EMAIL_MISMATCH":
      return "This invite was sent to a different account. Sign in with the addressed email.";
    case "INVITE_EXPIRED":
    case "INVITE_NOT_FOUND":
      return "This invite is invalid or has expired. Ask for a new link.";
    case "ALREADY_FAMILY_MEMBER":
      return "You already belong to this household. Open Family from the app.";
    default:
      return error.message || "Check your connection and try again.";
  }
}

function ConsentRow({
  checked,
  onPress,
  children,
}: {
  checked: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.consentRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? (
          <AppText variant="caption" style={styles.checkMark}>
            ✓
          </AppText>
        ) : null}
      </View>
      <View style={styles.consentCopy}>{children}</View>
    </Pressable>
  );
}

export function InviteAcceptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { completeOnboarding } = useOnboarding();
  const {
    clearDrafts,
    draftHydrationFailed,
    drafts,
    draftsHydrated,
    markPartnerJoined,
    retryDraftHydration,
    syncingDrafts,
  } = useAppState();
  const previewQuery = useInvitePreviewQuery(token ?? "");
  const joinInvite = useCompleteInviteOnboardingMutation(completeOnboarding);

  const [adultAttested, setAdultAttested] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [clearingDrafts, setClearingDrafts] = useState(false);
  const [retryingDrafts, setRetryingDrafts] = useState(false);

  const signedIn = isSignedIn === true;
  const legalAccepted = adultAttested && termsAccepted && privacyAccepted;
  const hasPendingDrafts = drafts.length > 0;
  const returnTo = token ? String(appRoutes.inviteAccept(token)) : String(appRoutes.home);
  const canAccept = canSubmitInviteAcceptance({
    signedIn,
    hasToken: Boolean(token),
    previewReady: Boolean(previewQuery.data),
    mutationPending:
      joinInvite.isPending || switchingAccount || clearingDrafts || retryingDrafts,
    draftsHydrated,
    draftCount: drafts.length,
    draftSyncPending: syncingDrafts,
    legalAccepted,
  });

  async function handleAccept() {
    if (!token || !canAccept) return;
    setActionError(null);

    if (hasPendingDrafts) {
      setActionError(
        "Sync or clear your offline drafts before switching households. Your drafts were not deleted.",
      );
      return;
    }

    try {
      await joinInvite.mutateAsync({ token });
      markPartnerJoined();
      router.replace(appRoutes.family);
    } catch (error) {
      setActionError(inviteErrorMessage(error));
    }
  }

  async function handleUseAnotherAccount() {
    if (switchingAccount) return;
    if (!draftsHydrated || hasPendingDrafts || syncingDrafts || clearingDrafts) {
      setActionError(
        "Sync or clear your offline drafts before switching accounts. Your drafts were not deleted.",
      );
      return;
    }
    setActionError(null);
    setSwitchingAccount(true);
    try {
      await signOut();
      router.replace(appRoutes.auth.signInWithReturnTo(returnTo));
    } catch {
      setActionError("We couldn't sign out. Check your connection and try again.");
    } finally {
      setSwitchingAccount(false);
    }
  }

  async function handleClearDrafts() {
    if (clearingDrafts) return;
    if (syncingDrafts) {
      setActionError("Wait for the current draft sync to finish, then clear any drafts left.");
      return;
    }
    setActionError(null);
    setClearingDrafts(true);
    try {
      const cleared = await clearDrafts();
      if (!cleared) {
        setActionError(
          "We couldn't clear the drafts from this device. They are still here; try again before joining.",
        );
      }
    } finally {
      setClearingDrafts(false);
    }
  }

  async function handleRetryDraftHydration() {
    if (retryingDrafts || clearingDrafts) return;
    setActionError(null);
    setRetryingDrafts(true);
    try {
      const hydrated = await retryDraftHydration();
      if (!hydrated) {
        setActionError(
          "We still couldn't verify the offline draft queue. Retry or clear the device queue before joining.",
        );
      }
    } finally {
      setRetryingDrafts(false);
    }
  }

  function confirmClearDrafts() {
    Alert.alert(
      "Clear offline drafts?",
      "This permanently removes the unsynced drafts stored on this device. It does not delete any saved household memories.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear drafts",
          style: "destructive",
          onPress: () => void handleClearDrafts(),
        },
      ],
    );
  }

  const footer = signedIn ? (
    <>
      <Button
        size="lg"
        disabled={!canAccept}
        onPress={() => void handleAccept()}
      >
        {!draftsHydrated
          ? draftHydrationFailed
            ? "Resolve local drafts"
            : retryingDrafts
              ? "Retrying draft check…"
              : "Checking local drafts…"
          : syncingDrafts
            ? "Finishing draft sync…"
            : clearingDrafts
              ? "Clearing drafts…"
              : joinInvite.isPending
                ? "Joining…"
                : "Accept and join"}
      </Button>
      <Button
        variant="ghost"
        size="lg"
        onPress={() => router.back()}
        disabled={
          joinInvite.isPending || switchingAccount || clearingDrafts || retryingDrafts
        }
      >
        Not now
      </Button>
      <Button
        variant="ghost"
        size="lg"
        onPress={() => void handleUseAnotherAccount()}
        disabled={
          joinInvite.isPending ||
          switchingAccount ||
          clearingDrafts ||
          retryingDrafts ||
          syncingDrafts ||
          !draftsHydrated ||
          hasPendingDrafts
        }
      >
        {switchingAccount ? "Signing out…" : "Use another account"}
      </Button>
    </>
  ) : (
    <>
      <Button
        size="lg"
        disabled={!token || !previewQuery.data}
        onPress={() => router.push(appRoutes.auth.signUpWithReturnTo(returnTo))}
      >
        Create account to join
      </Button>
      <Button
        variant="ghost"
        size="lg"
        disabled={!token || !previewQuery.data}
        onPress={() => router.push(appRoutes.auth.signInWithReturnTo(returnTo))}
      >
        I already have an account
      </Button>
    </>
  );

  return (
    <SoftStackShell title="Household invite" onBack={() => router.back()} footer={footer}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Feather name="users" size={28} color={colors.brand.honeyDeep} />
        </View>
        <AppText variant="caption" tone="brand" style={styles.heroEyebrow}>
          You&apos;re invited
        </AppText>
        <AppText variant="heading" weight="semibold" align="center">
          {previewQuery.data ? `Join ${previewQuery.data.familyName}` : "Join a household"}
        </AppText>
        <AppText variant="bodySmall" tone="secondary" align="center">
          {previewQuery.isError
            ? "This invite link is invalid or has expired. Ask for a new one."
            : previewQuery.data
              ? `${previewQuery.data.inviterDisplayName} invited you as a ${previewQuery.data.role.toLowerCase()}.`
              : "Checking the household invitation…"}
        </AppText>
      </View>

      <Surface tone="card" elevated radiusSize="xl" style={styles.detailCard}>
        <View style={styles.detailRow}>
          <AppText variant="caption" tone="secondary">
            Rules
          </AppText>
          <AppText weight="semibold">Single-use · adult account required</AppText>
        </View>
        {previewQuery.data ? (
          <View style={styles.detailRow}>
            <AppText variant="caption" tone="secondary">
              Household
            </AppText>
            <AppText weight="semibold">{previewQuery.data.familyName}</AppText>
          </View>
        ) : null}
      </Surface>

      {signedIn ? (
        <View style={styles.consentBlock}>
          <AppText variant="label" weight="semibold">
            Before you join
          </AppText>
          <ConsentRow checked={adultAttested} onPress={() => setAdultAttested((value) => !value)}>
            <AppText variant="bodySmall">
              I confirm I am 18 or older. BumpAtlas is for adult caregivers.
            </AppText>
          </ConsentRow>
          <ConsentRow checked={termsAccepted} onPress={() => setTermsAccepted((value) => !value)}>
            <AppText variant="bodySmall">I agree to the Terms of Service</AppText>
            <Pressable
              onPress={(event) => {
                event.stopPropagation?.();
                router.push(appRoutes.legal("terms"));
              }}
              accessibilityRole="link"
            >
              <AppText variant="caption" weight="semibold" style={styles.link}>
                Read Terms
              </AppText>
            </Pressable>
          </ConsentRow>
          <ConsentRow checked={privacyAccepted} onPress={() => setPrivacyAccepted((value) => !value)}>
            <AppText variant="bodySmall">I agree to the Privacy Policy</AppText>
            <Pressable
              onPress={(event) => {
                event.stopPropagation?.();
                router.push(appRoutes.legal("privacy"));
              }}
              accessibilityRole="link"
            >
              <AppText variant="caption" weight="semibold" style={styles.link}>
                Read Privacy Policy
              </AppText>
            </Pressable>
          </ConsentRow>
        </View>
      ) : null}

      <View style={styles.note}>
        <Feather name="lock" size={16} color={colors.brand.honeyDeep} />
        <AppText variant="bodySmall" tone="secondary" style={styles.noteCopy}>
          Household memories are private. Connect posts stay separate — text only, no child
          photos.
        </AppText>
      </View>

      {draftHydrationFailed ? (
        <Surface tone="card" radiusSize="lg" style={styles.warningCard}>
          <AppText variant="bodySmall" style={styles.errorText}>
            We couldn&apos;t verify the offline drafts stored on this device. Joining or
            switching accounts stays blocked so old household data cannot cross over.
          </AppText>
          <Button
            variant="ghost"
            size="sm"
            disabled={retryingDrafts || clearingDrafts}
            onPress={() => void handleRetryDraftHydration()}
          >
            {retryingDrafts ? "Retrying…" : "Retry draft check"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={retryingDrafts || clearingDrafts}
            onPress={confirmClearDrafts}
          >
            {clearingDrafts ? "Clearing…" : "Clear device draft queue"}
          </Button>
        </Surface>
      ) : hasPendingDrafts ? (
        <Surface tone="card" radiusSize="lg" style={styles.warningCard}>
          <AppText variant="bodySmall" style={styles.errorText}>
            Sync or clear your offline drafts before joining another household. Nothing was
            deleted.
          </AppText>
          <Button
            variant="ghost"
            size="sm"
            disabled={clearingDrafts || syncingDrafts}
            onPress={confirmClearDrafts}
          >
            {syncingDrafts
              ? "Syncing…"
              : clearingDrafts
                ? "Clearing…"
                : "Clear offline drafts"}
          </Button>
        </Surface>
      ) : null}

      {actionError ? (
        <Surface tone="card" radiusSize="lg" style={styles.errorCard}>
          <AppText variant="bodySmall" style={styles.errorText}>
            {actionError}
          </AppText>
        </Surface>
      ) : null}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  heroEyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  detailCard: { gap: spacing.md },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  consentBlock: { gap: spacing.sm },
  consentRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.brand.honeyDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.brand.honey,
    borderColor: colors.brand.honey,
  },
  checkMark: { color: colors.brand.ink },
  consentCopy: { flex: 1, gap: 3 },
  link: { color: colors.text.link },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  noteCopy: { flex: 1, lineHeight: 20 },
  warningCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.status.warning,
  },
  errorCard: { borderWidth: 1, borderColor: colors.status.error },
  errorText: { color: colors.status.error },
});
