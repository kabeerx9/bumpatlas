import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { registerBillingRoutes } from "@/routes/v1/billing";
import { registerFamilyRoutes } from "@/routes/v1/families";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";

type App = Awaited<ReturnType<typeof createApp>>;

const WEBHOOK_SECRET = "rc_test_secret";

async function createApp() {
  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerFamilyRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerProfileRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerPreferenceRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerBillingRoutes, {
        requireAuth: testRequireAuth,
        webhookSecret: () => WEBHOOK_SECRET,
      });
    },
  });
}

async function onboard(app: App, clerkId: string) {
  await app.inject({
    method: "POST",
    url: "/api/v1/consents",
    headers: asUser(clerkId),
    payload: { type: "age_attestation", version: "2026-07-01" },
  });
  const family = await app.inject({
    method: "POST",
    url: "/api/v1/families",
    headers: asUser(clerkId),
    payload: { name: "Household" },
  });
  return family.json().id as string;
}

let eventCounter = 0;

function webhookEvent(overrides: Record<string, unknown> = {}) {
  eventCounter += 1;
  return {
    event: {
      id: `evt_${eventCounter}`,
      type: "INITIAL_PURCHASE",
      app_user_id: "clerk_owner",
      product_id: "premium_monthly",
      expiration_at_ms: Date.now() + 30 * 86_400_000,
      event_timestamp_ms: Date.now(),
      ...overrides,
    },
  };
}

const postWebhook = (app: App, payload: unknown, secret = WEBHOOK_SECRET) =>
  app.inject({
    method: "POST",
    url: "/webhooks/revenuecat",
    headers: { authorization: `Bearer ${secret}` },
    payload: payload as never,
  });

const getEntitlements = (app: App, clerkId: string) =>
  app.inject({ method: "GET", url: "/api/v1/entitlements", headers: asUser(clerkId) });

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("GET /api/v1/entitlements", () => {
  it("returns free defaults for a new household", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await getEntitlements(app, "clerk_owner");

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.isPremium, false);
    assert.equal(body.maxChildren, 2);
    assert.equal(body.source, "free");
    await app.close();
  });
});

