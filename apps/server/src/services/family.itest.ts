import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { ServiceError } from "@/services/errors";
import {
  requireActiveMembership,
  resolveActiveChild,
  resolveCurrentFamily,
} from "@/services/family";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";
import {
  addMember,
  createChild,
  createFamilyWithOwner,
  createUser,
} from "@/test/helpers/factories";

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("resolveCurrentFamily", () => {
  it("returns null when the user has no household yet", async () => {
    const user = await createUser();

    assert.equal(await resolveCurrentFamily(user.id), null);
  });

  it("uses the stored default when its membership is still active", async () => {
    const { family, ownerUserId } = await createFamilyWithOwner();

    assert.equal(await resolveCurrentFamily(ownerUserId), family.id);
  });

  it("falls back to the oldest active membership when the default went stale", async () => {
    const user = await createUser();
    const older = await createFamilyWithOwner({ name: "Older" });
    const newer = await createFamilyWithOwner({ name: "Newer" });

    await addMember(older.family.id, { userId: user.id, role: "CONTRIBUTOR" });
    await addMember(newer.family.id, { userId: user.id, role: "CONTRIBUTOR" });

    // Points at a household the user was never a member of.
    await prisma.user.update({
      where: { id: user.id },
      data: { defaultFamilyId: newer.family.id },
    });
    await prisma.familyMember.updateMany({
      where: { familyId: newer.family.id, userId: user.id },
      data: { status: "REMOVED", removedAt: new Date() },
    });

    assert.equal(await resolveCurrentFamily(user.id), older.family.id);
  });

  it("persists the corrected pointer so the next read is cheap", async () => {
    const user = await createUser();
    const { family } = await createFamilyWithOwner();
    await addMember(family.id, { userId: user.id });

    await resolveCurrentFamily(user.id);

    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(stored?.defaultFamilyId, family.id);
  });

  it("clears the pointer when the last membership goes inactive", async () => {
    const user = await createUser();
    const { family } = await createFamilyWithOwner();
    const { membership } = await addMember(family.id, { userId: user.id });
    await resolveCurrentFamily(user.id);

    await prisma.familyMember.update({
      where: { id: membership.id },
      data: { status: "REMOVED", removedAt: new Date() },
    });

    assert.equal(await resolveCurrentFamily(user.id), null);
    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(stored?.defaultFamilyId, null);
  });
});

describe("requireActiveMembership", () => {
  it("returns the membership for an active member", async () => {
    const { family, ownerUserId } = await createFamilyWithOwner();

    const membership = await requireActiveMembership(ownerUserId, family.id);

    assert.equal(membership.role, "OWNER");
  });

  it("denies an invited-but-not-active member", async () => {
    const { family } = await createFamilyWithOwner();
    const { userId } = await addMember(family.id, { status: "INVITED" });

    await assert.rejects(
      requireActiveMembership(userId, family.id),
      (error: unknown) => error instanceof ServiceError && error.statusCode === 404,
    );
  });

  it("denies a removed member", async () => {
    const { family } = await createFamilyWithOwner();
    const { userId } = await addMember(family.id, { status: "REMOVED" });

    await assert.rejects(requireActiveMembership(userId, family.id));
  });

  it("denies a member of another household without confirming it exists", async () => {
    const familyA = await createFamilyWithOwner({ name: "A" });
    const familyB = await createFamilyWithOwner({ name: "B" });

    await assert.rejects(
      requireActiveMembership(familyA.ownerUserId, familyB.family.id),
      (error: unknown) =>
        error instanceof ServiceError &&
        // 404, not 403: a 403 would prove household B exists.
        error.statusCode === 404 &&
        error.code === "FAMILY_NOT_FOUND",
    );
  });
});

