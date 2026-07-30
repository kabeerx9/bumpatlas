import { z } from "zod";

/**
 * Correction 1: every /api/v1 route returns this shape on failure.
 *
 * `/api/me` and `/api/account` keep the legacy `{ error: string }` form until a
 * coordinated migration; `apiErrorResponseSchema` in `../me.ts` tolerates both.
 */
export const errorCodeSchema = z.enum([
  "INVALID_INPUT",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "INVITE_EXPIRED",
  "PAYLOAD_TOO_LARGE",
  "BUSINESS_RULE_VIOLATION",
  "RATE_LIMITED",
  "QUOTA_EXCEEDED",
  "INTERNAL_ERROR",
  "PROVIDER_ERROR",
  "FEATURE_UNAVAILABLE",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/**
 * Domain-specific codes travel in the same `code` field. Keeping the field a
 * plain string means a new business rule does not require a client release,
 * while `errorCodeSchema` documents the transport-level set.
 */
export const v1ErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});
export type V1Error = z.infer<typeof v1ErrorSchema>;

export const v1ErrorResponseSchema = z.object({
  error: v1ErrorSchema,
});
export type V1ErrorResponse = z.infer<typeof v1ErrorResponseSchema>;

/**
 * §5.11 quota payload. `upgradeAvailable` is what tells the client whether a
 * paywall is the correct next screen, so the UI never has to infer it from the
 * user's plan.
 */
export const quotaErrorDetailsSchema = z.object({
  limitKey: z.string(),
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  resetsAt: z.string().nullable().optional(),
  upgradeAvailable: z.boolean(),
});
export type QuotaErrorDetails = z.infer<typeof quotaErrorDetailsSchema>;
