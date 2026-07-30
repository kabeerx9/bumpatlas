import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { ServiceError, errorResponse, invalidInput, notFound } from "@/services/errors";

/**
 * Single translation point from thrown errors to the structured v1 error contract.
 *
 * Two rules it enforces that are easy to lose when routes handle their own errors:
 * a Prisma or provider error never reaches the client, and every response carries
 * the request ID that also appears in the log line.
 */
export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (error instanceof ServiceError) {
      // Expected business outcome, not a defect: log at warn without a stack.
      request.log.warn(
        { code: error.code, statusCode: error.statusCode, route: request.routeOptions.url },
        "Request rejected",
      );
      return reply
        .code(error.statusCode)
        .send(errorResponse(error.code, error.message, requestId, error.details));
    }

    if (error instanceof ZodError) {
      request.log.warn({ route: request.routeOptions.url }, "Invalid input");
      return reply.code(400).send(invalidInput(error, requestId));
    }

    // Fastify's own failures arrive with a statusCode and a safe message.
    const fastifyError = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = fastifyError.statusCode ?? 500;

    if (statusCode === 413) {
      return reply
        .code(413)
        .send(errorResponse("PAYLOAD_TOO_LARGE", "That upload is too large.", requestId));
    }

    if (statusCode === 429) {
      return reply
        .code(429)
        .send(errorResponse("RATE_LIMITED", "Too many requests. Try again shortly.", requestId));
    }

    if (statusCode < 500) {
      return reply
        .code(statusCode)
        .send(
          errorResponse(
            fastifyError.code ?? "INVALID_REQUEST",
            fastifyError.message ?? "Invalid request.",
            requestId,
          ),
        );
    }

    // Unexpected. The full error goes to the log; the client gets nothing about it.
    request.log.error({ err: error, route: request.routeOptions.url }, "Unhandled server error");

    return reply
      .code(500)
      .send(errorResponse("INTERNAL_ERROR", "Something went wrong.", requestId));
  });

  fastify.setNotFoundHandler((request, reply) =>
    reply.code(404).send(notFound(request.id, "ROUTE_NOT_FOUND", "Not found.")),
  );
}
