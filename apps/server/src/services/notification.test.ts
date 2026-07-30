import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isWithinQuietHours } from "./notification";

describe("isWithinQuietHours", () => {
  it("handles an overnight window", () => {
    const window = { quietStart: "21:00", quietEnd: "08:00" };

    // The common configuration, and the one a naive start <= now <= end gets wrong.
    assert.equal(isWithinQuietHours({ nowHHmm: "23:30", ...window }), true);
    assert.equal(isWithinQuietHours({ nowHHmm: "03:00", ...window }), true);
    assert.equal(isWithinQuietHours({ nowHHmm: "12:00", ...window }), false);
  });

  it("handles a same-day window", () => {
    const window = { quietStart: "13:00", quietEnd: "15:00" };

    assert.equal(isWithinQuietHours({ nowHHmm: "14:00", ...window }), true);
    assert.equal(isWithinQuietHours({ nowHHmm: "16:00", ...window }), false);
  });

  it("includes the start minute and excludes the end minute", () => {
    const window = { quietStart: "21:00", quietEnd: "08:00" };

    assert.equal(isWithinQuietHours({ nowHHmm: "21:00", ...window }), true);
    assert.equal(isWithinQuietHours({ nowHHmm: "08:00", ...window }), false);
  });

  it("treats an empty window as no quiet hours", () => {
    assert.equal(
      isWithinQuietHours({ nowHHmm: "12:00", quietStart: "09:00", quietEnd: "09:00" }),
      false,
    );
  });
});
