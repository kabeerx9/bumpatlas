import type { V1ErrorResponse } from "@bumpatlas/contracts/v1";
import type { ZodError } from "zod";

/**
 * The only way a service reports a business failure.
 *
 * Services throw; the Fastify error handler translates. That keeps routes free of
 * try/catch ladders and guarantees every failure carries a code and a request ID,
 * which is what makes a user's "it broke" report traceable to a log line.
 */
export class ServiceError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorResponse(
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
): V1ErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
      requestId,
    },
  };
}

export const unauthenticated = (requestId: string): V1ErrorResponse =>
  errorResponse("UNAUTHENTICATED", "Sign in to continue.", requestId);

export const forbidden = (requestId: string, message = "You do not have access to this."): V1ErrorResponse =>
  errorResponse("FORBIDDEN", message, requestId);

/**
 * Used for both "does not exist" and "exists but is not yours". Distinguishing
 * them would confirm the existence of another household's data.
 */
export const notFound = (requestId: string, code = "NOT_FOUND", message = "Not found."): V1ErrorResponse =>
  errorResponse(code, message, requestId);

export const featureUnavailable = (requestId: string): V1ErrorResponse =>
  errorResponse("FEATURE_UNAVAILABLE", "This feature is not available yet.", requestId);

/**
 * Only the first issue's path and message travel to the client. Zod issues can
 * echo submitted values, which on this product means memory bodies and child
 * names — never acceptable in a response or a production log.
 */
export function invalidInput(error: ZodError, requestId: string): V1ErrorResponse {
  const issue = error.issues[0];
  const path = issue?.path.join(".");

  return errorResponse(
    "INVALID_INPUT",
    issue?.message ?? "Invalid input",
    requestId,
    path ? { field: path } : undefined,
  );
}

/** §5.11: `upgradeAvailable` tells the client whether a paywall is the right screen. */
export function quotaExceeded(
  requestId: string,
  details: {
    limitKey: string;
    used: number;
    limit: number;
    resetsAt?: string | null;
    upgradeAvailable: boolean;
  },
  message = "You have reached this limit.",
): V1ErrorResponse {
  return errorResponse("QUOTA_EXCEEDED", message, requestId, details);
}
