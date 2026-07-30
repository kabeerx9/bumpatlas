import prisma from "@bumpatlas/db";
import type { ProductEventName } from "@bumpatlas/db/types";
import type { FastifyBaseLogger } from "fastify";

/** Numbers and booleans only. A string here would be a privacy regression. */
export type ProductEventMetadata = Record<string, number | boolean>;

/**
 * Drops anything that is not a number or boolean.
 *
 * Enforced in code rather than by convention because the failure mode is severe
 * and quiet: one `{ title: memory.title }` at a call site would start writing
 * memory titles into an analytics table that privacy review was told holds none.
 */
function sanitize(metadata: ProductEventMetadata | undefined, logger?: FastifyBaseLogger) {
  if (!metadata) return undefined;

  const safe: Record<string, number | boolean> = {};
  const dropped: string[] = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    } else {
      dropped.push(key);
    }
  }

  if (dropped.length > 0) {
    // Keys only — logging the values would defeat the point of dropping them.
    logger?.warn({ dropped }, "Dropped non-scalar product event metadata");
  }

  return Object.keys(safe).length > 0 ? safe : undefined;
}

/**
 * Records a first-party product event. No external analytics SDK.
 *
 * Never throws into the request path: the user's action already succeeded, and a
 * failed analytics insert must not turn a successful memory into a 500.
 */
export async function trackProductEvent(
  name: ProductEventName,
  options: {
    actorUserId?: string | null;
    familyId?: string | null;
    metadata?: ProductEventMetadata;
    logger?: FastifyBaseLogger;
  } = {},
): Promise<void> {
  try {
    await prisma.productEvent.create({
      data: {
        name,
        actorUserId: options.actorUserId ?? null,
        familyId: options.familyId ?? null,
        metadata: sanitize(options.metadata, options.logger) ?? undefined,
      },
    });
  } catch (error) {
    options.logger?.warn({ err: error, event: name }, "Failed to record product event");
  }
}