describe("RevenueCat webhook", () => {
  it("rejects a wrong secret", async () => {
    const app = await createApp();

    const response = await postWebhook(app, webhookEvent(), "wrong_secret");

    assert.equal(response.statusCode, 401);
    assert.equal(await prisma.webhookEvent.count(), 0);
    await app.close();
  });

  it("rejects a missing secret", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/revenuecat",
      payload: webhookEvent() as never,
    });

    assert.equal(response.statusCode, 401);
    await app.close();
  });

  it("grants premium on purchase", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await postWebhook(app, webhookEvent());

    assert.equal(response.statusCode, 200);

    const entitlements = await getEntitlements(app, "clerk_owner");
    const body = entitlements.json();
    assert.equal(body.isPremium, true);
    // Premium means unlimited children.
    assert.equal(body.maxChildren, null);
    assert.equal(body.aiDailyLimit, 30);
    assert.equal(body.source, "revenuecat");
    await app.close();
  });

  it("is idempotent for a duplicate delivery", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const event = webhookEvent();

    const first = await postWebhook(app, event);
    const second = await postWebhook(app, event);

    // 200 both times so the provider stops retrying.
    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.equal(await prisma.webhookEvent.count(), 1);
    await app.close();
  });

  it("revokes premium on expiration", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await postWebhook(app, webhookEvent());

    await postWebhook(
      app,
      webhookEvent({
        type: "EXPIRATION",
        expiration_at_ms: Date.now() - 1000,
        event_timestamp_ms: Date.now() + 1000,
      }),
    );

    const body = (await getEntitlements(app, "clerk_owner")).json();
    assert.equal(body.isPremium, false);
    assert.equal(body.maxChildren, 2);
    await app.close();
  });

  it("keeps access after cancellation until the paid period ends", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await postWebhook(app, webhookEvent());

    await postWebhook(
      app,
      webhookEvent({
        type: "CANCELLATION",
        expiration_at_ms: Date.now() + 10 * 86_400_000,
        event_timestamp_ms: Date.now() + 1000,
      }),
    );

    // They paid for the period; cancelling is not a refund.
    assert.equal((await getEntitlements(app, "clerk_owner")).json().isPremium, true);
    await app.close();
  });

  it("ignores an out-of-order expiration that predates the current state", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const renewalAt = Date.now();

    await postWebhook(app, webhookEvent({ type: "RENEWAL", event_timestamp_ms: renewalAt }));
    // A late-delivered older event must not undo the newer renewal.
    await postWebhook(
      app,
      webhookEvent({
        type: "EXPIRATION",
        event_timestamp_ms: renewalAt - 60_000,
        expiration_at_ms: Date.now() - 1000,
      }),
    );

    assert.equal((await getEntitlements(app, "clerk_owner")).json().isPremium, true);
    await app.close();
  });

  it("records an unknown app user without failing the provider", async () => {
    const app = await createApp();

    const response = await postWebhook(app, webhookEvent({ app_user_id: "clerk_nobody" }));

    // Retrying will not make an unrecognised user recognisable.
    assert.equal(response.statusCode, 200);
    const recorded = await prisma.webhookEvent.findFirstOrThrow();
    assert.equal(recorded.failureCode, "unknown_user");
    await app.close();
  });

  it("ignores an event type it does not act on", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    await postWebhook(app, webhookEvent({ type: "TEST" }));

    assert.equal((await getEntitlements(app, "clerk_owner")).json().isPremium, false);
    const recorded = await prisma.webhookEvent.findFirstOrThrow();
    assert.equal(recorded.failureCode, "ignored_type");
    await app.close();
  });

  it("rejects a malformed event", async () => {
    const app = await createApp();

    const response = await postWebhook(app, { event: { type: "INITIAL_PURCHASE" } });

    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it("fails premium safely once the period has passed, without deleting data", async () => {
    const app = await createApp();
    const familyId = await onboard(app, "clerk_owner");
    await postWebhook(app, webhookEvent());

    // Simulate a missed renewal webhook: the period simply lapses.
    await prisma.subscription.update({
      where: { familyId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const body = (await getEntitlements(app, "clerk_owner")).json();

    assert.equal(body.isPremium, false);
    // The subscription row survives as the audit trail.
    const subscription = await prisma.subscription.findUniqueOrThrow({ where: { familyId } });
    assert.equal(subscription.status, "EXPIRED");
    await app.close();
  });

  it("never grants premium from a client claim alone", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    // There is no client-facing route that can set entitlements; only the webhook does.
    const attempt = await app.inject({
      method: "PATCH",
      url: "/api/v1/entitlements",
      headers: asUser("clerk_owner"),
      payload: { isPremium: true },
    });

    assert.equal(attempt.statusCode, 404);
    assert.equal((await getEntitlements(app, "clerk_owner")).json().isPremium, false);
    await app.close();
  });
});

describe("notification preferences", () => {
  it("returns defaults for a new user", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/notification-preferences",
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.prefs.dailyPrompt, true);
    assert.equal(body.quietStart, "21:00");
    await app.close();
  });

  it("merges a partial patch instead of resetting unspecified fields", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    await app.inject({
      method: "PATCH",
      url: "/api/v1/notification-preferences",
      headers: asUser("clerk_owner"),
      payload: { quietHoursEnabled: false },
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/notification-preferences",
      headers: asUser("clerk_owner"),
    });

    const body = response.json();
    assert.equal(body.quietHoursEnabled, false);
    // Everything the user had switched on must survive a single-toggle patch.
    assert.equal(body.prefs.dailyPrompt, true);
    assert.equal(body.prefs.weeklyRecap, true);
    assert.equal(body.quietStart, "21:00");
    await app.close();
  });

  it("rejects a malformed quiet hour", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/notification-preferences",
      headers: asUser("clerk_owner"),
      payload: { quietStart: "9pm" },
    });

    assert.equal(response.statusCode, 400);
    await app.close();
  });
});

describe("push tokens", () => {
  it("registers a device token", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/devices/push-token",
      headers: asUser("clerk_owner"),
      payload: { token: "device-token-1", platform: "ios" },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(await prisma.pushDevice.count(), 1);
    await app.close();
  });

  it("moves a token when another user signs in on the same device", async () => {
    const app = await createApp();
    await onboard(app, "clerk_first");
    await onboard(app, "clerk_second");

    await app.inject({
      method: "POST",
      url: "/api/v1/devices/push-token",
      headers: asUser("clerk_first"),
      payload: { token: "shared-device", platform: "ios" },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/devices/push-token",
      headers: asUser("clerk_second"),
      payload: { token: "shared-device", platform: "ios" },
    });

    const devices = await prisma.pushDevice.findMany({ include: { user: true } });

    // One row, owned by the current user: otherwise the previous account keeps receiving
    // this phone's notifications.
    assert.equal(devices.length, 1);
    assert.equal(devices[0]!.user.clerkId, "clerk_second");
    await app.close();
  });

  it("revives a token that had been disabled after a provider rejection", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    await app.inject({
      method: "POST",
      url: "/api/v1/devices/push-token",
      headers: asUser("clerk_owner"),
      payload: { token: "flaky-device", platform: "android" },
    });
    await prisma.pushDevice.updateMany({ data: { disabledAt: new Date() } });

    await app.inject({
      method: "POST",
      url: "/api/v1/devices/push-token",
      headers: asUser("clerk_owner"),
      payload: { token: "flaky-device", platform: "android" },
    });

    const device = await prisma.pushDevice.findFirstOrThrow();
    assert.equal(device.disabledAt, null);
    await app.close();
  });
});
