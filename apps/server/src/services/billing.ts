import prisma from "@bumpatlas/db";
import type { SubscriptionStatus } from "@bumpatlas/db/types";
import { createHmac, timingSafeEqual } from "node:crypto";

import { writeAuditEventTx } from "@/services/audit";
import { freeEntitlementDefaults, premiumEntitlements } from "@/services/entitlement";
import { ServiceError } from "@/services/errors";

/**
 * RevenueCat event types this backend acts on. Anything else is recorded and ignored
 * rather than guessed at.
 */
const GRANTING_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
]);

const REVOKING_EVENTS = new Set(["EXPIRATION", "REFUND", "SUBSCRIPTION_PAUSED"]);

/** Cancellation is not revocation: access continues until the paid period ends. */
const CANCELLATION_EVENTS = new Set(["CANCELLATION"]);

export type RevenueCatEvent = {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
};

/**
 * Verifies the shared secret.
 *
 * RevenueCat sends it as an Authorization header value configured in their dashboard.
 * Compared in constant time, and a missing secret in env means every webhook is rejected
 * rather than silently trusted.
 */
export function verifyRevenueCatSecret(
  header: string | undefined,
  configured: string | undefined,
): void {
  if (!configured) {
    throw new ServiceError(503, "BILLING_UNAVAILABLE", "Billing is not configured.");
  }

  const provided = header?.startsWith("Bearer ") ? header.slice(7) : header;

  if (!provided) {
    throw new ServiceError(401, "UNAUTHENTICATED", "Unauthorized.");
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(configured);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ServiceError(401, "UNAUTHENTICATED", "Unauthorized.");
  }
}

/** Optional HMAC form, for deployments that enable signed payloads. */
export function verifyRevenueCatSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}

export type WebhookOutcome =
  | { handled: false; reason: "duplicate" | "unknown_user" | "ignored_type" | "out_of_order" }
  | { handled: true; familyId: string; isPremium: boolean };

/**
 * Applies a RevenueCat event.
 *
 * Three defences, in this order:
 *  1. `WebhookEvent` uniqueness on (provider, providerEventId) — providers retry, and the
 *     same event must not double-apply;
 *  2. `lastEventAt` — providers do not guarantee ordering, so a late EXPIRATION must not
 *     undo a newer RENEWAL;
 *  3. the entitlement write and the subscription write share one transaction, so limits
 *     and the reason for them can never disagree.
 *
 * A native "purchase success" is never accepted as proof: only this path grants premium.
 */
export async function applyRevenueCatEvent(event: RevenueCatEvent): Promise<WebhookOutcome> {
  const providerEventId = event.id;

  try {
    await prisma.webhookEvent.create({
      data: {
        provider: "REVENUECAT",
        providerEventId,
        eventType: event.type,
      },
    });
  } catch {
    // Already seen. Safe to return success to the provider so it stops retrying.
    return { handled: false, reason: "duplicate" };
  }

  const appUserId = event.app_user_id ?? event.original_app_user_id;

  if (!appUserId) {
    await markProcessed(providerEventId, "missing_app_user_id");
    return { handled: false, reason: "unknown_user" };
  }

  // The client sets RevenueCat's App User ID to the Clerk user ID.
  const user = await prisma.user.findUnique({
    where: { clerkId: appUserId },
    select: { id: true, defaultFamilyId: true },
  });

  const familyId = user?.defaultFamilyId ?? null;

  if (!user || !familyId) {
    // Recorded, not retried: the purchase may precede onboarding, and a restore will
    // reconcile it.
    await markProcessed(providerEventId, "unknown_user");
    return { handled: false, reason: "unknown_user" };
  }

  const isGranting = GRANTING_EVENTS.has(event.type);
  const isRevoking = REVOKING_EVENTS.has(event.type);
  const isCancellation = CANCELLATION_EVENTS.has(event.type);

  if (!isGranting && !isRevoking && !isCancellation) {
    await markProcessed(providerEventId, "ignored_type");
    return { handled: false, reason: "ignored_type" };
  }

  const eventAt = event.event_timestamp_ms ? new Date(event.event_timestamp_ms) : new Date();
  const existing = await prisma.subscription.findUnique({ where: { familyId } });

  if (existing?.lastEventAt && existing.lastEventAt > eventAt) {
    await markProcessed(providerEventId, "out_of_order");
    return { handled: false, reason: "out_of_order" };
  }

  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;

  const status: SubscriptionStatus = isGranting
    ? "ACTIVE"
    : isCancellation
      ? "CANCELLED"
      : "EXPIRED";

  // Cancelled but not yet expired still grants access — the user paid for the period.
  const isPremium = isGranting || (isCancellation && isStillWithinPeriod(expiresAt));

  await prisma.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: { familyId },
      create: {
        familyId,
        providerUserId: appUserId,
        productId: event.product_id ?? null,
        status,
        expiresAt,
        lastEventAt: eventAt,
      },
      update: {
        providerUserId: appUserId,
        productId: event.product_id ?? null,
        status,
        expiresAt,
        lastEventAt: eventAt,
      },
    });

    const limits = isPremium ? premiumEntitlements() : freeEntitlementDefaults();

    await tx.entitlementCache.upsert({
      where: { familyId },
      create: {
        familyId,
        ...limits,
        planId: event.product_id ?? null,
        renewsAt: expiresAt,
        source: "REVENUECAT",
      },
      update: {
        ...limits,
        planId: event.product_id ?? null,
        renewsAt: expiresAt,
        source: "REVENUECAT",
      },
    });

    await writeAuditEventTx(tx, {
      action: "billing.entitlement_changed",
      familyId,
      targetType: "subscription",
      targetId: familyId,
      // Event type and result only — never the provider payload.
      metadata: { eventType: event.type, isPremium },
    });
  });

  await markProcessed(providerEventId);

  return { handled: true, familyId, isPremium };
}

function isStillWithinPeriod(expiresAt: Date | null): boolean {
  return expiresAt !== null && expiresAt.getTime() > Date.now();
}

async function markProcessed(providerEventId: string, failureCode?: string): Promise<void> {
  await prisma.webhookEvent.updateMany({
    where: { provider: "REVENUECAT", providerEventId },
    data: { processedAt: new Date(), ...(failureCode ? { failureCode } : {}) },
  });
}

/**
 * Fails premium safely once the paid period has passed.
 *
 * Called on entitlement reads so a delayed or missed webhook cannot leave premium on
 * forever — and, just as importantly, cannot delete anything. The family drops to free
 * limits with all their data intact.
 */
export async function expireStalePremium(familyId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({ where: { familyId } });

  if (!subscription?.expiresAt) return;
  if (subscription.expiresAt.getTime() > Date.now()) return;
  if (subscription.status === "EXPIRED") return;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { familyId },
      data: { status: "EXPIRED" },
    });

    await tx.entitlementCache.updateMany({
      where: { familyId },
      data: { ...freeEntitlementDefaults(), planId: null, renewsAt: null },
    });
  });
}
