import {
  childSchema,
  convertPregnancyInputSchema,
  convertPregnancyResponseSchema,
  createChildInputSchema,
  createPregnancyInputSchema,
  listChildrenQuerySchema,
  listChildrenResponseSchema,
  pregnancySchema,
  updateChildInputSchema,
  updatePregnancyInputSchema,
} from "@bumpatlas/contracts/v1";
import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/middleware/require-auth";
import {
  requireCurrentFamily,
  requireCurrentFamilyWithPermission,
} from "@/middleware/require-family-member";
import { invalidInput } from "@/services/errors";
import { resolveActiveChild } from "@/services/family";
import { maybeCompleteOnboarding } from "@/services/preference";
import {
  activateChild,
  archiveChild,
  convertPregnancy,
  createChild,
  createPregnancy,
  listChildren,
  serializeChild,
  serializeConvertResponse,
  serializePregnancy,
  updateChild,
  updatePregnancy,
} from "@/services/profile";

export type ProfileRouteDeps = {
  requireAuth: typeof requireAuth;
};

export async function registerProfileRoutes(
  fastify: FastifyInstance,
  deps: Partial<ProfileRouteDeps> = {},
) {
  const d = { requireAuth, ...deps };

  fastify.post("/api/v1/pregnancies", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = createPregnancyInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const family = await requireCurrentFamilyWithPermission(auth, "canManageProfiles");

    const pregnancy = await createPregnancy({
      familyId: family.familyId,
      actorUserId: auth.userId,
      dueDate: parsed.data.dueDate,
    });

    await maybeCompleteOnboarding({ userId: auth.userId, familyId: family.familyId });

    return reply.code(201).send(pregnancySchema.parse(serializePregnancy(pregnancy, request.timeZone)));
  });

  fastify.patch<{ Params: { id: string } }>(
    "/api/v1/pregnancies/:id",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const parsed = updatePregnancyInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(invalidInput(parsed.error, request.id));
      }

      const family = await requireCurrentFamilyWithPermission(auth, "canManageProfiles");

      const pregnancy = await updatePregnancy({
        familyId: family.familyId,
        pregnancyId: request.params.id,
        dueDate: parsed.data.dueDate,
      });

      return reply.send(pregnancySchema.parse(serializePregnancy(pregnancy, request.timeZone)));
    },
  );

  fastify.post<{ Params: { id: string } }>(
    "/api/v1/pregnancies/:id/convert",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const parsed = convertPregnancyInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(invalidInput(parsed.error, request.id));
      }

      const family = await requireCurrentFamilyWithPermission(auth, "canManageProfiles");

      const { children, activeChildId } = await convertPregnancy({
        familyId: family.familyId,
        actorUserId: auth.userId,
        // "current" resolves to the family's active pregnancy (correction 16).
        pregnancyId: request.params.id,
        body: parsed.data,
      });

      await maybeCompleteOnboarding({ userId: auth.userId, familyId: family.familyId });

      return reply
        .code(201)
        .send(convertPregnancyResponseSchema.parse(serializeConvertResponse(children, activeChildId)));
    },
  );

  fastify.get("/api/v1/children", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsedQuery = listChildrenQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send(invalidInput(parsedQuery.error, request.id));
    }

    const family = await requireCurrentFamily(auth);
    const activeChildId = await resolveActiveChild(auth.userId, family.familyId);
    const children = await listChildren(family.familyId, parsedQuery.data.includeArchived);

    return reply.send(
      listChildrenResponseSchema.parse(
        children.map((child) => serializeChild(child, activeChildId)),
      ),
    );
  });

  fastify.post("/api/v1/children", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = createChildInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const family = await requireCurrentFamilyWithPermission(auth, "canManageProfiles");

    const child = await createChild({
      familyId: family.familyId,
      actorUserId: auth.userId,
      displayName: parsed.data.displayName,
      dateOfBirth: parsed.data.dateOfBirth,
    });

    await maybeCompleteOnboarding({ userId: auth.userId, familyId: family.familyId });

    const activeChildId = await resolveActiveChild(auth.userId, family.familyId);

    return reply.code(201).send(childSchema.parse(serializeChild(child, activeChildId)));
  });

  fastify.patch<{ Params: { id: string } }>("/api/v1/children/:id", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = updateChildInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const family = await requireCurrentFamilyWithPermission(auth, "canManageProfiles");

    const child = await updateChild({
      familyId: family.familyId,
      actorUserId: auth.userId,
      childId: request.params.id,
      displayName: parsed.data.displayName,
      dateOfBirth: parsed.data.dateOfBirth,
    });

    const activeChildId = await resolveActiveChild(auth.userId, family.familyId);

    return reply.send(childSchema.parse(serializeChild(child, activeChildId)));
  });

  fastify.patch<{ Params: { id: string } }>(
    "/api/v1/children/:id/archive",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const family = await requireCurrentFamilyWithPermission(auth, "canManageProfiles");

      const child = await archiveChild({
        familyId: family.familyId,
        actorUserId: auth.userId,
        childId: request.params.id,
      });

      // Re-resolved after archiving cleared every pointer at this child.
      const activeChildId = await resolveActiveChild(auth.userId, family.familyId);

      return reply.send(childSchema.parse(serializeChild(child, activeChildId)));
    },
  );

  /** Any active member may switch their own context; never anyone else's. */
  fastify.post<{ Params: { id: string } }>(
    "/api/v1/children/:id/activate",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const family = await requireCurrentFamily(auth);

      const child = await activateChild({
        familyId: family.familyId,
        userId: auth.userId,
        childId: request.params.id,
      });

      return reply.send(childSchema.parse(serializeChild(child, child.id)));
    },
  );
}
