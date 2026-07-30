import {
  createDataRequestInputSchema,
  dataRequestSchema,
} from "@bumpatlas/contracts/v1";
import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/middleware/require-auth";
import { requireCurrentFamily } from "@/middleware/require-family-member";
import { createDataRequest, getDataRequest, serializeDataRequest } from "@/services/data-request";
import { invalidInput } from "@/services/errors";
import { resolveCurrentFamily } from "@/services/family";
import { getStorageSigner, type StorageSigner } from "@/services/media";

export type DataRequestRouteDeps = {
  requireAuth: typeof requireAuth;
  getSigner: () => Promise<StorageSigner>;
};

export async function registerDataRequestRoutes(
  fastify: FastifyInstance,
  deps: Partial<DataRequestRouteDeps> = {},
) {
  const d = { requireAuth, getSigner: getStorageSigner, ...deps };

  fastify.post("/api/v1/data-requests", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = createDataRequestInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    /**
     * A deletion request does not require a household — someone who never completed
     * onboarding still has a right to delete their account. An export does, since there is
     * nothing household-shaped to export without one.
     */
    let familyId: string | null = null;
    let role: "OWNER" | "PARENT" | "CONTRIBUTOR" | "VIEWER" | null = null;

    if (parsed.data.type === "export") {
      const family = await requireCurrentFamily(auth);
      familyId = family.familyId;
      role = family.role;
    } else {
      familyId = await resolveCurrentFamily(auth.userId);
    }

    const created = await createDataRequest({
      userId: auth.userId,
      familyId,
      type: parsed.data.type,
      role,
    });

    return reply
      .code(201)
      .send(dataRequestSchema.parse(await serializeDataRequest(created, await d.getSigner())));
  });

  /** Polled by the export screen. Returns only the requester's own row. */
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/data-requests/:id",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const found = await getDataRequest({ userId: auth.userId, requestId: request.params.id });

      return reply.send(
        dataRequestSchema.parse(await serializeDataRequest(found, await d.getSigner())),
      );
    },
  );
}
