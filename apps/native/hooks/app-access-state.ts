export type AppAccessState =
  | "auth_loading"
  | "guest"
  | "onboarding_loading"
  | "onboarding_required"
  | "ready";

export type AppAccessInput = {
  isLoaded: boolean;
  isSignedIn: boolean;
  isOnboardingLoading: boolean;
  isOnboardingComplete: boolean;
  forceOnboardingPreview?: boolean;
};

export type AppAccessCapabilities = {
  canAccessAuth: boolean;
  canAccessMainApp: boolean;
  canAccessOnboarding: boolean;
  canAccessInviteAccept: boolean;
  canAccessLegal: boolean;
};

export function deriveAppAccessState(input: AppAccessInput): AppAccessState {
  if (!input.isLoaded) {
    return "auth_loading";
  }

  if (!input.isSignedIn) {
    return "guest";
  }

  if (input.forceOnboardingPreview) {
    return "onboarding_required";
  }

  if (input.isOnboardingLoading) {
    return "onboarding_loading";
  }

  return input.isOnboardingComplete ? "ready" : "onboarding_required";
}

/**
 * Route-group policy derived from the resolved identity state.
 *
 * The inbound invite gateway is intentionally narrower than the app shell: a
 * guest must be able to inspect a safe preview and a family-less signed-in user
 * must be able to join, while household creation and all household data remain
 * behind their existing gates.
 */
export function deriveAppAccessCapabilities(
  state: AppAccessState,
): AppAccessCapabilities {
  if (state === "auth_loading" || state === "onboarding_loading") {
    return {
      canAccessAuth: false,
      canAccessMainApp: false,
      canAccessOnboarding: false,
      // These routes are public and must stay mounted across the transient
      // identity-state handoff; otherwise Expo Router can discard a cold deep
      // link or the invite return path immediately after authentication.
      canAccessInviteAccept: true,
      canAccessLegal: true,
    };
  }

  return {
    canAccessAuth: state === "guest",
    canAccessMainApp: state === "ready",
    canAccessOnboarding: state === "onboarding_required",
    canAccessInviteAccept: true,
    canAccessLegal: true,
  };
}
