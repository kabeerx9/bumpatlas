import prisma from "@bumpatlas/db";
import type { Prisma } from "@bumpatlas/db/types";

export type AuditEventInput = {
  action: string;
  actorUserId?: string | null;
  familyId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  /** IDs, enums, booleans, numbers. Never user-authored text. */
  metadata?: Prisma.InputJsonValue;
};

function toData(input: AuditEventInput) {
  return {
    action: input.action,
    actorUserId: input.actorUserId ?? null,
    familyId: input.familyId ?? null,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
  };
}

/**
 * Writes an audit row inside an existing transaction.
 *
 * Preferred for state changes that must be provable: if the business write rolls
 * back, the claim that it happened rolls back with it. Pass the transaction client
 * from `prisma.$transaction`.
 */
export function writeAuditEventTx(
  tx: Prisma.TransactionClient,
  input: AuditEventInput,
): Promise<unknown> {
  return tx.auditEvent.create({ data: toData(input) });
}

/**
 * Standalone audit write for events with no surrounding transaction, e.g. a
 * completed provider webhook. Failures are surfaced to the caller rather than
 * swallowed — unlike product events, a missing audit row is a real gap.
 */
export function writeAuditEvent(input: AuditEventInput): Promise<unknown> {
  return prisma.auditEvent.create({ data: toData(input) });
}
