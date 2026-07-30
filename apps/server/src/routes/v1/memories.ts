import {
  createMemoryInputSchema,
  listMemoriesQuerySchema,
  listMemoriesResponseSchema,
  mediaUploadUrlInputSchema,
  mediaUploadUrlResponseSchema,
  memorySchema,
  updateMemoryInputSchema,
} from "@bumpatlas/contracts/v1";
import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/middleware/require-auth";
import {
  requireCurrentFamily,
  requireCurrentFamilyWithPermission,
} from "@/middleware/require-family-member";
import { invalidInput } from "@/services/errors";
import {
  findReplay,
  hashRequest,
  isIdempotencyRaceError,
  readIdempotencyKey,
  recordIdempotencyTx,
} from "@/services/idempotency";
import { createUploadUrl, getStorageSigner, type StorageSigner } from "@/services/media";
import {
  createMemory,
  deleteMemory,
  getMemory,
  listMemories,
  serializeMemory,
  updateMemory,
} from "@/services/memory";
import { trackProductEvent } from "@/services/product-event";

export type MemoryRouteDeps = {
  requireAuth: typeof requireAuth;
  getSigner: () => Promise<StorageSigner>;
};

export async function registerMemoryRoutes(
  fastify: FastifyInstance,
  deps: Partial<MemoryRouteDeps> = {},
) {
  const d = { requireAuth, getSigner: getStorageSigner, ...deps };

  fastify.post("/api/v1/media/upload-url", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = mediaUploadUrlInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const family = await requireCurrentFamilyWithPermission(auth, "canContribute");

    const response = await createUploadUrl({
      familyId: family.familyId,
      userId: auth.userId,
      contentType: parsed.data.contentType,
      byteSize: parsed.data.byteSize,
      signer: await d.getSigner(),
    });

    return reply.code(201).send(mediaUploadUrlResponseSchema.parse(response));
  });

  fastify.post("/api/v1/memories", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = createMemoryInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const family = await requireCurrentFamilyWithPermission(auth, "canContribute");
    const signer = await d.getSigner();

    const routeKey = "POST /api/v1/memories";
    // Header preferred; the body key is what the shipped offline-draft flow sends.
    const idempotencyKey = readIdempotencyKey(request, parsed.data.idempotencyKey);
    const requestHash = hashRequest(parsed.data);

    if (idempotencyKey) {
      const replay = await findReplay(auth.userId, routeKey, idempotencyKey, requestHash);

      if (replay) {
        const memory = await getMemory(family.familyId, String(replay.body));
        return reply
          .code(replay.statusCode)
          .send(memorySchema.parse(await serializeMemory(memory, signer)));
      }
    }

    let created;
    try {
      created = await createMemory({
        familyId: family.familyId,
        userId: auth.userId,
        body: parsed.data.body,
        eventDate: parsed.data.eventDate,
        visibility: parsed.data.visibility,
        childId: parsed.data.childId,
        pregnancyId: parsed.data.pregnancyId,
        mediaStorageKey: parsed.data.mediaStorageKey,
        recordIdempotency: idempotencyKey
          ? (tx, memoryId) =>
              recordIdempotencyTx(tx, {
                userId: auth.userId,
                routeKey,
                idempotencyKey,
                requestHash,
                statusCode: 201,
                responseJson: memoryId,
              })
          : undefined,
      });
    } catch (error) {
      if (idempotencyKey && isIdempotencyRaceError(error)) {
        const replay = await findReplay(auth.userId, routeKey, idempotencyKey, requestHash);
        if (replay) {
          const memory = await getMemory(family.familyId, String(replay.body));
          return reply
            .code(replay.statusCode)
            .send(memorySchema.parse(await serializeMemory(memory, signer)));
        }
      }
      throw error;
    }

    await trackProductEvent("MEMORY_CREATED", {
      actorUserId: auth.userId,
      familyId: family.familyId,
      // Booleans and numbers only — never the body or the title.
      metadata: {
        hasMedia: Boolean(parsed.data.mediaStorageKey),
        attributedToChild: Boolean(created.childId),
        attributedToPregnancy: Boolean(created.pregnancyId),
      },
      logger: request.log,
    });

    return reply.code(201).send(memorySchema.parse(await serializeMemory(created, signer)));
  });

  fastify.get("/api/v1/memories", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsedQuery = listMemoriesQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send(invalidInput(parsedQuery.error, request.id));
    }

    const family = await requireCurrentFamily(auth);
    const signer = await d.getSigner();

    const { items, nextCursor } = await listMemories({
      familyId: family.familyId,
      childId: parsedQuery.data.childId,
      cursor: parsedQuery.data.cursor,
      limit: parsedQuery.data.limit,
    });

    return reply.send(
      listMemoriesResponseSchema.parse({
        items: await Promise.all(items.map((item) => serializeMemory(item, signer))),
        nextCursor,
      }),
    );
  });

  fastify.get<{ Params: { id: string } }>("/api/v1/memories/:id", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const family = await requireCurrentFamily(auth);
    const memory = await getMemory(family.familyId, request.params.id);

    return reply.send(
      memorySchema.parse(await serializeMemory(memory, await d.getSigner())),
    );
  });

  fastify.patch<{ Params: { id: string } }>("/api/v1/memories/:id", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = updateMemoryInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const family = await requireCurrentFamily(auth);

    const memory = await updateMemory({
      familyId: family.familyId,
      actor: { userId: auth.userId, role: family.role },
      memoryId: request.params.id,
      title: parsed.data.title,
      body: parsed.data.body,
      visibility: parsed.data.visibility,
      childId: parsed.data.childId,
      pregnancyId: parsed.data.pregnancyId,
    });

    return reply.send(
      memorySchema.parse(await serializeMemory(memory, await d.getSigner())),
    );
  });

  fastify.delete<{ Params: { id: string } }>("/api/v1/memories/:id", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const family = await requireCurrentFamily(auth);

    await deleteMemory({
      familyId: family.familyId,
      actor: { userId: auth.userId, role: family.role },
      memoryId: request.params.id,
      signer: await d.getSigner(),
    });

    return reply.code(204).send();
  });
}
