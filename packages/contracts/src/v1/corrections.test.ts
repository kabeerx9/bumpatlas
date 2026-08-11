import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  childSchema,
  convertPregnancyInputSchema,
  convertPregnancyResponseSchema,
  createConsentInputSchema,
  createMemoryInputSchema,
  cursorQuerySchema,
  entitlementsResponseSchema,
  groupSchema,
  listChildrenQuerySchema,
  memorySchema,
  moderationItemSchema,
  PREFERENCES_READ_ONLY_FIELDS,
  updateMemoryInputSchema,
  updatePreferencesInputSchema,
  v1ErrorResponseSchema,
} from "./index.ts";

const sampleChild = {
  id: "child_1",
  displayName: "Ava",
  dateOfBirth: "2026-05-01",
  birthOrder: 0,
  isActive: true,
  archivedAt: null,
};

describe("v1 error contract (correction 1)", () => {
  it("carries a request id so a user report maps to a log line", () => {
    const parsed = v1ErrorResponseSchema.parse({
      error: {
        code: "CHILD_LIMIT_REACHED",
        message: "You have reached your child limit.",
        details: { used: 2, limit: 2, upgradeAvailable: true },
        requestId: "req-1",
      },
    });

    assert.equal(parsed.error.requestId, "req-1");
  });

  it("rejects an empty code", () => {
    assert.throws(() =>
      v1ErrorResponseSchema.parse({ error: { code: "", message: "x" } }),
    );
  });
});

describe("cursor pagination (correction 9)", () => {
  it("defaults the limit and coerces the query string", () => {
    assert.equal(cursorQuerySchema.parse({}).limit, 20);
    assert.equal(cursorQuerySchema.parse({ limit: "35" }).limit, 35);
  });

  it("refuses a limit above the maximum instead of silently clamping", () => {
    assert.throws(() => cursorQuerySchema.parse({ limit: "500" }));
  });
});

describe("memory targeting (corrections 26-28)", () => {
  it("accepts a child-targeted memory", () => {
    const parsed = createMemoryInputSchema.parse({
      familyId: "family_1",
      body: "First long eye contact.",
      eventDate: "2026-07-29",
      childId: "child_1",
    });

    assert.equal(parsed.childId, "child_1");
    assert.equal(parsed.visibility, "HOUSEHOLD");
  });

  it("accepts a pregnancy-targeted memory", () => {
    const parsed = createMemoryInputSchema.parse({
      familyId: "family_1",
      body: "Kick during the night.",
      eventDate: "2026-07-29",
      pregnancyId: "preg_1",
    });

    assert.equal(parsed.pregnancyId, "preg_1");
  });

  it("rejects a memory targeting both a child and a pregnancy", () => {
    assert.throws(() =>
      createMemoryInputSchema.parse({
        familyId: "family_1",
        body: "x",
        eventDate: "2026-07-29",
        childId: "child_1",
        pregnancyId: "preg_1",
      }),
    );
  });

  it("allows re-attribution but not to both at once", () => {
    assert.equal(updateMemoryInputSchema.parse({ childId: "child_2" }).childId, "child_2");
    assert.throws(() =>
      updateMemoryInputSchema.parse({ childId: "child_2", pregnancyId: "preg_1" }),
    );
  });

  it("exposes the target on the response so attribution is readable", () => {
    const parsed = memorySchema.parse({
      id: "mem_1",
      title: "First long eye contact",
      body: "Held my gaze.",
      eventDate: "2026-07-29",
      authorName: "You",
      visibility: "HOUSEHOLD",
      childId: "child_1",
      pregnancyId: null,
      mediaStorageKey: null,
      createdAt: "2026-07-29T10:00:00.000Z",
      updatedAt: "2026-07-29T10:00:00.000Z",
    });

    assert.equal(parsed.childId, "child_1");
  });
});

describe("child contract (corrections 29-30)", () => {
  it("carries sibling ordering and archive state", () => {
    assert.deepEqual(childSchema.parse(sampleChild), sampleChild);
  });

  it("excludes archived children unless asked", () => {
    assert.equal(listChildrenQuerySchema.parse({}).includeArchived, false);
    assert.equal(
      listChildrenQuerySchema.parse({ includeArchived: "true" }).includeArchived,
      true,
    );
  });
});

