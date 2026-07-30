import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
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
import { pushDecoratedUrl } from "@/features/auth/utils/navigation";
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
  const theme = useAppTheme();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const isFetching = fetchStatus === "fetching";
  const canSubmit = Boolean(emailAddress && password) && !isFetching;
  const emailCodeFactor = signIn.supportedSecondFactors.find(
    (factor) => factor.strategy === "email_code",
  );
  const requiresEmailCode =
    signIn.status === "needs_client_trust" ||
    (signIn.status === "needs_second_factor" && !!emailCodeFactor);

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
      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
        setStatusMessage(`We sent a verification code to ${emailCodeFactor.safeIdentifier}.`);
      } else {
        setStatusMessage("Email verification is required, but unavailable right now.");
      }
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

  const inputStyle = [
    styles.input,
    {
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
  ];

  if (requiresEmailCode) {
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
