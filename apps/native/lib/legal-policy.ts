import type { CreateConsentInput } from "@bumpatlas/contracts";

/** Current client-shipped legal copy version. New versions create new evidence rows. */
export const LEGAL_POLICY_VERSION = "2026-07-01";
export const LEGAL_POLICY_EFFECTIVE_DATE = "July 1, 2026";

export const REQUIRED_ONBOARDING_CONSENTS = [
  { type: "age_attestation", version: LEGAL_POLICY_VERSION },
  { type: "terms", version: LEGAL_POLICY_VERSION },
  { type: "privacy", version: LEGAL_POLICY_VERSION },
] as const satisfies readonly CreateConsentInput[];
