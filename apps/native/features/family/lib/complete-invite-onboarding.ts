import type {
  AcceptInviteInput,
  CreateConsentInput,
  FamilySummary,
} from "@bumpatlas/contracts";

import { REQUIRED_ONBOARDING_CONSENTS } from "../../../lib/legal-policy";

export const INVITE_ONBOARDING_CONSENTS = REQUIRED_ONBOARDING_CONSENTS;

export function canSubmitInviteAcceptance(input: {
  signedIn: boolean;
  hasToken: boolean;
  previewReady: boolean;
  mutationPending: boolean;
  draftsHydrated: boolean;
  draftCount: number;
  draftSyncPending: boolean;
  legalAccepted: boolean;
}): boolean {
  return (
    input.signedIn &&
    input.hasToken &&
    input.previewReady &&
    !input.mutationPending &&
    input.draftsHydrated &&
    input.draftCount === 0 &&
    !input.draftSyncPending &&
    input.legalAccepted
  );
}

/** Email mismatch stays contextual; all other auth failures keep global handling. */
export function shouldSuppressInviteGlobalError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { status?: unknown }).status === 403 &&
    (error as { code?: unknown }).code === "INVITE_EMAIL_MISMATCH"
  );
}

type InviteOnboardingDependencies = {
  /** Hydrates the JIT Clerk mirror, including email for email-bound invites. */
  syncAccount: () => Promise<unknown>;
  createConsent: (input: CreateConsentInput) => Promise<unknown>;
  acceptInvite: (input: AcceptInviteInput) => Promise<FamilySummary>;
  /** Clears the previous implicit tenant context and seeds the accepted family. */
  adoptFamily: (family: FamilySummary) => void | Promise<void>;
  completeOnboarding: () => Promise<void>;
};

/**
 * Join-only onboarding orchestration.
 *
 * There is deliberately no `createFamily` dependency: an invite recipient joins
 * the inviter's household or the operation fails without creating residue.
 */
export async function completeInviteOnboarding(
  input: { token: string },
  dependencies: InviteOnboardingDependencies,
): Promise<FamilySummary> {
  await dependencies.syncAccount();

  // Upserted by (user, policy, version), so this is current evidence for a new
  // recipient and an idempotent refresh for an already-onboarded recipient.
  for (const consent of INVITE_ONBOARDING_CONSENTS) {
    await dependencies.createConsent(consent);
  }

  const family = await dependencies.acceptInvite({ token: input.token });
  await dependencies.adoptFamily(family);
  await dependencies.completeOnboarding();
  return family;
}
