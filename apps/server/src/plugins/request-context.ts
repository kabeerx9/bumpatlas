import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    /**
     * Validated IANA time zone from the `X-Time-Zone` header, or null.
     * `requireAuth` persists changes to `User.timeZone` without blocking.
     */
    timeZone: string | null;
  }
}

/**
 * Rejects anything `Intl` cannot resolve, which keeps an unusable string from
 * reaching date math where it would either throw deep in a service or silently
 * fall back to UTC and shift someone's "today".
 */
export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function registerRequestContext(fastify: FastifyInstance) {
  fastify.decorateRequest("timeZone", null);

  fastify.addHook("onRequest", async (request, reply) => {
    const header = request.headers["x-time-zone"];
    const value = Array.isArray(header) ? header[0] : header;

    request.timeZone = value && isValidTimeZone(value) ? value : null;

    // Echoed so a user can quote it in a support report and it maps to a log line.
    reply.header("x-request-id", request.id);
  });
}
