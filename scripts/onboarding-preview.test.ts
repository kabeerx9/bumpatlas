import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveAppAccessState } from "../apps/native/hooks/app-access-state.ts";

describe("onboarding preview access", () => {
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
