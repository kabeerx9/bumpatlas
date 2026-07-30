import prisma from "@bumpatlas/db";
import type { Prisma } from "@bumpatlas/db/types";
import { createHash } from "node:crypto";
import type { FastifyRequest } from "fastify";

import { ServiceError } from "@/services/errors";

/** 24h minimum for user actions (§5.7). Webhooks keep their records longer. */
const RETENTION_MS = 24 * 60 * 60 * 1000;

export function hashRequest(payload: unknown): string {
  // Key order would otherwise make two identical requests hash differently.
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);

  return `{${entries.join(",")}}`;
}

/**
 * Reads the client's idempotency key.
 *
 * Header is preferred. `createMemoryInputSchema.idempotencyKey` is accepted as a
 * fallback because the shipped native client sends it in the body; that duplication
 * gets removed in a later coordinated contract cleanup.
 */
export function readIdempotencyKey(
  request: FastifyRequest,
  bodyKey?: string | null,
): string | null {
  const header = request.headers["idempotency-key"];
  const value = Array.isArray(header) ? header[0] : header;

  return value?.trim() || bodyKey?.trim() || null;
}

export type ReplayedResponse = { statusCode: number; body: unknown };

/**
 * Returns the stored response when this exact request was already processed.
 *
 * A key reused with a *different* body is a client bug, not a retry: answering
 * `409` surfaces it instead of silently returning someone else's response.
 */
export async function findReplay(
  userId: string,
  routeKey: string,
  idempotencyKey: string,
  requestHash: string,
): Promise<ReplayedResponse | null> {
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { userId_routeKey_idempotencyKey: { userId, routeKey, idempotencyKey } },
  });

  if (!existing) return null;

  if (existing.requestHash !== requestHash) {
    throw new ServiceError(
      409,
      "IDEMPOTENCY_CONFLICT",
      "This request key was already used with different data.",
    );
  }

  return { statusCode: existing.statusCode, body: existing.responseJson };
}

/**
 * Records the outcome inside the caller's transaction.
 *
 * Must be written *after* the business row in the same transaction: writing it
 * first means a crash in between leaves a key that claims success for work that
 * never happened, and the retry would return a lie.
 */
export function recordIdempotencyTx(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    routeKey: string;
    idempotencyKey: string;
    requestHash: string;
    statusCode: number;
    responseJson: Prisma.InputJsonValue;
  },
): Promise<unknown> {
  return tx.idempotencyRecord.create({
    data: {
      ...input,
      expiresAt: new Date(Date.now() + RETENTION_MS),
    },
  });
}

/**
 * Two clients retrying the same key concurrently both pass `findReplay`, then one
 * loses the unique constraint. That loser is a duplicate, not a failure — it reads
 * the winner's stored response and returns it.
 */
export function isIdempotencyRaceError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002" &&
    JSON.stringify((error as { meta?: unknown }).meta ?? "").includes("idempotencyKey")
  );
}
