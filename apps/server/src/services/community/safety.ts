import prisma from "@bumpatlas/db";
import { env } from "@bumpatlas/env/server";

import { ServiceError } from "@/services/errors";

/**
 * Community text safety.
 *
 * Two jobs, kept separate: block what must never be posted, and flag what a human should
 * look at. Flagging is not blocking — over-blocking a frightened parent's post about
 * bleeding would push them away from the one place they might get told to seek care.
 */

const LINK_PATTERN = /\b(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|co|io|shop|store|link)\b/i;

/** Contact details do not belong in a public parenting group, ever. */
const CONTACT_PATTERNS = [
  /\b\+?\d[\d\s().-]{7,}\d\b/,
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,
  /\b(whatsapp|telegram|snapchat|instagram|dm me|text me)\b/i,
];

/** Words that mark a post as worth a human read, not as forbidden. */
const HIGH_RISK_TERMS = [
  "suicide", "suicidal", "kill myself", "hurt myself", "self harm",
  "hurt my baby", "shake the baby", "shaking her", "shaking him",
  "not breathing", "blue lips", "unresponsive", "seizure",
  "bleeding", "no movement", "reduced movement",
  "hits me", "hit me", "abuse", "not safe at home",
];

/** Medical-advice shapes that need review because other parents will follow them. */
const ADVICE_TERMS = [
  "you should give", "just give", "ml of", "mg of",
  "paracetamol", "calpol", "ibuprofen", "antibiotic",
  "dont go to the doctor", "no need for a doctor", "ignore the midwife",
];

export type TextScan = {
  /** Report-worthy. The post is still created; a queue item is raised alongside it. */
  flagged: boolean;
  /** Category slugs only — never the text itself, so logs and events stay clean. */
  flags: string[];
  containsLink: boolean;
  containsContact: boolean;
};

export function scanText(text: string): TextScan {
  const normalised = text.toLowerCase();
  const flags: string[] = [];

  if (HIGH_RISK_TERMS.some((term) => normalised.includes(term))) flags.push("high_risk");
  if (ADVICE_TERMS.some((term) => normalised.includes(term))) flags.push("medical_advice");

  const containsContact = CONTACT_PATTERNS.some((pattern) => pattern.test(text));
  if (containsContact) flags.push("contact_details");

  return {
    flagged: flags.length > 0,
    flags,
    containsLink: LINK_PATTERN.test(text),
    containsContact,
  };
}

/**
 * Link permission by account age.
 *
 * A brand-new account posting links is the classic spam and grooming pattern, and account
 * age is the cheapest signal that does not punish real users — a parent who has been
 * journalling for two weeks is very unlikely to be a link farm.
 */
export function canPostLinks(accountCreatedAt: Date, now = new Date()): boolean {
  const ageDays = (now.getTime() - accountCreatedAt.getTime()) / 86_400_000;
  return ageDays >= env.COMMUNITY_NEW_ACCOUNT_LINK_DAYS;
}

export function accountAgeDays(accountCreatedAt: Date, now = new Date()): number {
  return Math.floor((now.getTime() - accountCreatedAt.getTime()) / 86_400_000);
}

/**
 * Whether new posting is allowed right now.
 *
 * Outside moderation coverage, posting closes while reading, reporting, and blocking stay
 * open. A community that accepts new posts with nobody watching is how a crisis post sits
 * unanswered for nine hours — and how abuse sits unremoved for the same nine.
 */
export function isWithinModerationCoverage(now = new Date()): boolean {
  if (env.COMMUNITY_24H_COVERAGE) return true;

  const hhmm = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  const start = env.MODERATION_COVERAGE_START_UTC;
  const end = env.MODERATION_COVERAGE_END_UTC;

  return start <= end ? hhmm >= start && hhmm < end : hhmm >= start || hhmm < end;
}

/** Fixed priority rules, not a model: the founder's queue order must be predictable. */
const CRITICAL_REASONS = [
  "self harm", "suicide", "child safety", "child harm", "abuse", "violence", "emergency",
];
const HIGH_REASONS = ["medical advice", "medical", "harassment", "hate", "spam link", "scam"];

export function classifyReportPriority(input: {
  reason: string;
  details?: string | null;
  targetFlags?: string[];
}): "NORMAL" | "HIGH" | "CRITICAL" {
  const text = `${input.reason} ${input.details ?? ""}`.toLowerCase();

  if (CRITICAL_REASONS.some((term) => text.includes(term))) return "CRITICAL";
  // An automatic high-risk flag on the target escalates the report even if the reporter
  // described it mildly.
  if (input.targetFlags?.includes("high_risk")) return "CRITICAL";

  if (HIGH_REASONS.some((term) => text.includes(term))) return "HIGH";
  if (input.targetFlags?.includes("medical_advice")) return "HIGH";

  return "NORMAL";
}

/**
 * Enforces a per-day count for posts or comments.
 *
 * Counted from rows rather than a counter column: the volume is small, and a count query
 * cannot drift out of sync with reality the way a denormalised counter can.
 */
export async function assertDailyQuota(input: {
  userId: string;
  kind: "post" | "comment";
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const limit =
    input.kind === "post" ? env.COMMUNITY_POSTS_PER_DAY : env.COMMUNITY_COMMENTS_PER_DAY;

  const used =
    input.kind === "post"
      ? await prisma.communityPost.count({
          where: { authorUserId: input.userId, createdAt: { gte: dayStart } },
        })
      : await prisma.communityComment.count({
          where: { authorUserId: input.userId, createdAt: { gte: dayStart } },
        });

  if (used >= limit) {
    throw new ServiceError(429, "QUOTA_EXCEEDED", `You have reached today's ${input.kind} limit.`, {
      limitKey: `community_${input.kind}s_daily`,
      used,
      limit,
      resetsAt: new Date(dayStart.getTime() + 86_400_000).toISOString(),
      // Not a paywall: these limits are anti-spam, not a plan feature.
      upgradeAvailable: false,
    });
  }
}

/**
 * Requires current community-rules consent.
 *
 * Checked at the point of posting rather than once at signup, so a rules update takes effect
 * for everyone rather than only new accounts.
 */
export async function assertCommunityEligible(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { isAdultAttested: true },
  });

  if (!user.isAdultAttested) {
    throw new ServiceError(
      422,
      "ADULT_ATTESTATION_REQUIRED",
      "Confirm you are an adult before joining the community.",
    );
  }

  const consent = await prisma.consentRecord.count({
    where: { userId, policyKey: "COMMUNITY" },
  });

  if (consent === 0) {
    throw new ServiceError(
      422,
      "COMMUNITY_RULES_NOT_ACCEPTED",
      "Accept the community rules to take part.",
    );
  }
}
