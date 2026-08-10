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