describe("pregnancy conversion (correction 33)", () => {
  it("still accepts the shipped single-baby payload", () => {
    const parsed = convertPregnancyInputSchema.parse({
      childName: "Ava",
      birthDate: "2026-05-01",
    });

    assert.ok("childName" in parsed);
  });

  it("accepts twins from one pregnancy", () => {
    const parsed = convertPregnancyInputSchema.parse({
      birthDate: "2026-05-01",
      babies: [{ displayName: "Ava" }, { displayName: "Noor" }],
    });

    assert.ok("babies" in parsed && parsed.babies.length === 2);
  });

  it("caps higher-order multiples at four", () => {
    assert.throws(() =>
      convertPregnancyInputSchema.parse({
        birthDate: "2026-05-01",
        babies: [1, 2, 3, 4, 5].map((n) => ({ displayName: `Baby ${n}` })),
      }),
    );
  });

  it("keeps the first child at the top level so the released screen parses", () => {
    const payload = { ...sampleChild, children: [sampleChild] };
    const parsed = convertPregnancyResponseSchema.parse(payload);

    // The shipped client parses this response with childSchema.
    assert.doesNotThrow(() => childSchema.parse(parsed));
    assert.equal(parsed.children.length, 1);
  });
});

describe("preferences (corrections 19, 32)", () => {
  it("requires at least one writable field", () => {
    assert.throws(() => updatePreferencesInputSchema.parse({}));
    assert.equal(
      updatePreferencesInputSchema.parse({ primaryGoal: "MEMORIES" }).primaryGoal,
      "MEMORIES",
    );
  });

  it("treats activeChildId as read-only so activation has one code path", () => {
    assert.ok(PREFERENCES_READ_ONLY_FIELDS.includes("activeChildId"));
    const parsed = updatePreferencesInputSchema.parse({
      timeZone: "Asia/Kolkata",
      activeChildId: "child_2",
    } as Record<string, unknown>);
    assert.equal("activeChildId" in parsed, false);
  });
});

describe("entitlements (correction 35)", () => {
  it("uses null for unlimited children", () => {
    const parsed = entitlementsResponseSchema.parse({
      isPremium: true,
      planId: "premium_monthly",
      renewsAt: "2026-08-29T00:00:00.000Z",
      mediaUploadsLimit: 1000,
      maxChildren: null,
      aiDailyLimit: 30,
    });

    assert.equal(parsed.maxChildren, null);
  });
});

describe("consents (correction 11)", () => {
  it("ignores a client-supplied acceptance time", () => {
    const parsed = createConsentInputSchema.parse({
      type: "terms",
      version: "2026-07-01",
      acceptedAt: "1999-01-01T00:00:00.000Z",
    } as Record<string, unknown>);

    assert.equal("acceptedAt" in parsed, false);
  });
});

describe("community and moderation (corrections 21, 25)", () => {
  it("expresses a member-created group the caller hosts", () => {
    const parsed = groupSchema.parse({
      id: "grp_1",
      name: "Night feeds crew",
      stageLabel: "Member group",
      description: null,
      kind: "user",
      role: "host",
      memberCount: 3,
      memberLimit: 50,
      postingEnabled: true,
      archived: false,
      joined: true,
    });

    assert.equal(parsed.kind, "user");
    assert.equal(parsed.role, "host");
  });

  it("tags queue items with their group origin and allows critical priority", () => {
    const parsed = moderationItemSchema.parse({
      id: "mod_1",
      type: "Report",
      summary: "Possible self-harm",
      postPreview: "…",
      reporter: "Anonymous",
      priority: "critical",
      status: "Open",
      groupId: "grp_1",
      groupKind: "user",
      createdAt: "2026-07-29T10:00:00.000Z",
    });

    assert.equal(parsed.priority, "critical");
    assert.equal(parsed.groupKind, "user");
  });
});
