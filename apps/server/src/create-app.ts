import { env } from "@bumpatlas/env/server";
import { clerkPlugin } from "@clerk/fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";

import { registerErrorHandler } from "@/plugins/error-handler";
import { registerRequestContext } from "@/plugins/request-context";
import { registerAccountRoutes } from "@/routes/account";
import { registerHealthRoutes } from "@/routes/health";
import { registerMeRoutes } from "@/routes/me";
import { registerFamilyRoutes } from "@/routes/v1/families";
import { registerCronRoutes } from "@/routes/cron/index";
import { registerAiRoutes } from "@/routes/v1/ai";
import { registerBillingRoutes } from "@/routes/v1/billing";
import { registerCommunityRoutes } from "@/routes/v1/community";
import { registerContentRoutes } from "@/routes/v1/content";
import { registerDataRequestRoutes } from "@/routes/v1/data-requests";
import { registerMemoryRoutes } from "@/routes/v1/memories";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerModerationRoutes } from "@/routes/v1/moderation";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { registerPublicRecapRoutes, registerRecapRoutes } from "@/routes/v1/recaps";
import { registerTodayRoutes } from "@/routes/v1/today";
import { registerClerkWebhookRoutes } from "@/routes/webhooks/clerk";

const baseCorsConfig = {
  origin: env.CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Idempotency-Key",
    "X-Time-Zone",
  ],
  credentials: true,
  maxAge: 86400,
};

/**
 * §5.9. Pino redacts these before anything reaches a log sink.
 *
 * Bodies are not logged at all (Fastify does not log them by default, and nothing
 * here adds them) because on this product a request body is a memory, a child's
 * name, a community post, or an AI message.
 */
const REDACTED_LOG_PATHS = [
  'req.headers["authorization"]',
  'req.headers["cookie"]',
  'req.headers["x-time-zone"]',
  'req.headers["svix-id"]',
  'req.headers["svix-signature"]',
  'req.headers["svix-timestamp"]',
  'req.headers["idempotency-key"]',
  'res.headers["set-cookie"]',
];

/**
 * 1 MiB. Memories are text — media goes to object storage through a signed URL,
 * never through this process — so anything larger is a mistake or an attack, and
 * rejecting early keeps a malformed request from occupying a worker.
 */
const BODY_LIMIT_BYTES = 1_048_576;

export function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      redact: { paths: REDACTED_LOG_PATHS, censor: "[redacted]" },
    },
    bodyLimit: BODY_LIMIT_BYTES,
    // Generated, never taken from a client header: a caller-supplied request ID
    // could collide with or impersonate another request's log trail.
    genReqId: () => randomUUID(),
    requestIdHeader: false,
  });

  registerRequestContext(fastify);
  registerErrorHandler(fastify);

  fastify.register(fastifyHelmet, {
    // This is a JSON API with no browser-rendered pages of its own.
    contentSecurityPolicy: false,
  });
  fastify.register(fastifyCors, baseCorsConfig);

  /**
   * Coarse protection only (§5.8): in-memory, one instance, no Redis. Business
   * quotas — AI messages, community posts, family seats, media uploads — are
   * enforced in Postgres transactions instead, so they stay correct if this
   * process is ever replicated and this limiter becomes per-instance.
   */
  fastify.register(fastifyRateLimit, {
    max: 120,
    timeWindow: "1 minute",
    // Per authenticated user where possible; IP is a poor key behind carrier NAT.
    keyGenerator: (request) => {
      const auth = request.headers.authorization;
      return auth ? `auth:${auth.slice(-32)}` : `ip:${request.ip}`;
    },
    allowList: (request) => request.url.startsWith("/health/"),
  });

  fastify.register(clerkPlugin, {
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  });

  fastify.get("/", async () => {
    return "OK";
  });

  fastify.register(registerHealthRoutes);
  fastify.register(registerMeRoutes);
  fastify.register(registerAccountRoutes);
  fastify.register(registerClerkWebhookRoutes);

  // Phase 1
  fastify.register(registerFamilyRoutes);
  fastify.register(registerProfileRoutes);
  fastify.register(registerPreferenceRoutes);

  // Phase 2
  fastify.register(registerMemoryRoutes);

  // Phase 3
  fastify.register(registerTodayRoutes);
  fastify.register(registerContentRoutes);

  // Phase 4
  fastify.register(registerRecapRoutes);
  fastify.register(registerPublicRecapRoutes);

  // Phase 5
  fastify.register(registerBillingRoutes);

  // Phase 6
  fastify.register(registerDataRequestRoutes);
  fastify.register(registerCronRoutes);

  // Phase 7 — inert until FEATURE_AI and AI_ENABLED are both true and a provider is wired.
  fastify.register(registerAiRoutes);

  // Phase 8 — community and founder moderation.
  fastify.register(registerCommunityRoutes);
  fastify.register(registerModerationRoutes);

  return fastify;
}
