import { useAuth, useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

export function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const isFetching = fetchStatus === "fetching";
  const canSubmit = Boolean(emailAddress && password) && !isFetching;

  const handleSubmit = async () => {
    setStatusMessage(null);
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      setStatusMessage(error.longMessage ?? "Unable to sign up. Please try again.");
      return;
    }
    await signUp.verifications.sendEmailCode();
    setStatusMessage(`We sent a verification code to ${emailAddress}.`);
  };

  const handleVerify = async () => {
    setStatusMessage(null);
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          pushDecoratedUrl(router, decorateUrl, appRoutes.home);
        },
      });
    } else {
      setStatusMessage("That code did not complete sign-up. Please try again.");
    }
  };

  if (signUp.status === "complete" || isSignedIn) {
    return null;
  }

  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
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
            <Button
              variant="ghost"
              disabled={isFetching}
              onPress={() => void signUp.verifications.sendEmailCode()}
            >
              Resend Code
            </Button>
          </View>
      </SoftScreen>
    );
  }

  return (
    <SoftScreen scroll={false} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            <BrandWordmark size="md" markOnly style={styles.logo} />
            <AppText variant="heading" align="center">
              Sign up
            </AppText>
            <AppText variant="body" tone="secondary" align="center" style={styles.subtitle}>
              Begin Your Journey
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
              {errors.fields.emailAddress ? (
                <AppText variant="caption" style={styles.error}>
                  {errors.fields.emailAddress.message}
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
                placeholder="Create a password"
                placeholderTextColor={colors.text.muted}
                secureTextEntry
                onChangeText={setPassword}
                autoComplete="password-new"
              />
              {errors.fields.password ? (
                <AppText variant="caption" style={styles.error}>
                  {errors.fields.password.message}
                </AppText>
              ) : null}
            </View>

            <Button disabled={!canSubmit} onPress={() => void handleSubmit()} size="lg">
              {isFetching ? "Signing up..." : "Continue"}
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
                Already have an Account?
              </AppText>
              <Link href={appRoutes.auth.signIn}>
                <AppText variant="bodySmall" weight="semibold" style={styles.link}>
                  Sign in
                </AppText>
              </Link>
            </View>

            <View nativeID="clerk-captcha" />
          </ScrollView>
        </KeyboardAvoidingView>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  logo: { alignSelf: "center", marginBottom: spacing.sm },
  subtitle: { marginBottom: spacing.sm },
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
