import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeStage,
  daysBetween,
  gestationalWeekFromDueDate,
  toCalendarDate,
  type CalendarDate,
} from "./stage";

const date = (value: string): Date => new Date(`${value}T00:00:00.000Z`);
const cal = (value: string): CalendarDate => {
  const [year, month, day] = value.split("-").map(Number);
  return { year: year!, month: month!, day: day! };
};

describe("gestationalWeekFromDueDate", () => {
  it("reports week 40 on the due date", () => {
    assert.equal(gestationalWeekFromDueDate(cal("2026-12-01"), cal("2026-12-01")), 40);
  });

  it("reports week 1 at the very start", () => {
    // 280 days before the due date.
    assert.equal(gestationalWeekFromDueDate(cal("2026-12-01"), cal("2026-02-24")), 1);
  });

  it("advances on the boundary day, not the day after", () => {
    const dueDate = cal("2026-12-01");
    // 147 days elapsed — exactly 21 completed weeks.
    assert.equal(gestationalWeekFromDueDate(dueDate, cal("2026-07-21")), 21);
    // 146 days — one day short, so still 20.
    assert.equal(gestationalWeekFromDueDate(dueDate, cal("2026-07-20")), 20);
  });

  it("clamps a post-term pregnancy at 42 instead of running away", () => {
    assert.equal(gestationalWeekFromDueDate(cal("2026-12-01"), cal("2027-03-01")), 42);
  });

  it("never returns zero or negative for an implausibly distant due date", () => {
    assert.equal(gestationalWeekFromDueDate(cal("2028-12-01"), cal("2026-01-01")), 1);
  });
});

describe("computeStage", () => {
  it("returns unknown with no pregnancy and no child", () => {
    const result = computeStage({ pregnancy: null, activeChild: null, today: cal("2026-07-30") });

    assert.equal(result.stageMode, "unknown");
    assert.equal(result.stageKey, "UNKNOWN");
  });

  it("puts pregnancy ahead of an existing child", () => {
    const result = computeStage({
      pregnancy: { dueDate: date("2026-12-01") },
      activeChild: { id: "child_1", dateOfBirth: date("2024-01-01") },
      today: cal("2026-07-30"),
    });

    // A household with a toddler and a pregnancy is in the time-sensitive context.
    assert.equal(result.stageMode, "pregnancy");
    assert.equal(result.childId, null);
    assert.equal(result.gestationalWeek, 22);
  });

  it("reports no gestational week once postpartum", () => {
    const result = computeStage({
      pregnancy: null,
      activeChild: { id: "child_1", dateOfBirth: date("2026-05-01") },
      today: cal("2026-07-30"),
    });

    assert.equal(result.stageMode, "postpartum");
    assert.equal(result.gestationalWeek, null);
    assert.equal(result.dueDate, null);
    assert.equal(result.childId, "child_1");
  });

  it("follows the active child, so siblings give different stages", () => {
    const today = cal("2026-07-30");

    const baby = computeStage({
      pregnancy: null,
      activeChild: { id: "baby", dateOfBirth: date("2026-06-15") },
      today,
    });
    const toddler = computeStage({
      pregnancy: null,
      activeChild: { id: "toddler", dateOfBirth: date("2024-09-01") },
      today,
    });

    assert.equal(baby.stageKey, "NB_0_3M");
    assert.equal(toddler.stageKey, "T_12_24M");
  });

  it("is stable across repeated calls for the same inputs", () => {
    const input = {
      pregnancy: null,
      activeChild: { id: "child_1", dateOfBirth: date("2026-05-01") },
      today: cal("2026-07-30"),
    };

    assert.deepEqual(computeStage(input), computeStage(input));
  });

  it("buckets each infant stage at its boundary", () => {
    const cases: Array<[string, string]> = [
      ["2026-07-01", "NB_0_3M"],
      ["2026-04-01", "I_3_6M"],
      ["2025-12-01", "I_6_12M"],
      ["2025-06-01", "T_12_24M"],
      ["2023-06-01", "K_2_6Y"],
    ];

    for (const [dateOfBirth, expected] of cases) {
      const result = computeStage({
        pregnancy: null,
        activeChild: { id: "c", dateOfBirth: date(dateOfBirth) },
        today: cal("2026-07-30"),
      });
      assert.equal(result.stageKey, expected, `${dateOfBirth} should be ${expected}`);
    }
  });

  it("treats a birth date in the future as day zero rather than a negative age", () => {
    const result = computeStage({
      pregnancy: null,
      activeChild: { id: "c", dateOfBirth: date("2026-09-01") },
      today: cal("2026-07-30"),
    });

    assert.equal(result.stageKey, "NB_0_3M");
  });
});

describe("time zone handling", () => {
  it("resolves 'today' in the user's zone, not the server's", () => {
    // 19:30 UTC on 30 July is already 01:00 on 31 July in Kolkata.
    const instant = new Date("2026-07-30T19:30:00.000Z");

    assert.deepEqual(toCalendarDate(instant, "Asia/Kolkata"), cal("2026-07-31"));
    assert.deepEqual(toCalendarDate(instant, "UTC"), cal("2026-07-30"));
    // And west of UTC it can still be the previous day.
    assert.deepEqual(toCalendarDate(new Date("2026-07-30T02:00:00.000Z"), "America/Los_Angeles"), cal("2026-07-29"));
  });

  it("falls back to UTC when no zone has been recorded", () => {
    assert.deepEqual(
      toCalendarDate(new Date("2026-07-30T19:30:00.000Z"), null),
      cal("2026-07-30"),
    );
  });

  it("counts days across a DST transition without drifting", () => {
    // US DST starts 8 March 2026; calendar arithmetic must stay whole-day.
    assert.equal(daysBetween(cal("2026-03-01"), cal("2026-03-31")), 30);
  });
});
