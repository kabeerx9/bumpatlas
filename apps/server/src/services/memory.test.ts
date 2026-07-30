import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeCursor, deriveTitle, encodeCursor } from "./memory";

describe("deriveTitle", () => {
  it("uses the first non-empty line", () => {
    assert.equal(deriveTitle("\n\nFirst long eye contact\nheld my gaze"), "First long eye contact");
  });

  it("truncates a long first line with an ellipsis", () => {
    const title = deriveTitle("x".repeat(200));

    assert.equal(title.length, 120);
    assert.ok(title.endsWith("…"));
  });

  it("falls back rather than producing an empty title", () => {
    assert.equal(deriveTitle("   \n  \n"), "Untitled memory");
  });
});

describe("memory cursor", () => {
  it("round-trips the sort tuple", () => {
    const cursor = { eventDate: "2026-07-29T00:00:00.000Z", id: "mem_1" };

    assert.deepEqual(decodeCursor(encodeCursor(cursor)), cursor);
  });

  it("is opaque to the client", () => {
    const encoded = encodeCursor({ eventDate: "2026-07-29T00:00:00.000Z", id: "mem_1" });

    assert.equal(/^[A-Za-z0-9_-]+$/.test(encoded), true);
    assert.equal(encoded.includes("mem_1"), false);
  });

  it("rejects a malformed cursor instead of returning page one", () => {
    // Silently restarting would make a client loop over the first page forever.
    assert.throws(() => decodeCursor("not-a-cursor"));
    assert.throws(() => decodeCursor(Buffer.from('{"id":1}').toString("base64url")));
  });
});
