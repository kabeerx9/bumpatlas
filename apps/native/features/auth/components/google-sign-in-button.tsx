import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, borderWidth, radius, spacing, useAppTheme } from "@/design-system";
import { appRoutes } from "@/navigation/routes";

export function GoogleSignInButton() {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const theme = useAppTheme();

  const onPress = async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ path: "sso-callback" }),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace(appRoutes.home);
      }
    } catch (err) {
      console.error("Google sign-in failed:", err);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      style={({ pressed }) => [
        styles.button,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View style={[styles.googleMark, { backgroundColor: theme.colors.surfaceWarm }]}>
          <AppText variant="caption" weight="bold">
            G
          </AppText>
        </View>
        <AppText variant="bodySmall" weight="semibold" tone="secondary">
          Continue with Google
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderWidth: borderWidth.thin,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  googleMark: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  pressed: {
    opacity: 0.7,
  },
});
