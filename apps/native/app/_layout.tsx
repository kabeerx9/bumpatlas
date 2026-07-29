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
