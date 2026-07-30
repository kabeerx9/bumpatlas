import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import {
  AppText,
  BrandWordmark,
  Button,
  colors,
  radius,
  spacing,
} from "@/design-system";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { pushDecoratedUrl } from "@/features/auth/utils/navigation";
import { SoftScreen } from "@/features/shared/components/soft-screen";
import { appRoutes } from "@/navigation/routes";

export function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  /**
   * Whether *this* screen sent a code and is waiting on it.
   *
   * Deliberately local state rather than a read of `signIn.status`. Clerk persists the
   * in-progress sign-in on the client, and the Expo token cache is backed by expo-secure-store
   * — the iOS Keychain, which survives deleting the app. Rendering the code step straight off
   * `signIn.status` therefore meant a half-finished sign-in stranded the user on "Verify Your
   * Account" on every subsequent cold start, with reinstalling the app powerless to clear it.
   * Gating on something that resets with the component guarantees a launch always starts here.
   */
  const [awaitingCode, setAwaitingCode] = React.useState(false);

  const isFetching = fetchStatus === "fetching";
  const canSubmit = Boolean(emailAddress && password) && !isFetching;
  const emailCodeFactor = signIn.supportedSecondFactors.find(
    (factor) => factor.strategy === "email_code",
  );

  const returnToCredentials = () => {
    setAwaitingCode(false);
    setCode("");
    setStatusMessage(null);
  };

  const handleSubmit = async () => {
    setStatusMessage(null);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) {
      setStatusMessage(error.longMessage ?? "Unable to sign in. Please try again.");
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          pushDecoratedUrl(router, decorateUrl, appRoutes.home);
        },
      });
    } else if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
      if (!emailCodeFactor) {
        // No factor means no code can ever arrive. Staying on the credentials form with an
        // explanation beats advancing to a code field that nothing will ever satisfy.
        setStatusMessage(
          "This account needs email verification, but no verification method is available. " +
            "Try another sign-in method or contact support.",
        );
        return;
      }

      const { error: codeError } = (await signIn.mfa.sendEmailCode()) ?? {};
      if (codeError) {
        setStatusMessage(codeError.longMessage ?? "Could not send a verification code.");
        return;
      }

      setAwaitingCode(true);
      setStatusMessage(`We sent a verification code to ${emailCodeFactor.safeIdentifier}.`);
    }
  };

  const handleVerify = async () => {
    setStatusMessage(null);
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          pushDecoratedUrl(router, decorateUrl, appRoutes.home);
        },
      });
    } else {
      setStatusMessage("That code did not complete sign-in. Please try again.");
    }
  };

  if (awaitingCode) {
    return (
      <SoftScreen scroll={false} edges={["top", "bottom"]}>
        <View style={styles.formWrap}>
          <BrandWordmark size="md" markOnly style={styles.logo} />
          <AppText variant="heading" align="center">
            Verify Your Account
          </AppText>
            <AppText variant="body" tone="secondary" align="center">
              Enter the 6-digit code we sent to your email.
            </AppText>
            {statusMessage ? (
              <AppText variant="bodySmall" tone="secondary" align="center">
                {statusMessage}
              </AppText>
            ) : null}
            <TextInput
              style={styles.input}
              value={code}
              placeholder="000000"
              placeholderTextColor={colors.text.muted}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={6}
            />
            <Button disabled={isFetching} onPress={() => void handleVerify()} size="lg">
              {isFetching ? "Verifying..." : "Verify"}
            </Button>
            {/* Without this there is no way out of the code step short of deleting the app —
                and even that does not help, because the Keychain outlives it. */}
            <Pressable
              accessibilityRole="button"
              disabled={isFetching}
              onPress={returnToCredentials}
              style={styles.secondaryAction}
            >
              <AppText variant="bodySmall" tone="secondary" align="center">
                Use a different account
              </AppText>
            </Pressable>
          </View>
      </SoftScreen>
    );
  }

  return (
    <SoftScreen edges={["top", "bottom"]} contentStyle={styles.scroll}>
            <BrandWordmark size="md" markOnly style={styles.logo} />
            <AppText variant="heading" align="center">
              Sign In
            </AppText>
            <AppText variant="body" tone="secondary" align="center" style={styles.subtitle}>
              Welcome back
            </AppText>

            {statusMessage ? (
              <AppText variant="bodySmall" tone="secondary" align="center">
                {statusMessage}
              </AppText>
            ) : null}

            <View style={styles.field}>
              <AppText variant="label" tone="secondary">
                Email / Phone
              </AppText>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                autoComplete="email"
                value={emailAddress}
                placeholder="Enter email or phone"
                placeholderTextColor={colors.text.muted}
                onChangeText={setEmailAddress}
                keyboardType="email-address"
              />
              {errors.fields.identifier ? (
                <AppText variant="caption" style={styles.error}>
                  {errors.fields.identifier.message}
                </AppText>
              ) : null}
            </View>

            <View style={styles.field}>
              <AppText variant="label" tone="secondary">
                Password
              </AppText>
              <TextInput
                style={styles.input}
                value={password}
                placeholder="Enter password"
                placeholderTextColor={colors.text.muted}
                secureTextEntry
                onChangeText={setPassword}
                autoComplete="password"
              />
              <Pressable
                style={styles.forgot}
                onPress={() => setStatusMessage("Password reset is not configured yet.")}
              >
                <AppText variant="caption" style={styles.forgotText}>
                  Forgot Password?
                </AppText>
              </Pressable>
              {errors.fields.password ? (
                <AppText variant="caption" style={styles.error}>
                  {errors.fields.password.message}
                </AppText>
              ) : null}
            </View>

            <Button disabled={!canSubmit} onPress={() => void handleSubmit()} size="lg">
              {isFetching ? "Signing in..." : "Continue"}
            </Button>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <AppText variant="caption" tone="muted">
                Or continue with
              </AppText>
              <View style={styles.dividerLine} />
            </View>

            <GoogleSignInButton />

            <View style={styles.toggleRow}>
              <AppText variant="bodySmall" tone="secondary">
                Don’t have an Account?
              </AppText>
              <Link href={appRoutes.auth.signUp}>
                <AppText variant="bodySmall" weight="semibold" style={styles.link}>
                  Sign up
                </AppText>
              </Link>
            </View>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  logo: { alignSelf: "center", marginBottom: spacing.sm },
  subtitle: { marginBottom: spacing.sm },
  secondaryAction: { paddingVertical: spacing.sm },
  formWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.page,
    gap: spacing.md,
  },
  field: { gap: spacing.xs },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.text.primary,
    backgroundColor: colors.surface.card,
  },
  forgot: { alignSelf: "flex-end", paddingVertical: spacing.xs },
  forgotText: { color: colors.text.link },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.subtle },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  link: { color: colors.brand.terracotta },
  error: { color: colors.status.error },
});
