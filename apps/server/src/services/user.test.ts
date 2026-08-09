import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { meResponseSchema } from "@bumpatlas/contracts/me";

import { serializeUser } from "./user";

describe("serializeUser", () => {
  it("returns an ISO-string payload that matches the me contract", () => {
    const createdAt = new Date("2026-06-14T12:00:00.000Z");
    const updatedAt = new Date("2026-06-14T12:30:00.000Z");

    const serialized = serializeUser(
      {
        id: "user_123",
        clerkId: "clerk_123",
        email: "user@example.com",
        name: "Ada Lovelace",
        imageUrl: "https://example.com/avatar.png",
        // Household context and preferences exist on User but are deliberately not
        // part of the identity response: /api/me stays identity-only (correction 17),
        // and this assertion is what keeps it that way.
        defaultFamilyId: null,
        activeChildId: null,
        timeZone: null,
        primaryGoal: null,
        onboardingCompletedAt: null,
        isAdultAttested: false,
        adultAttestedAt: null,
        createdAt,
        updatedAt,
      },
      false,
    );

    assert.deepEqual(serialized, {
      id: "user_123",
      clerkId: "clerk_123",
      email: "user@example.com",
      name: "Ada Lovelace",
      imageUrl: "https://example.com/avatar.png",
      isAdmin: false,
      createdAt: "2026-06-14T12:00:00.000Z",
      updatedAt: "2026-06-14T12:30:00.000Z",
    });
    assert.deepEqual(meResponseSchema.parse(serialized), serialized);
  });

  it("passes the isAdmin flag through unchanged", () => {
    const createdAt = new Date("2026-06-14T12:00:00.000Z");
    const updatedAt = new Date("2026-06-14T12:30:00.000Z");

    const serialized = serializeUser(
      {
        id: "user_123",
        clerkId: "clerk_admin_fixture",
        email: "admin@example.com",
        name: "Admin",
        imageUrl: null,
        defaultFamilyId: null,
        activeChildId: null,
        timeZone: null,
        primaryGoal: null,
        onboardingCompletedAt: null,
        isAdultAttested: false,
        adultAttestedAt: null,
        createdAt,
        updatedAt,
      },
      true,
    );

    assert.equal(serialized.isAdmin, true);
  });
});
