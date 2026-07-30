import prisma from "@bumpatlas/db";
import type { FastifyBaseLogger } from "fastify";

import {
  buildExportPayload,
  claimPendingRequests,
  markRequestFailed,
  markRequestReady,
  processAccountDeletion,
} from "@/services/data-request";
import { ServiceError } from "@/services/errors";
import { getStorageSigner, type StorageSigner } from "@/services/media";

/** Bounded so one run cannot hold a connection for minutes. */
const BATCH_SIZE = 5;

export type JobResult = {
  claimed: number;
  succeeded: number;
  failed: number;
};

/**
 * Processes queued export and deletion requests.
 *
 * One item's failure must not abort the batch — a single malformed household would
 * otherwise block every other user's export behind it. Each item is isolated, its failure
 * recorded as a code, and retried up to the attempt cap.
 */
export async function processDataRequests(input: {
  signer?: StorageSigner;
  logger?: FastifyBaseLogger;
  batchSize?: number;
}): Promise<JobResult> {
  const signer = input.signer ?? (await getStorageSigner());
  const requests = await claimPendingRequests(input.batchSize ?? BATCH_SIZE);

  let succeeded = 0;
  let failed = 0;

  for (const request of requests) {
    try {
      if (request.type === "EXPORT") {
        const { payload, counts } = await buildExportPayload(request);
        const storageKey = `exports/${request.userId}/${request.id}.json`;

        /**
         * The export object is written through the same private bucket as media. It is
         * never public: the download is a short-lived signed URL issued only to the
         * requester.
         */
        const upload = await signer.createUploadUrl({
          storageKey,
          contentType: "application/json",
          byteSize: Buffer.byteLength(JSON.stringify(payload)),
          expiresInSeconds: 600,
        });

        await putJson(upload.url, payload, upload.headers);
        await markRequestReady({ requestId: request.id, storageKey });

        // Counts, never content.
        input.logger?.info(
          { requestId: request.id, ...counts },
          "Data export completed",
        );
      } else {
        await processAccountDeletion({ userId: request.userId, signer });
        await markRequestReady({ requestId: request.id, storageKey: "" });

        input.logger?.info({ requestId: request.id }, "Account deletion completed");
      }

      succeeded += 1;
    } catch (error) {
      failed += 1;

      const failureCode =
        error instanceof ServiceError ? error.code : (error as { name?: string }).name ?? "UNKNOWN";

      await markRequestFailed({ requestId: request.id, failureCode });

      // Error class only — a stack from an export could contain private values.
      input.logger?.error({ requestId: request.id, failureCode }, "Data request failed");
    }
  }

  return { claimed: requests.length, succeeded, failed };
}

async function putJson(
  url: string,
  payload: unknown,
  headers: Record<string, string> | undefined,
): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ServiceError(502, "EXPORT_UPLOAD_FAILED", "Could not store the export.");
  }
}

/**
 * Purges expired invites, stale pending uploads, and old idempotency records.
 *
 * Separate from the request processor because it must keep running even when exports are
 * failing: a pending-upload row that is never cleaned up counts against a family's media
 * quota forever.
 */
export async function purgeExpiredRecords(input: {
  logger?: FastifyBaseLogger;
} = {}): Promise<{ invites: number; idempotency: number; pendingUploads: number }> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const oneDayAgo = new Date(now.getTime() - 86_400_000);

  const [invites, idempotency, pendingUploads] = await Promise.all([
    prisma.familyInvite.deleteMany({ where: { expiresAt: { lt: thirtyDaysAgo } } }),
    prisma.idempotencyRecord.deleteMany({ where: { expiresAt: { lt: now } } }),
    // Never attached, older than a day: the signed URL expired long ago.
    prisma.mediaAsset.updateMany({
      where: { status: "PENDING", createdAt: { lt: oneDayAgo } },
      data: { status: "DELETED", deletedAt: now },
    }),
  ]);

  const result = {
    invites: invites.count,
    idempotency: idempotency.count,
    pendingUploads: pendingUploads.count,
  };

  input.logger?.info(result, "Purged expired records");

  return result;
}

/** AI messages are retained 30 days unless the user deletes them sooner. */
export async function purgeOldAiMessages(input: { logger?: FastifyBaseLogger } = {}): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000);

  const deleted = await prisma.aiMessage.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      // Reported messages are moderation evidence and outlive the retention window.
      reportedAt: null,
    },
  });

  input.logger?.info({ deleted: deleted.count }, "Purged old assistant messages");

  return deleted.count;
}
