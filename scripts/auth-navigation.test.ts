import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  pushDecoratedUrl,
  resolveAuthReturnTo,
} from "../apps/native/features/auth/utils/navigation.ts";
import { appRoutes } from "../apps/native/navigation/routes.ts";

describe("invite auth navigation", () => {
  it("allows only one-segment inbound invite routes to survive authentication", () => {
    assert.equal(resolveAuthReturnTo("/invite/abc_DEF-123"), "/invite/abc_DEF-123");
    assert.equal(resolveAuthReturnTo(["/invite/first", "/invite/second"]), "/invite/first");

    for (const unsafe of [
      undefined,
      "https://attacker.test/invite/token",
      "//attacker.test/invite/token",
      "/invite/token/extra",
      "/invite/%2Fdashboard",
      "/dashboard",
      "not-a-route",
    ]) {
      assert.equal(resolveAuthReturnTo(unsafe), appRoutes.home);
    }
  });

  it("encodes invite tokens and auth return targets exactly once", () => {
    const invite = appRoutes.inviteAccept("abc/def?next=evil");
    assert.equal(invite, "/invite/abc%2Fdef%3Fnext%3Devil");

    const signIn = appRoutes.auth.signInWithReturnTo("/invite/abc_DEF-123");
    const signUp = appRoutes.auth.signUpWithReturnTo("/invite/abc_DEF-123");
    const sessionExpired = appRoutes.sessionExpiredWithReturnTo(
      "/invite/abc_DEF-123",
    );
    assert.equal(signIn, "/sign-in?returnTo=%2Finvite%2Fabc_DEF-123");
    assert.equal(signUp, "/sign-up?returnTo=%2Finvite%2Fabc_DEF-123");
    assert.equal(
      sessionExpired,
      "/session-expired?returnTo=%2Finvite%2Fabc_DEF-123",
    );
    assert.equal(new URL(signIn, "https://app.test").searchParams.get("returnTo"), "/invite/abc_DEF-123");
  });

  it("keeps the path, query, and hash from an absolute Clerk-decorated URL", () => {
    const pushed: string[] = [];
    pushDecoratedUrl(
      { push: (href) => pushed.push(String(href)) },
      (url) => `https://clerk.test${url}?ticket=one#complete`,
      "/invite/token",
    );

    assert.deepEqual(pushed, ["/invite/token?ticket=one#complete"]);
  });
});
