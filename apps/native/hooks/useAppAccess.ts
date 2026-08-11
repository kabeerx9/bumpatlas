import { useAuth } from "@clerk/expo";

import { useOnboarding } from "@/features/onboarding/providers/onboarding-provider";
import {
  deriveAppAccessCapabilities,
  deriveAppAccessState,
} from "@/hooks/app-access-state";
import { FEATURES } from "@/lib/features";

export {
  deriveAppAccessCapabilities,
  deriveAppAccessState,
} from "@/hooks/app-access-state";
export type {
  AppAccessCapabilities,
  AppAccessInput,
  AppAccessState,
} from "@/hooks/app-access-state";

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
  const capabilities = deriveAppAccessCapabilities(accessState);

  return {
    accessState,
    canAccessAppShell: accessState === "ready",
    ...capabilities,
  };
}
