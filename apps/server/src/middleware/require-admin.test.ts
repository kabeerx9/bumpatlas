import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ServiceError } from "@/services/errors";

import { requireAdmin, requireCronSecret } from "./require-admin";

const authContext = (isAdmin: boolean) => ({
  clerkUserId: "clerk_1",
  userId: "user_1",
  defaultFamilyId: null,
  isAdmin,
});

describe("requireAdmin", () => {
  it("allows an admin through", () => {
    assert.doesNotThrow(() => requireAdmin(authContext(true)));
  });

  it("hides the admin surface from a non-admin with 404, not 403", () => {
    // A 403 would confirm that a moderation surface exists at this path.
    assert.throws(
      () => requireAdmin(authContext(false)),
      (error: unknown) =>
        error instanceof ServiceError &&
        error.statusCode === 404 &&
        error.code === "ROUTE_NOT_FOUND",
    );
  });
});

describe("requireCronSecret", () => {
  const secret = "cron_secret_value";

  it("accepts the configured bearer secret", () => {
    assert.doesNotThrow(() => requireCronSecret(`Bearer ${secret}`, secret));
  });

  it("rejects a wrong secret", () => {
    assert.throws(
      () => requireCronSecret("Bearer nope_wrong_value1", secret),
      (error: unknown) => error instanceof ServiceError && error.statusCode === 401,
    );
  });

  it("rejects a missing header", () => {
    assert.throws(() => requireCronSecret(undefined, secret));
  });

  it("rejects a raw secret without the Bearer scheme", () => {
    assert.throws(() => requireCronSecret(secret, secret));
  });

  it("rejects a secret of the wrong length without comparing content", () => {
    assert.throws(() => requireCronSecret(`Bearer ${secret}extra`, secret));
  });
});
