import { useAuth } from "@clerk/expo";

import { useOnboarding } from "@/features/onboarding/providers/onboarding-provider";
import { deriveAppAccessState } from "@/hooks/app-access-state";
import { FEATURES } from "@/lib/features";

export { deriveAppAccessState } from "@/hooks/app-access-state";
export type { AppAccessInput, AppAccessState } from "@/hooks/app-access-state";

export function useAppAccess() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isOnboardingComplete, isOnboardingLoading } = useOnboarding();
  const signedIn = isSignedIn === true;
  const accessState = deriveAppAccessState({
    isLoaded,
    isSignedIn: signedIn,
    isOnboardingLoading,
    isOnboardingComplete,
    forceOnboardingPreview: FEATURES.onboardingPreview,
  });

  return {
    accessState,
    canAccessAppShell: accessState === "ready",
    canAccessMainApp: accessState === "ready",
    canAccessAuth: accessState === "guest",
    canAccessOnboarding: accessState === "onboarding_required",
  };
}
