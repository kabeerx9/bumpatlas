import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALBUM_LAYER_ORDER,
  deriveAlbumSceneModel,
  nextAlbumDirection,
  resolveOnboardingCompletion,
} from "../apps/native/features/onboarding/lib/album-scene-model.ts";
import { CREATOR_ONBOARDING_ROLES } from "../apps/native/features/onboarding/lib/onboarding-role.ts";
import * as albumSceneModel from "../apps/native/features/onboarding/lib/album-scene-model.ts";

describe("living memory album scene model", () => {
  it("gives detached editorial phases more height without changing the bound album", () => {
    const resolver = (albumSceneModel as Record<string, unknown>).resolveAlbumSceneHeight;
    assert.equal(typeof resolver, "function", "scene height must be derived from its visual phase");

    const resolveHeight = resolver as (phase: "spread" | "focus" | "editorial" | "today") => number;
    assert.equal(resolveHeight("spread"), 184);
    assert.equal(resolveHeight("focus"), 184);
    assert.equal(resolveHeight("editorial"), 156);
    assert.equal(resolveHeight("today"), 156);
  });

  it("centers a portrait keepsake without shrinking it below the active page's focal area", () => {
    const resolver = (albumSceneModel as Record<string, unknown>).resolveBoundArtifactFrame;
    assert.equal(typeof resolver, "function", "the spread must expose its portrait-frame geometry");

    const frame = (resolver as (page: { width: number; height: number }) => {
      width: number;
      height: number;
      left: number;
      top: number;
    })({ width: 152, height: 174 });

    assert.deepEqual(frame, { width: 109, height: 135, left: 22, top: 20 });
    assert.ok(frame.width / 152 >= 0.7, "the keepsake should remain the right page's focal object");
  });

  it("keeps the cover behind pages and interactive story objects", () => {
    assert.ok(ALBUM_LAYER_ORDER.cover < ALBUM_LAYER_ORDER.pages);
    assert.ok(ALBUM_LAYER_ORDER.pages < ALBUM_LAYER_ORDER.fold);
    assert.ok(ALBUM_LAYER_ORDER.fold < ALBUM_LAYER_ORDER.thread);
    assert.ok(ALBUM_LAYER_ORDER.thread < ALBUM_LAYER_ORDER.content);
  });

  it("moves from a bound spread to an editorial page after profile", () => {
    const modelFor = (stage: Parameters<typeof deriveAlbumSceneModel>[0]["stage"]) =>
      deriveAlbumSceneModel({
        stage,
        direction: "forward",
        role: "expecting",
        householdName: "",
        childName: "",
        childDob: "",
        dueDate: "",
        goal: null,
      });

    assert.equal(modelFor("household").phase, "spread");
    assert.equal(modelFor("profile").phase, "focus");
    assert.equal(modelFor("goal").phase, "editorial");
    assert.equal(modelFor("complete").phase, "today");
  });

  it("turns an expecting profile into a personalized keepsake", () => {
    assert.deepEqual(
      deriveAlbumSceneModel({
        stage: "profile",
        direction: "forward",
        role: "expecting",
        householdName: "The Rivera family",
        childName: "",
        childDob: "",
        dueDate: "2026-11-18",
        goal: "memories",
      }),
      {
        stage: "profile",
        phase: "focus",
        direction: "forward",
        artifact: "expecting",
        chapter: "memories",
        householdLabel: "The Rivera family",
        profileLabel: "Due Nov 18, 2026",
      },
    );
  });

  it("keeps household creation limited to expecting and parent roles", () => {
    assert.deepEqual(CREATOR_ONBOARDING_ROLES, ["expecting", "parent"]);

    const parent = deriveAlbumSceneModel({
      stage: "role",
      direction: "back",
      role: "parent",
      householdName: "",
      childName: "Mila",
      childDob: "",
      dueDate: "",
      goal: null,
    });
    assert.equal(parent.artifact, "parent");
    assert.equal(parent.profileLabel, "Mila");
  });

  it("derives direction from the old and new step index", () => {
    assert.equal(nextAlbumDirection(2, 3), "forward");
    assert.equal(nextAlbumDirection(4, 3), "back");
  });

  it("keeps preview completion local and real completion submit-capable", () => {
    assert.equal(resolveOnboardingCompletion(true), "show-preview-completion");
    assert.equal(resolveOnboardingCompletion(false), "submit-and-show-completion");
  });
});
