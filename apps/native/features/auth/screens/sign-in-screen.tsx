import { useSignIn } from "@clerk/expo";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppText,
  BrandWordmark,
  Button,
  borderWidth,
  colors,
  radius,
  spacing,
  useAppTheme,
} from "@/design-system";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import {
  pushDecoratedUrl,
  resolveAuthReturnTo,
} from "@/features/auth/utils/navigation";
import { appRoutes } from "@/navigation/routes";

const COLLAGE_IMAGES = [
  { uri: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=1200&q=80", rotate: "-7deg" },
  { uri: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1200&q=80", rotate: "4deg" },
  { uri: "https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=1200&q=80", rotate: "-3deg" },
] as const;

function PhotoCollageStrip() {
  const { height } = useWindowDimensions();
  if (height < 700) return null;

  return (
    <View style={collageStyles.row} pointerEvents="none">
      {COLLAGE_IMAGES.map((item, index) => (
        <Image
          key={item.uri}
          source={{ uri: item.uri }}
          style={[
            collageStyles.card,
            { transform: [{ rotate: item.rotate }] },
            index === 1 && collageStyles.cardLift,
          ]}
        />
      ))}
    </View>
  );
}

const collageStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    opacity: 0.92,
  },
  card: {
    width: 64,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
  },
  cardLift: {
    marginTop: -10,
  },
});

export function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const { returnTo: returnToParam } = useLocalSearchParams<{
    returnTo?: string | string[];
  }>();
  const returnTo = resolveAuthReturnTo(returnToParam);
  const theme = useAppTheme();
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
          pushDecoratedUrl(router, decorateUrl, returnTo);
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
          pushDecoratedUrl(router, decorateUrl, returnTo);
        },
      });
    } else {
      setStatusMessage("That code did not complete sign-in. Please try again.");
    }
  };

  const inputStyle = [
    styles.input,
    {
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
  ];

  if (awaitingCode) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
        <View style={styles.formWrap}>
          <BrandWordmark size="md" markOnly style={styles.logo} />
          <AppText variant="heading" weight="semibold" align="center">
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
            style={inputStyle}
            value={code}
            placeholder="000000"
            placeholderTextColor={theme.colors.textMuted}
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="hero" weight="semibold" align="left" style={styles.hero}>
          Welcome back
        </AppText>
        <AppText variant="body" tone="secondary" align="left" style={styles.subtitle}>
          Sign in to keep the journal going.
        </AppText>

        {statusMessage ? (
          <AppText variant="bodySmall" tone="secondary" align="left">
            {statusMessage}
          </AppText>
        ) : null}

        <View style={styles.field}>
          <AppText variant="label" tone="secondary">
            Email / Phone
          </AppText>
          <TextInput
            style={inputStyle}
            autoCapitalize="none"
            autoComplete="email"
            value={emailAddress}
            placeholder="Enter email or phone"
            placeholderTextColor={theme.colors.textMuted}
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
            style={inputStyle}
            value={password}
            placeholder="Enter password"
            placeholderTextColor={theme.colors.textMuted}
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

        <Button disabled={!canSubmit} onPress={() => void handleSubmit()} size="lg" style={styles.cta}>
          {isFetching ? "Signing in..." : "Continue"}
        </Button>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          <AppText variant="caption" tone="muted">
            Or continue with
          </AppText>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>

        <GoogleSignInButton returnTo={returnTo} />

        <View style={styles.toggleRow}>
          <AppText variant="bodySmall" tone="secondary">
            Don’t have an Account?
          </AppText>
          <Link href={appRoutes.auth.signUpWithReturnTo(String(returnTo))}>
            <AppText variant="bodySmall" weight="semibold" style={styles.link}>
              Sign up
            </AppText>
          </Link>
        </View>
      </ScrollView>

      <PhotoCollageStrip />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  hero: { marginBottom: spacing.xxs },
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
    borderWidth: borderWidth.thin,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
  },
  forgot: { alignSelf: "flex-end", paddingVertical: spacing.xs },
  forgotText: { color: colors.text.link },
  cta: { marginTop: spacing.xs },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dividerLine: { flex: 1, height: 1 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  link: { color: colors.text.link },
  error: { color: colors.status.error },
});
