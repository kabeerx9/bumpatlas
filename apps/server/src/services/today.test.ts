import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deterministicPick } from "./today";

const items = Array.from({ length: 20 }, (_, index) => ({ id: `item_${index}` }));

describe("deterministicPick", () => {
  it("returns the same item for the same user, date, and bucket", () => {
    const seed = { userId: "user_1", date: "2026-07-30", bucket: "capture" };

    assert.deepEqual(deterministicPick(items, seed), deterministicPick(items, seed));
  });

  it("varies by date, so the card changes tomorrow", () => {
    const today = deterministicPick(items, {
      userId: "user_1",
      date: "2026-07-30",
      bucket: "capture",
    });
    const tomorrow = deterministicPick(items, {
      userId: "user_1",
      date: "2026-07-31",
      bucket: "capture",
    });

    assert.notDeepEqual(today, tomorrow);
  });

  it("varies by bucket, so the four cards do not move together", () => {
    const capture = deterministicPick(items, {
      userId: "user_1",
      date: "2026-07-30",
      bucket: "capture",
    });
    const learn = deterministicPick(items, {
      userId: "user_1",
      date: "2026-07-30",
      bucket: "learn",
    });

    assert.notDeepEqual(capture, learn);
  });

  it("gives different users different cards on the same day", () => {
    const a = deterministicPick(items, { userId: "user_1", date: "2026-07-30", bucket: "capture" });
    const b = deterministicPick(items, { userId: "user_2", date: "2026-07-30", bucket: "capture" });

    assert.notDeepEqual(a, b);
  });

  it("returns null for an empty list rather than throwing", () => {
    // Normal before reviewed content exists: the card renders empty, Today still loads.
    assert.equal(deterministicPick([], { userId: "u", date: "d", bucket: "b" }), null);
  });

  it("spreads across the list instead of favouring one index", () => {
    const picked = new Set(
      Array.from({ length: 60 }, (_, day) =>
        deterministicPick(items, {
          userId: "user_1",
          date: `2026-07-${String((day % 28) + 1).padStart(2, "0")}`,
          bucket: `bucket_${day}`,
        })?.id,
      ),
    );

    assert.ok(picked.size > 8, `expected spread across the list, saw ${picked.size}`);
  });

  it("stays in range for a single-item list", () => {
    assert.deepEqual(deterministicPick([items[0]!], { userId: "u", date: "d", bucket: "b" }), items[0]);
  });
});
