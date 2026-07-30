import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

// A bare Windows path such as C:\... is not a valid ESM specifier, so convert to a file:// URL.
const envModule = pathToFileURL(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../packages/env/src/server.ts",
  ),
).href;

const baseEnv: Record<string, string> = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/app_starter",
  DIRECT_URL: "postgresql://postgres:postgres@localhost:5432/app_starter",
  CLERK_SECRET_KEY: "sk_test_replace_me",
  CLERK_PUBLISHABLE_KEY: "pk_test_replace_me",
  CLERK_WEBHOOK_SIGNING_SECRET: "whsec_test_placeholder",
  CORS_ORIGIN: "http://localhost:3001",
  CRON_SECRET: "cron_test_placeholder",
  NODE_ENV: "test",
};

function loadServerEnv(extraEnv: Record<string, string | undefined>) {
  return spawnSync(process.execPath, ["--import", "tsx", "-e", `import("${envModule}")`], {
    env: { ...process.env, ...baseEnv, ...extraEnv },
    encoding: "utf8",
  });
}

/**
 * Prints one parsed value so the assertion checks the transform result, not just
 * that the module loaded.
 */
function readServerEnvValue(key: string, extraEnv: Record<string, string | undefined> = {}) {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "-e",
      `import("${envModule}").then((m) => console.log(JSON.stringify(m.env["${key}"])))`,
    ],
    { env: { ...process.env, ...baseEnv, ...extraEnv }, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout.trim());
}

describe("server env", () => {
  it("requires CLERK_WEBHOOK_SIGNING_SECRET", () => {
    const result = loadServerEnv({ CLERK_WEBHOOK_SIGNING_SECRET: "" });

    assert.notEqual(result.status, 0);
  });

  it("loads when CLERK_WEBHOOK_SIGNING_SECRET is set", () => {
    const result = loadServerEnv({ CLERK_WEBHOOK_SIGNING_SECRET: "whsec_test_placeholder" });

    assert.equal(result.status, 0, result.stderr || result.stdout);
  });

  it("requires CRON_SECRET so cron routes are never unauthenticated", () => {
    const result = loadServerEnv({ CRON_SECRET: "" });

    assert.notEqual(result.status, 0);
  });

  it("parses ADMIN_USER_IDS into a trimmed, deduplicated list", () => {
    assert.deepEqual(
      readServerEnvValue("ADMIN_USER_IDS", {
        ADMIN_USER_IDS: " user_a , user_b ,user_a, ",
      }),
      ["user_a", "user_b"],
    );
  });

  it("defaults ADMIN_USER_IDS to nobody rather than everybody", () => {
    assert.deepEqual(readServerEnvValue("ADMIN_USER_IDS", { ADMIN_USER_IDS: "" }), []);
  });

  it("parses feature flags as booleans, not truthy strings", () => {
    assert.equal(readServerEnvValue("FEATURE_USER_GROUPS", { FEATURE_USER_GROUPS: "false" }), false);
    assert.equal(readServerEnvValue("FEATURE_USER_GROUPS", { FEATURE_USER_GROUPS: "true" }), true);
  });

  it("keeps FEATURE_USER_GROUPS off by default", () => {
    assert.equal(readServerEnvValue("FEATURE_USER_GROUPS", { FEATURE_USER_GROUPS: "" }), false);
  });

  it("rejects a non-boolean feature flag instead of coercing it", () => {
    const result = loadServerEnv({ FEATURE_COMMUNITY: "yes" });

    assert.notEqual(result.status, 0);
  });

  it("parses country feature overrides", () => {
    assert.deepEqual(
      readServerEnvValue("COUNTRY_FEATURE_OVERRIDES_JSON", {
        COUNTRY_FEATURE_OVERRIDES_JSON: '{"IN":{"FEATURE_COMMUNITY":false}}',
      }),
      { IN: { FEATURE_COMMUNITY: false } },
    );
  });

  it("fails startup on malformed country overrides rather than ignoring them", () => {
    const result = loadServerEnv({ COUNTRY_FEATURE_OVERRIDES_JSON: "{not json" });

    assert.notEqual(result.status, 0);
  });

  it("rejects a numeric limit that is not a positive integer", () => {
    const result = loadServerEnv({ FREE_CHILDREN_LIMIT: "0" });

    assert.notEqual(result.status, 0);
  });

  it("keeps the free child limit at 2 so twins never hit a paywall", () => {
    assert.equal(readServerEnvValue("FREE_CHILDREN_LIMIT", { FREE_CHILDREN_LIMIT: "" }), 2);
  });

  it("rejects a moderation coverage window that is not HH:MM UTC", () => {
    const result = loadServerEnv({ MODERATION_COVERAGE_START_UTC: "6am" });

    assert.notEqual(result.status, 0);
  });
});
