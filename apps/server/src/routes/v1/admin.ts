import { adminMetricsQuerySchema, adminMetricsResponseSchema } from "@bumpatlas/contracts/v1";
import type { FastifyInstance } from "fastify";

import { requireAdmin } from "@/middleware/require-admin";
import { requireAuth } from "@/middleware/require-auth";
import { getAdminMetrics } from "@/services/admin-metrics";
import { invalidInput } from "@/services/errors";

export type AdminRouteDeps = {
  requireAuth: typeof requireAuth;
};

export async function registerAdminRoutes(
  fastify: FastifyInstance,
  deps: Partial<AdminRouteDeps> = {},
) {
  const d = { requireAuth, ...deps };

  /**
   * Founder dashboard aggregates. Counts and dates only — this route reads across
   * all households, so the response schema is the allowlist that keeps row-level
   * user data from ever leaving it. Read-only by design.
   */
  fastify.get("/api/v1/admin/metrics", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    // 404 rather than 403: a non-admin probing this path learns nothing about it.
    requireAdmin(auth);

    const parsedQuery = adminMetricsQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send(invalidInput(parsedQuery.error, request.id));
    }

    return reply.send(
      adminMetricsResponseSchema.parse(await getAdminMetrics(parsedQuery.data.range)),
    );
  });
}
