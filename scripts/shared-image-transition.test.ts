import assert from "node:assert/strict";
import test from "node:test";

import {
  clampProgress,
  interpolateFrame,
} from "../apps/native/features/testing/lib/transition-geometry";

const source = { x: 20, y: 120, width: 160, height: 112 };
const destination = { x: 20, y: 360, width: 350, height: 220 };

test("interpolateFrame preserves the source and destination at the transition boundaries", () => {
  assert.deepEqual(interpolateFrame(source, destination, 0), source);
  assert.deepEqual(interpolateFrame(source, destination, 1), destination);
});

test("interpolateFrame moves and resizes every dimension at the midpoint", () => {
  assert.deepEqual(interpolateFrame(source, destination, 0.5), {
    x: 20,
    y: 240,
    width: 255,
    height: 166,
  });
});

test("clampProgress prevents transition overshoot", () => {
  assert.equal(clampProgress(-0.25), 0);
  assert.equal(clampProgress(1.25), 1);
  assert.deepEqual(interpolateFrame(source, destination, 2), destination);
});
