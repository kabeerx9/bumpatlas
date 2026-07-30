import prisma from "@bumpatlas/db";
import type { FastifyInstance } from "fastify";

export type HealthRouteDeps = {
  /** Cheapest possible round trip that proves the pool can still reach Postgres. */
  pingDatabase: () => Promise<void>;
};

const defaultDeps: HealthRouteDeps = {
  pingDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
};

/**
 * Liveness answers "is this process running"; readiness answers "can it serve
 * traffic". Keeping them separate is what stops an orchestrator from restarting a
 * healthy process during a transient database blip — and stops it from routing
 * traffic to a process whose pool is exhausted.
 *
 * Neither response contains version, host, error text, or any other detail: these
 * routes are reachable without authentication.
 */
export async function registerHealthRoutes(
  fastify: FastifyInstance,
  deps: Partial<HealthRouteDeps> = {},
) {
  const { pingDatabase } = { ...defaultDeps, ...deps };

  fastify.get("/health/live", async () => ({ status: "ok" }));

  fastify.get("/health/ready", async (request, reply) => {
    try {
      await pingDatabase();
      return { status: "ok" };
    } catch (error) {
      request.log.error({ err: error }, "Readiness check failed");
      return reply.code(503).send({ status: "unavailable" });
    }
  });
}
