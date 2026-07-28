export const appRoutes = {
  home: "/",
  account: "/account",
  expoUi: "/expo-ui",
  widgets: "/widgets",
  auth: {
    signIn: "/sign-in",
    signUp: "/sign-up",
  },
  onboarding: "/(onboarding)",
  ssoCallback: "/sso-callback",
} as const;
