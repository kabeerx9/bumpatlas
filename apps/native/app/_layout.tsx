import { Stack } from "expo-router";
import { useEffect, useState } from "react";

import { AppProviders } from "@/core/providers/AppProviders";
import { SplashScreen } from "@/features/auth/screens/splash-screen";
import { useAppAccess } from "@/hooks/useAppAccess";

function RootStack() {
  const [startupSplashComplete, setStartupSplashComplete] = useState(false);
  const {
    accessState,
    canAccessAuth,
    canAccessMainApp,
    canAccessOnboarding,
  } = useAppAccess();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStartupSplashComplete(true);
    }, 2000);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  if (
    !startupSplashComplete ||
    accessState === "auth_loading" ||
    accessState === "onboarding_loading"
  ) {
    return <SplashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={canAccessMainApp}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="capture" options={{ presentation: "modal" }} />
        <Stack.Screen name="care" options={{ presentation: "modal" }} />
        <Stack.Screen name="wellness-packs" />
        <Stack.Screen name="memory/[id]" />
        <Stack.Screen name="milestone/[id]" />
        <Stack.Screen name="badges" />
        <Stack.Screen name="pregnancy" />
        <Stack.Screen name="convert-birth" options={{ presentation: "modal" }} />
        <Stack.Screen name="guide/[id]" />
        <Stack.Screen name="connect-compose" options={{ presentation: "modal" }} />
        <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
        <Stack.Screen name="invite" options={{ presentation: "modal" }} />
        <Stack.Screen name="invite/[token]" />
        <Stack.Screen name="connect/post/[id]" />
        <Stack.Screen name="connect/report" options={{ presentation: "modal" }} />
        <Stack.Screen name="connect/blocked" />
        <Stack.Screen name="connect/groups" />
        <Stack.Screen name="recap/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="export-data" />
        <Stack.Screen name="notification-settings" />
        <Stack.Screen name="member-roles" />
        <Stack.Screen name="moderation" />
        <Stack.Screen name="legal/[doc]" />
        <Stack.Screen name="session-expired" />
        <Stack.Screen name="no-access" />
        <Stack.Screen name="assistant" options={{ presentation: "modal" }} />
        <Stack.Screen name="account" />
        <Stack.Screen name="expo-ui" />
        <Stack.Screen name="widgets" />
      </Stack.Protected>

      <Stack.Protected guard={canAccessAuth}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={canAccessOnboarding}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      <Stack.Screen name="sso-callback" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}
