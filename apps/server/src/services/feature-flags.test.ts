import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { FastifyRequest } from "fastify";

import { applyCountryOverride, resolveRequestCountry } from "./feature-flags";

const requestWithHeaders = (headers: Record<string, string | string[]>) =>
  ({ headers }) as unknown as FastifyRequest;

describe("country feature overrides", () => {
  it("lets a country disable a globally enabled feature", () => {
    assert.equal(applyCountryOverride(true, false), false);
  });

  it("never lets a country enable a globally disabled feature", () => {
    // The important asymmetry: a global kill switch cannot be undone by config.
    assert.equal(applyCountryOverride(false, true), false);
  });

  it("leaves a feature enabled when the country has no opinion", () => {
    assert.equal(applyCountryOverride(true, undefined), true);
  });
});

describe("resolveRequestCountry", () => {
  it("reads a trusted hosting-provider header", () => {
    assert.equal(resolveRequestCountry(requestWithHeaders({ "cf-ipcountry": "in" })), "IN");
  });

  it("ignores a client-supplied country header", () => {
    // Only proxy-written headers are trusted; anything else would let a client
    // pick its own feature set.
    assert.equal(
      resolveRequestCountry(requestWithHeaders({ "x-country": "US", country: "US" })),
      null,
    );
  });

  it("ignores a malformed country value", () => {
    assert.equal(resolveRequestCountry(requestWithHeaders({ "cf-ipcountry": "XYZ" })), null);
    assert.equal(resolveRequestCountry(requestWithHeaders({ "cf-ipcountry": "" })), null);
  });
});
