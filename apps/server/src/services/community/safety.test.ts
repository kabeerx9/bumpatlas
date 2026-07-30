import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  accountAgeDays,
  canPostLinks,
  classifyReportPriority,
  isWithinModerationCoverage,
  scanText,
} from "./safety";

describe("scanText", () => {
  it("flags high-risk wording without blocking it", () => {
    const scan = scanText("i keep thinking about hurt myself and i dont know who to tell");

    assert.equal(scan.flagged, true);
    assert.ok(scan.flags.includes("high_risk"));
  });

  it("flags medical advice shapes", () => {
    assert.ok(scanText("just give 5ml of calpol, works every time").flags.includes("medical_advice"));
  });

  it("flags contact details", () => {
    assert.ok(scanText("dm me on instagram").flags.includes("contact_details"));
    assert.ok(scanText("email me at parent@example.com").flags.includes("contact_details"));
    assert.ok(scanText("call me on +44 7700 900123").flags.includes("contact_details"));
  });

  it("detects links in several shapes", () => {
    assert.equal(scanText("see https://example.com/thing").containsLink, true);
    assert.equal(scanText("check www.example.com").containsLink, true);
    assert.equal(scanText("try example.shop for cheap stuff").containsLink, true);
  });

  it("leaves an ordinary post unflagged", () => {
    const scan = scanText("anyone else finding evening fussiness peaks around the same hour?");

    assert.equal(scan.flagged, false);
    assert.equal(scan.containsLink, false);
  });

  it("does not flag a normal post that merely mentions sleep", () => {
    // Over-flagging would bury the real cases in the founder's queue.
    assert.equal(scanText("we finally got a longer stretch of sleep last night").flagged, false);
  });
});

describe("canPostLinks", () => {
  const now = new Date("2026-07-30T12:00:00.000Z");

  it("refuses an account younger than the window", () => {
    assert.equal(canPostLinks(new Date("2026-07-25T12:00:00.000Z"), now), false);
  });

  it("allows an account past the window", () => {
    assert.equal(canPostLinks(new Date("2026-07-01T12:00:00.000Z"), now), true);
  });

  it("reports account age in whole days", () => {
    assert.equal(accountAgeDays(new Date("2026-07-25T12:00:00.000Z"), now), 5);
  });
});

describe("isWithinModerationCoverage", () => {
  it("is open during the configured window", () => {
    // Defaults are 06:00–23:00 UTC.
    assert.equal(isWithinModerationCoverage(new Date("2026-07-30T12:00:00.000Z")), true);
  });

  it("is closed overnight", () => {
    assert.equal(isWithinModerationCoverage(new Date("2026-07-30T03:00:00.000Z")), false);
  });

  it("closes exactly at the end boundary", () => {
    assert.equal(isWithinModerationCoverage(new Date("2026-07-30T22:59:00.000Z")), true);
    assert.equal(isWithinModerationCoverage(new Date("2026-07-30T23:00:00.000Z")), false);
  });
});

describe("classifyReportPriority", () => {
  it("treats safety-of-life reasons as critical", () => {
    assert.equal(classifyReportPriority({ reason: "self harm" }), "CRITICAL");
    assert.equal(classifyReportPriority({ reason: "child safety concern" }), "CRITICAL");
    assert.equal(classifyReportPriority({ reason: "abuse" }), "CRITICAL");
  });

  it("escalates a mildly worded report when the content itself is high risk", () => {
    // The reporter may not know how serious it is.
    assert.equal(
      classifyReportPriority({ reason: "seems off", targetFlags: ["high_risk"] }),
      "CRITICAL",
    );
  });

  it("treats medical advice and harassment as high", () => {
    assert.equal(classifyReportPriority({ reason: "medical advice" }), "HIGH");
    assert.equal(classifyReportPriority({ reason: "harassment" }), "HIGH");
    assert.equal(
      classifyReportPriority({ reason: "not sure", targetFlags: ["medical_advice"] }),
      "HIGH",
    );
  });

  it("defaults to normal", () => {
    assert.equal(classifyReportPriority({ reason: "off topic" }), "NORMAL");
  });
});
