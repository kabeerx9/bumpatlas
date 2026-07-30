import {
  entitlementsResponseSchema,
  notificationPreferencesSchema,
  pushTokenInputSchema,
  updateNotificationPreferencesInputSchema,
} from "@bumpatlas/contracts/v1";
import { env } from "@bumpatlas/env/server";
import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/middleware/require-auth";
import { requireCurrentFamily } from "@/middleware/require-family-member";
import { applyRevenueCatEvent, expireStalePremium, verifyRevenueCatSecret } from "@/services/billing";
import { getEntitlements, serializeEntitlements } from "@/services/entitlement";
import { invalidInput } from "@/services/errors";
import {
  getNotificationPreferences,
  registerPushToken,
  updateNotificationPreferences,
} from "@/services/notification";
import { trackProductEvent } from "@/services/product-event";

export type BillingRouteDeps = {
  requireAuth: typeof requireAuth;
  webhookSecret: () => string | undefined;
};

export async function registerBillingRoutes(
  fastify: FastifyInstance,
  deps: Partial<BillingRouteDeps> = {},
) {
  const d = {
    requireAuth,
    webhookSecret: () => env.REVENUECAT_WEBHOOK_SECRET,
    ...deps,
  };

  fastify.get("/api/v1/entitlements", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const family = await requireCurrentFamily(auth);

    // Checked on read so a missed webhook cannot leave premium on indefinitely.
    await expireStalePremium(family.familyId);

    const entitlement = await getEntitlements(family.familyId);

    return reply.send(entitlementsResponseSchema.parse(serializeEntitlements(entitlement)));
  });

  fastify.get("/api/v1/notification-preferences", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    return reply.send(
      notificationPreferencesSchema.parse(await getNotificationPreferences(auth.userId)),
    );
  });

  fastify.patch("/api/v1/notification-preferences", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = updateNotificationPreferencesInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const preferences = await updateNotificationPreferences({
      userId: auth.userId,
      patch: parsed.data,
    });

    return reply.send(notificationPreferencesSchema.parse(preferences));
  });

  fastify.post("/api/v1/devices/push-token", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = pushTokenInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    await registerPushToken({
      userId: auth.userId,
      token: parsed.data.token,
      platform: parsed.data.platform,
    });

    return reply.code(204).send();
  });

  /**
   * Provider webhook. Authenticated by shared secret, not Clerk.
   *
   * Always answers 200 once the secret checks out, including for duplicates and unknown
   * users: a non-2xx makes RevenueCat retry, and retrying will not make an unrecognised
   * app user ID recognisable.
   */
  fastify.post("/webhooks/revenuecat", async (request, reply) => {
    verifyRevenueCatSecret(request.headers.authorization, d.webhookSecret());

    const body = request.body as { event?: Record<string, unknown> } | null;
    const event = body?.event;

    if (!event || typeof event.id !== "string" || typeof event.type !== "string") {
      // Malformed: 400 is honest, and a retry of the same malformed body is harmless.
      return reply.code(400).send({ error: { code: "INVALID_INPUT", message: "Malformed event.", requestId: request.id } });
    }

    const outcome = await applyRevenueCatEvent(event as never);

    // Event id and result only — never the payload, which carries billing detail.
    request.log.info(
      { eventId: event.id, eventType: event.type, handled: outcome.handled },
      "RevenueCat webhook processed",
    );

    if (outcome.handled && outcome.isPremium) {
      await trackProductEvent("PURCHASE_COMPLETED", {
        familyId: outcome.familyId,
        logger: request.log,
      });
    }

    return reply.send({ received: true });
  });
}
