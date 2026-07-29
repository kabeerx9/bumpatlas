import { env } from "@bumpatlas/env/native";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { QueryClientProvider } from "@tanstack/react-query";
import * as ExpoSplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ClerkAuthSetup } from "@/components/clerk-auth-setup";
import { OnboardingProvider } from "@/features/onboarding/providers/onboarding-provider";
import { useResetSessionOnAuthChange } from "@/hooks/useResetSessionOnAuthChange";
import { NAV_THEME } from "@/lib/constants";
import { useAppFonts } from "@/lib/fonts";
import { queryClient } from "@/lib/queryClient";
import { useColorScheme } from "@/lib/use-color-scheme";

ExpoSplashScreen.preventAutoHideAsync().catch(() => undefined);

const LIGHT_THEME = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};

const DARK_THEME = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

function SessionResetBoundary({ children }: { children: ReactNode }) {
  useResetSessionOnAuthChange();
  return children;
}

function FontGate({ children }: { children: ReactNode }) {
  const { loaded, error } = useAppFonts();

  useEffect(() => {
    if (loaded || error) {
      void ExpoSplashScreen.hideAsync();
    }
  }, [error, loaded]);

  if (!loaded && !error) {
    return <View style={styles.container} />;
  }

  return children;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ClerkAuthSetup>
        <QueryClientProvider client={queryClient}>
          <SessionResetBoundary>
            <OnboardingProvider>
              <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
                <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
                <FontGate>
                  <GestureHandlerRootView style={styles.container}>{children}</GestureHandlerRootView>
                </FontGate>
              </ThemeProvider>
            </OnboardingProvider>
          </SessionResetBoundary>
        </QueryClientProvider>
      </ClerkAuthSetup>
    </ClerkProvider>
  );
}
