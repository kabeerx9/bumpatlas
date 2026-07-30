import prisma from "@bumpatlas/db";
import { env } from "@bumpatlas/env/server";
import type { FastifyInstance } from "fastify";

import { requireCronSecret } from "@/middleware/require-admin";
import {
  processDataRequests,
  purgeExpiredRecords,
  purgeOldAiMessages,
} from "@/jobs/process-data-requests";
import { getStorageSigner, type StorageSigner } from "@/services/media";
import { getOrCreateRecap } from "@/services/recap";

export type CronRouteDeps = {
  cronSecret: () => string;
  /** Injectable so tests exercise the job without a live bucket. */
  getSigner: () => Promise<StorageSigner>;
};

/**
 * Provider-invoked cron endpoints.
 *
 * HTTP routes rather than a job framework, per §11: the hosting provider already has a
 * scheduler, and every job here is an ordinary service call. Each is idempotent and
 * bounded, so a double fire or a retry is harmless.
 *
 * Authenticated by `Authorization: Bearer <CRON_SECRET>`, never by Clerk — the caller is a
 * scheduler, not a user.
 */
export async function registerCronRoutes(
  fastify: FastifyInstance,
  deps: Partial<CronRouteDeps> = {},
) {
  const d = { cronSecret: () => env.CRON_SECRET, getSigner: getStorageSigner, ...deps };

  const authenticate = (authorization: string | undefined) => {
    requireCronSecret(authorization, d.cronSecret());
  };

  fastify.post("/api/cron/process-data-requests", async (request, reply) => {
    authenticate(request.headers.authorization);

    const result = await processDataRequests({
      signer: await d.getSigner(),
      logger: request.log,
    });

    // Counts and duration only, never private content.
    return reply.send(result);
  });

  fastify.post("/api/cron/purge-expired", async (request, reply) => {
    authenticate(request.headers.authorization);

    const [purged, aiMessages] = await Promise.all([
      purgeExpiredRecords({ logger: request.log }),
      purgeOldAiMessages({ logger: request.log }),
    ]);

    return reply.send({ ...purged, aiMessages });
  });

  /**
   * Weekly recap generation. Scheduled for Sunday 16:00 UTC, but each family's week is
   * computed from its own recorded time zone.
   *
   * Idempotent per `(familyId, weekStart)`, and `GET /api/v1/recaps/current` generates on
   * demand anyway — so a missed run degrades to a slower first read, not a missing recap.
   */
  fastify.post("/api/cron/weekly-recaps", async (request, reply) => {
    authenticate(request.headers.authorization);

    const families = await prisma.family.findMany({
      select: {
        id: true,
        ownerUserId: true,
        owner: { select: { timeZone: true } },
      },
    });

    let generated = 0;
    let failed = 0;

    for (const family of families) {
      try {
        await getOrCreateRecap({
          familyId: family.id,
          userId: family.ownerUserId,
          timeZone: family.owner.timeZone,
        });
        generated += 1;
      } catch (error) {
        // One family's failure must not abort the batch.
        failed += 1;
        request.log.error({ err: error, familyId: family.id }, "Recap generation failed");
      }
    }

    return reply.send({ families: families.length, generated, failed });
  });
}
