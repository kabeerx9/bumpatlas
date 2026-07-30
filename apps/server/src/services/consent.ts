import prisma from "@bumpatlas/db";
import type { ConsentRecord as ConsentRecordContract, ConsentType } from "@bumpatlas/contracts/v1";
import type { ConsentPolicyKey } from "@bumpatlas/db/types";

/**
 * Contract uses lowercase policy keys; Prisma uses enum constants (correction 12).
 * Mapped explicitly rather than by string transformation so adding a policy forces a
 * decision here instead of silently producing an invalid enum at runtime.
 */
const TO_PRISMA: Record<ConsentType, ConsentPolicyKey> = {
  terms: "TERMS",
  privacy: "PRIVACY",
  community: "COMMUNITY",
  age_attestation: "AGE_ATTESTATION",
  week_summary: "WEEK_SUMMARY",
};

const TO_CONTRACT: Record<ConsentPolicyKey, ConsentType> = {
  TERMS: "terms",
  PRIVACY: "privacy",
  COMMUNITY: "community",
  AGE_ATTESTATION: "age_attestation",
  WEEK_SUMMARY: "week_summary",
};

/**
 * Records a consent. Upserted by (user, policy, version), so re-accepting the same
 * version is idempotent while a new version creates a new row — the acceptance
 * history is the evidence, so it is never overwritten.
 *
 * `acceptedAt` comes from the server clock; the contract does not accept one
 * (correction 11).
 */
export async function recordConsent(input: {
  userId: string;
  type: ConsentType;
  version: string;
}): Promise<ConsentRecordContract> {
  const policyKey = TO_PRISMA[input.type];

  const record = await prisma.consentRecord.upsert({
    where: {
      userId_policyKey_version: {
        userId: input.userId,
        policyKey,
        version: input.version,
      },
    },
    create: { userId: input.userId, policyKey, version: input.version },
    update: {},
  });

  // Age attestation is what gates community and household joining, so it is
  // mirrored onto the user rather than re-derived from consent rows on every check.
  if (policyKey === "AGE_ATTESTATION") {
    await prisma.user.update({
      where: { id: input.userId },
      data: { isAdultAttested: true, adultAttestedAt: record.acceptedAt },
    });
  }

  return {
    id: record.id,
    type: TO_CONTRACT[record.policyKey],
    version: record.version,
    acceptedAt: record.acceptedAt.toISOString(),
  };
}

export async function hasConsent(userId: string, type: ConsentType): Promise<boolean> {
  const count = await prisma.consentRecord.count({
    where: { userId, policyKey: TO_PRISMA[type] },
  });

  return count > 0;
}
