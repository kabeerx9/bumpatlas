import { useAuth, useSignUp } from "@clerk/expo";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
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
  { uri: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=1200&q=80", rotate: "-5deg" },
  { uri: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=1200&q=80", rotate: "6deg" },
  { uri: "https://images.unsplash.com/photo-1457342813143-a1ae27448a82?w=1200&q=80", rotate: "-4deg" },
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

export function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
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
          pushDecoratedUrl(router, decorateUrl, returnTo);
        },
      });
    } else {
      setStatusMessage("That code did not complete sign-up. Please try again.");
    }
  };

  if (signUp.status === "complete" || isSignedIn) {
    return null;
  }

  const inputStyle = [
    styles.input,
    {
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
  ];

  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
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
          <Button
            variant="ghost"
            disabled={isFetching}
            onPress={() => void signUp.verifications.sendEmailCode()}
          >
            Resend Code
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
          Welcome to{"\n"}BumpAtlas
        </AppText>
        <AppText variant="body" tone="secondary" align="left" style={styles.subtitle}>
          Begin your journey — memories, wellness, and gentle tips in one calm place.
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
            style={inputStyle}
            value={password}
            placeholder="Create a password"
            placeholderTextColor={theme.colors.textMuted}
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

        <Button disabled={!canSubmit} onPress={() => void handleSubmit()} size="lg" style={styles.cta}>
          {isFetching ? "Signing up..." : "Continue"}
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
            Already have an Account?
          </AppText>
          <Link href={appRoutes.auth.signInWithReturnTo(String(returnTo))}>
            <AppText variant="bodySmall" weight="semibold" style={styles.link}>
              Sign in
            </AppText>
          </Link>
        </View>

        <View nativeID="clerk-captcha" />
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
