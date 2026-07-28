import { Button as ExpoButton, Host, TextInput as ExpoTextInput } from "@expo/ui";
import { useAuth, useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React, { type ComponentProps } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppText,
  BrandWordmark,
  colors,
  radius,
  spacing,
} from "@/design-system";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { pushDecoratedUrl } from "@/features/auth/utils/navigation";
import { appRoutes } from "@/navigation/routes";

type UniversalInputProps = ComponentProps<typeof ExpoTextInput>;
type UniversalButtonVariant = ComponentProps<typeof ExpoButton>["variant"];

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

    const { error } = await signUp.password({
      emailAddress,
      password,
    });

    if (error) {
      console.error(JSON.stringify(error, null, 2));
      setStatusMessage(error.longMessage ?? "Unable to sign up. Please try again.");
      return;
    }

    await signUp.verifications.sendEmailCode();
    setStatusMessage(`We sent a verification code to ${emailAddress}.`);
  };

  const handleVerify = async () => {
    setStatusMessage(null);

    await signUp.verifications.verifyEmailCode({
      code,
    });

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session.currentTask);
            return;
          }

          pushDecoratedUrl(router, decorateUrl, appRoutes.home);
        },
      });
    } else {
      console.error("Sign-up attempt not complete:", signUp);
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.verifyContainer}>
          <BrandWordmark size="md" style={styles.logo} />
          <View style={styles.header}>
            <AppText variant="subhead" align="center">
              Verify your account
            </AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              Enter the email code to finish creating your account.
            </AppText>
          </View>
          {statusMessage ? <AppText style={styles.statusMessage}>{statusMessage}</AppText> : null}

          <Field label="Verification code" error={errors.fields.code?.message}>
            <UniversalTextInput
              placeholder="Enter your verification code"
              onChangeText={setCode}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => void handleVerify()}
            />
          </Field>

          <UniversalButton
            label={isFetching ? "Verifying..." : "Verify"}
            disabled={isFetching}
            onPress={() => void handleVerify()}
          />
          <UniversalButton
            label="I need a new code"
            variant="text"
            onPress={() => void signUp.verifications.sendEmailCode()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <BrandWordmark size="lg" style={styles.logo} />
          <View style={styles.header}>
            <AppText variant="subhead" align="center">
              Create account
            </AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              Start with email and password or continue with Google.
            </AppText>
          </View>

          {statusMessage ? <AppText style={styles.statusMessage}>{statusMessage}</AppText> : null}

          <GoogleSignInButton />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <AppText variant="caption" tone="muted" weight="semibold">
              OR
            </AppText>
            <View style={styles.dividerLine} />
          </View>

          <Field label="Email" error={errors.fields.emailAddress?.message}>
            <UniversalTextInput
              autoCapitalize="none"
              autoComplete="email"
              placeholder="Enter your email"
              onChangeText={setEmailAddress}
              keyboardType="email-address"
              returnKeyType="next"
            />
          </Field>

          <Field label="Password" error={errors.fields.password?.message}>
            <UniversalTextInput
              placeholder="Enter your password"
              secureTextEntry
              onChangeText={setPassword}
              autoComplete="password-new"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSubmit) {
                  void handleSubmit();
                }
              }}
            />
          </Field>

          <UniversalButton
            label={isFetching ? "Signing up..." : "Sign up"}
            disabled={!canSubmit}
            onPress={() => void handleSubmit()}
          />

          <View style={styles.toggleRow}>
            <AppText variant="caption" tone="secondary">
              Already have an account?
            </AppText>
            <Link href={appRoutes.auth.signIn}>
              <AppText variant="caption" weight="semibold" style={styles.toggleLink}>
                Sign in
              </AppText>
            </Link>
          </View>

          <View nativeID="clerk-captcha" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <AppText variant="caption" weight="semibold">
        {label}
      </AppText>
      {children}
      {error ? (
        <AppText variant="caption" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function UniversalTextInput(props: UniversalInputProps) {
  return (
    <Host matchContents={{ vertical: true }} ignoreSafeArea="all" style={styles.nativeInputHost}>
      <ExpoTextInput
        placeholderTextColor={colors.text.muted}
        cursorColor={colors.brand.purple500}
        selectionColor={colors.brand.lavender}
        style={styles.nativeInput}
        textStyle={styles.nativeInputText}
        {...props}
      />
    </Host>
  );
}

function UniversalButton({
  label,
  disabled,
  onPress,
  variant = "filled",
  style,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  variant?: UniversalButtonVariant;
  style?: ViewStyle;
}) {
  return (
    <View style={[disabled && styles.disabled, style]}>
      <Host matchContents={{ vertical: true }} ignoreSafeArea="all" style={styles.nativeButtonHost}>
        <ExpoButton
          label={label}
          variant={variant}
          disabled={disabled}
          onPress={onPress}
          style={variant === "text" ? styles.nativeTextButton : styles.nativeButton}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.card,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: spacing.md,
  },
  verifyContainer: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: 24,
    backgroundColor: colors.surface.card,
  },
  logo: {
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  nativeInputHost: {
    width: "100%",
    minHeight: 48,
  },
  nativeInput: {
    width: "100%",
    height: 48,
    borderWidth: 0.5,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#F9FAFB",
  },
  nativeInputText: {
    color: colors.text.primary,
    fontSize: 15,
  },
  nativeButtonHost: {
    width: "100%",
    minHeight: 46,
  },
  nativeButton: {
    width: "100%",
    height: 46,
    borderRadius: radius.md,
  },
  nativeTextButton: {
    width: "100%",
    minHeight: 40,
  },
  disabled: {
    opacity: 0.5,
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  toggleLink: {
    color: colors.brand.mint,
  },
  error: {
    color: colors.status.error,
  },
  statusMessage: {
    color: colors.text.secondary,
    textAlign: "center",
  },
});
