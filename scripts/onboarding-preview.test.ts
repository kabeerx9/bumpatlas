import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveAppAccessState } from "../apps/native/hooks/app-access-state.ts";
import { FEATURES } from "../apps/native/lib/features.ts";

describe("onboarding preview access", () => {
  it("lets a completed user into the app when the shipped preview configuration is disabled", () => {
    const state = deriveAppAccessState({
      isLoaded: true,
      isSignedIn: true,
      isOnboardingLoading: false,
      isOnboardingComplete: true,
      forceOnboardingPreview: FEATURES.onboardingPreview,
    });

    assert.equal(state, "ready");
  });

  it("shows onboarding to a signed-in user who already completed it", () => {
    const state = deriveAppAccessState({
      isLoaded: true,
      isSignedIn: true,
      isOnboardingLoading: false,
      isOnboardingComplete: true,
      forceOnboardingPreview: true,
    });

    assert.equal(state, "onboarding_required");
  });
});
