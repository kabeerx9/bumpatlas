import {
  consentRecordSchema,
  createConsentInputSchema,
  PREFERENCES_READ_ONLY_FIELDS,
  preferencesSchema,
  updatePreferencesInputSchema,
} from "@bumpatlas/contracts/v1";
import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/middleware/require-auth";
import { recordConsent } from "@/services/consent";
import { errorResponse, invalidInput } from "@/services/errors";
import { resolveCurrentFamily } from "@/services/family";
import { getPreferences, maybeCompleteOnboarding, updatePreferences } from "@/services/preference";

export type PreferenceRouteDeps = {
  requireAuth: typeof requireAuth;
};

export async function registerPreferenceRoutes(
  fastify: FastifyInstance,
  deps: Partial<PreferenceRouteDeps> = {},
) {
  const d = { requireAuth, ...deps };

  fastify.post("/api/v1/consents", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = createConsentInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const record = await recordConsent({
      userId: auth.userId,
      type: parsed.data.type,
      version: parsed.data.version,
    });

    // Consent may have been the last missing piece of onboarding.
    const familyId = await resolveCurrentFamily(auth.userId);
    await maybeCompleteOnboarding({ userId: auth.userId, familyId });

    return reply.code(201).send(consentRecordSchema.parse(record));
  });

  fastify.get("/api/v1/preferences", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    return reply.send(preferencesSchema.parse(await getPreferences(auth.userId)));
  });

  fastify.patch("/api/v1/preferences", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const body = (request.body ?? {}) as Record<string, unknown>;

    /**
     * Zod strips unknown keys, so a client sending `activeChildId` here would be
     * silently ignored and left believing it switched child context. Rejecting
     * loudly points them at the one route that actually does it (correction 32).
     */
    const readOnlyField = PREFERENCES_READ_ONLY_FIELDS.find((field) => field in body);

    if (readOnlyField) {
      return reply.code(422).send(
        errorResponse(
          "UNSUPPORTED_FIELD",
          `${readOnlyField} is read-only here.`,
          request.id,
          readOnlyField === "activeChildId"
            ? { useInstead: "POST /api/v1/children/:id/activate" }
            : undefined,
        ),
      );
    }

    const parsed = updatePreferencesInputSchema.safeParse(body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const preferences = await updatePreferences({
      userId: auth.userId,
      primaryGoal: parsed.data.primaryGoal,
      timeZone: parsed.data.timeZone,
    });

    return reply.send(preferencesSchema.parse(preferences));
  });
}
