import { useClerk } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { resolveAuthReturnTo } from "@/features/auth/utils/navigation";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

export function SessionExpiredScreen() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { returnTo: returnToParam } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();
  const returnTo = resolveAuthReturnTo(returnToParam);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function restartSignIn() {
    if (isResetting) return;
    setIsResetting(true);
    setResetError(null);
    try {
      // Clear Clerk's local session before navigating: the auth stack is
      // intentionally unavailable while Clerk still considers the user signed in.
      await signOut();
      router.replace(appRoutes.auth.signInWithReturnTo(String(returnTo)));
    } catch {
      setResetError("We couldn't reset this session. Check your connection and try again.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <SoftStackShell
      title="Session expired"
      centered
      onBack={() => void restartSignIn()}
    >
      <View style={styles.iconBadge}>
        <Feather name="lock" size={28} color={colors.brand.ink} />
      </View>
      <AppText variant="body" tone="secondary" align="center" style={styles.copy}>
        Please sign in again to continue with your household data.
      </AppText>
      {resetError ? (
        <AppText variant="bodySmall" tone="secondary" align="center">
          {resetError}
        </AppText>
      ) : null}
      <Button size="lg" disabled={isResetting} onPress={() => void restartSignIn()}>
        {isResetting ? "Resetting…" : "Sign in"}
      </Button>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.honeySoft,
    marginBottom: spacing.xs,
  },
  copy: { maxWidth: 300, lineHeight: 24 },
});
