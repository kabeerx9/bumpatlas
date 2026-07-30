import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

import { registerErrorHandler } from "@/plugins/error-handler";
import { registerRequestContext } from "@/plugins/request-context";

export type TestAppOptions = {
  /** Route registrations under test. */
  register?: (fastify: FastifyInstance) => void | Promise<void>;
};

/**
 * A Fastify app wired with the real error handler and request context, but without
 * Clerk, CORS, helmet, or rate limiting.
 *
 * Those are excluded deliberately: including the rate limiter would make tests
 * order-dependent once a suite exceeds 120 requests a minute, and including Clerk
 * would require live tokens. The error handler *is* included, because "wrong family
 * returns 404 with a structured body" is exactly what these tests assert.
 */
export async function buildTestApp(options: TestAppOptions = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
    genReqId: () => randomUUID(),
    requestIdHeader: false,
  });

  registerRequestContext(fastify);
  registerErrorHandler(fastify);

  if (options.register) {
    await options.register(fastify);
  }

  await fastify.ready();
  return fastify;
}
