import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildTestApp } from "@/test/helpers/build-test-app";

import { registerHealthRoutes } from "./health";

async function createApp(pingDatabase: () => Promise<void>) {
  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerHealthRoutes, { pingDatabase });
    },
  });
}

describe("health routes", () => {
  it("reports liveness without touching the database", async () => {
    let pinged = false;
    const app = await createApp(async () => {
      pinged = true;
    });

    const response = await app.inject({ method: "GET", url: "/health/live" });

    assert.equal(response.statusCode, 200);
    // Liveness must not depend on Postgres, or a database blip triggers a restart
    // loop on a process that is perfectly healthy.
    assert.equal(pinged, false);
    await app.close();
  });

  it("reports readiness when the database answers", async () => {
    const app = await createApp(async () => {});

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: "ok" });
    await app.close();
  });

  it("returns 503 when the database is unreachable", async () => {
    const app = await createApp(async () => {
      throw new Error("connection terminated: password authentication failed for user 'x'");
    });

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    assert.equal(response.statusCode, 503);
    await app.close();
  });

  it("leaks no diagnostic detail on an unauthenticated route", async () => {
    const app = await createApp(async () => {
      throw new Error("connection terminated: password authentication failed for user 'x'");
    });

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    assert.deepEqual(response.json(), { status: "unavailable" });
    assert.equal(response.body.includes("password"), false);
    await app.close();
  });
});
