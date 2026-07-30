import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildHighlights, isRecapEligible, weekStartFor } from "./recap";

describe("isRecapEligible", () => {
  it("qualifies on three memories alone", () => {
    assert.equal(isRecapEligible({ memoryCount: 3, storyDays: 0, wellnessDays: 0 }), true);
  });

  it("does not qualify on two memories alone", () => {
    assert.equal(isRecapEligible({ memoryCount: 2, storyDays: 0, wellnessDays: 0 }), false);
  });

  it("qualifies on a rhythm of two story days plus one wellness day", () => {
    assert.equal(isRecapEligible({ memoryCount: 0, storyDays: 2, wellnessDays: 1 }), true);
  });

  it("does not qualify on story days without wellness", () => {
    assert.equal(isRecapEligible({ memoryCount: 0, storyDays: 5, wellnessDays: 0 }), false);
  });

  it("does not qualify on wellness alone", () => {
    assert.equal(isRecapEligible({ memoryCount: 0, storyDays: 1, wellnessDays: 3 }), false);
  });

  it("does not qualify an empty week", () => {
    // A recap of nothing reads as a reminder of what the parent did not manage.
    assert.equal(isRecapEligible({ memoryCount: 0, storyDays: 0, wellnessDays: 0 }), false);
  });
});

describe("buildHighlights", () => {
  it("uses titles, capped at five", () => {
    const highlights = buildHighlights(
      Array.from({ length: 9 }, (_, index) => ({ title: `Memory ${index}` })),
    );

    assert.equal(highlights.length, 5);
    assert.equal(highlights[0], "Memory 0");
  });

  it("truncates a long title rather than republishing a paragraph", () => {
    const highlights = buildHighlights([{ title: "x".repeat(200) }]);

    assert.equal(highlights[0]!.length, 80);
    assert.ok(highlights[0]!.endsWith("…"));
  });

  it("returns nothing for a week with no memories", () => {
    assert.deepEqual(buildHighlights([]), []);
  });
});

describe("weekStartFor", () => {
  it("returns Monday for a midweek date", () => {
    // 30 July 2026 is a Thursday.
    assert.equal(weekStartFor(new Date("2026-07-30T12:00:00.000Z"), "UTC").toISOString().slice(0, 10), "2026-07-27");
  });

  it("treats Sunday as the end of the week that started six days earlier", () => {
    // 2 August 2026 is a Sunday.
    assert.equal(weekStartFor(new Date("2026-08-02T12:00:00.000Z"), "UTC").toISOString().slice(0, 10), "2026-07-27");
  });

  it("returns the same day for a Monday", () => {
    assert.equal(weekStartFor(new Date("2026-07-27T00:30:00.000Z"), "UTC").toISOString().slice(0, 10), "2026-07-27");
  });

  it("uses the family's time zone to decide which week it is", () => {
    // Late Sunday UTC is already Monday in Kolkata, so the weeks differ.
    const instant = new Date("2026-08-02T19:00:00.000Z");

    assert.equal(weekStartFor(instant, "UTC").toISOString().slice(0, 10), "2026-07-27");
    assert.equal(weekStartFor(instant, "Asia/Kolkata").toISOString().slice(0, 10), "2026-08-03");
  });
});
