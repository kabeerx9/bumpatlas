import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deriveAppAccessCapabilities,
  deriveAppAccessState,
} from "../apps/native/hooks/app-access-state.ts";
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

  it("gives the inbound invite gateway an explicit narrow access policy", () => {
    assert.deepEqual(deriveAppAccessCapabilities("guest"), {
      canAccessAuth: true,
      canAccessMainApp: false,
      canAccessOnboarding: false,
      canAccessInviteAccept: true,
      canAccessLegal: true,
    });
    assert.deepEqual(deriveAppAccessCapabilities("onboarding_required"), {
      canAccessAuth: false,
      canAccessMainApp: false,
      canAccessOnboarding: true,
      canAccessInviteAccept: true,
      canAccessLegal: true,
    });
    assert.deepEqual(deriveAppAccessCapabilities("ready"), {
      canAccessAuth: false,
      canAccessMainApp: true,
      canAccessOnboarding: false,
      canAccessInviteAccept: true,
      canAccessLegal: true,
    });
  });

  it("keeps only public invite and legal gateways mounted while identity gates load", () => {
    for (const state of ["auth_loading", "onboarding_loading"] as const) {
      assert.deepEqual(deriveAppAccessCapabilities(state), {
        canAccessAuth: false,
        canAccessMainApp: false,
        canAccessOnboarding: false,
        canAccessInviteAccept: true,
        canAccessLegal: true,
      });
    }
  });
});