describe("resolveActiveChild", () => {
  it("returns null during pregnancy, when the family has no children", async () => {
    const { family, ownerUserId } = await createFamilyWithOwner();

    assert.equal(await resolveActiveChild(ownerUserId, family.id), null);
  });

  it("picks the youngest child, not an arbitrary row", async () => {
    const { family, ownerUserId } = await createFamilyWithOwner();
    await createChild(family.id, { displayName: "Elder", dateOfBirth: "2023-04-01" });
    const younger = await createChild(family.id, {
      displayName: "Younger",
      dateOfBirth: "2026-05-01",
    });

    assert.equal(await resolveActiveChild(ownerUserId, family.id), younger.id);
  });

  it("resolves twins deterministically by birth order", async () => {
    const { family, ownerUserId } = await createFamilyWithOwner();
    // Inserted second-born first, so insertion order cannot be what decides.
    await createChild(family.id, {
      displayName: "Twin B",
      dateOfBirth: "2026-05-01",
      birthOrder: 1,
    });
    const first = await createChild(family.id, {
      displayName: "Twin A",
      dateOfBirth: "2026-05-01",
      birthOrder: 0,
    });

    const firstCall = await resolveActiveChild(ownerUserId, family.id);
    // Stability across repeated calls is the actual requirement: a flapping answer
    // would make Today's content reshuffle between requests.
    const secondCall = await resolveActiveChild(ownerUserId, family.id);

    assert.equal(firstCall, first.id);
    assert.equal(secondCall, first.id);
  });

  it("persists the resolved child", async () => {
    const { family, ownerUserId } = await createFamilyWithOwner();
    const child = await createChild(family.id);

    await resolveActiveChild(ownerUserId, family.id);

    const stored = await prisma.user.findUnique({ where: { id: ownerUserId } });
    assert.equal(stored?.activeChildId, child.id);
  });

  it("honours an explicitly chosen child over the youngest", async () => {
    const { family, ownerUserId } = await createFamilyWithOwner();
    const elder = await createChild(family.id, { dateOfBirth: "2023-04-01" });
    await createChild(family.id, { dateOfBirth: "2026-05-01" });

    await prisma.user.update({
      where: { id: ownerUserId },
      data: { activeChildId: elder.id },
    });

    assert.equal(await resolveActiveChild(ownerUserId, family.id), elder.id);
  });

  it("re-resolves away from an archived child", async () => {
    const { family, ownerUserId } = await createFamilyWithOwner();
    const archived = await createChild(family.id, {
      dateOfBirth: "2026-05-01",
      archivedAt: new Date(),
    });
    const active = await createChild(family.id, { dateOfBirth: "2023-04-01" });

    await prisma.user.update({
      where: { id: ownerUserId },
      data: { activeChildId: archived.id },
    });

    // The archived child is younger, so a naive "youngest" query would pick it.
    assert.equal(await resolveActiveChild(ownerUserId, family.id), active.id);
  });

  it("never returns another household's child", async () => {
    const familyA = await createFamilyWithOwner({ name: "A" });
    const familyB = await createFamilyWithOwner({ name: "B" });
    const childB = await createChild(familyB.family.id, { displayName: "Their child" });
    const childA = await createChild(familyA.family.id, { displayName: "Our child" });

    // A stale pointer surviving a household change is a cross-family data leak.
    await prisma.user.update({
      where: { id: familyA.ownerUserId },
      data: { activeChildId: childB.id },
    });

    const resolved = await resolveActiveChild(familyA.ownerUserId, familyA.family.id);

    assert.equal(resolved, childA.id);
    assert.notEqual(resolved, childB.id);
  });

  it("returns null rather than a stale pointer when the family has no children", async () => {
    const familyA = await createFamilyWithOwner({ name: "A" });
    const familyB = await createFamilyWithOwner({ name: "B" });
    const childB = await createChild(familyB.family.id);

    await prisma.user.update({
      where: { id: familyA.ownerUserId },
      data: { activeChildId: childB.id },
    });

    assert.equal(await resolveActiveChild(familyA.ownerUserId, familyA.family.id), null);
  });
});
