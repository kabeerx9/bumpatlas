import {
  acceptInviteInputSchema,
  createFamilyInputSchema,
  createInviteInputSchema,
  createInviteResponseSchema,
  familySummarySchema,
  invitePreviewSchema,
  leaveFamilyInputSchema,
  stageResponseSchema,
  updateMemberInputSchema,
} from "@bumpatlas/contracts/v1";
import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/middleware/require-auth";
import {
  requireCurrentFamily,
  requireCurrentFamilyWithPermission,
} from "@/middleware/require-family-member";
import { invalidInput } from "@/services/errors";
import {
  createFamily,
  getFamilySummary,
  leaveFamily,
  removeMember,
  updateMemberRole,
} from "@/services/household";
import {
  findReplay,
  hashRequest,
  isIdempotencyRaceError,
  readIdempotencyKey,
  recordIdempotencyTx,
} from "@/services/idempotency";
import { acceptInvite, createInvite, previewInvite } from "@/services/invite";
import { maybeCompleteOnboarding } from "@/services/preference";
import { listChildren, resolveStageForUser, serializeChild } from "@/services/profile";
import { trackProductEvent } from "@/services/product-event";

export type FamilyRouteDeps = {
  requireAuth: typeof requireAuth;
};

export async function registerFamilyRoutes(
  fastify: FastifyInstance,
  deps: Partial<FamilyRouteDeps> = {},
) {
  const d = { requireAuth, ...deps };

  fastify.post("/api/v1/families", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = createFamilyInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const routeKey = "POST /api/v1/families";
    const idempotencyKey = readIdempotencyKey(request);
    const requestHash = hashRequest(parsed.data);

    // Creating a household twice from a double tap would strand the user's data in
    // whichever one the client forgot about.
    if (idempotencyKey) {
      const replay = await findReplay(auth.userId, routeKey, idempotencyKey, requestHash);

      if (replay) {
        const summary = await getFamilySummary({
          userId: auth.userId,
          familyId: String(replay.body),
          timeZone: request.timeZone,
        });
        return reply.code(replay.statusCode).send(familySummarySchema.parse(summary));
      }
    }

    let familyId: string;
    try {
      familyId = await createFamily({
        userId: auth.userId,
        name: parsed.data.name,
        idempotency: idempotencyKey
          ? (tx, response) =>
              recordIdempotencyTx(tx, {
                userId: auth.userId,
                routeKey,
                idempotencyKey,
                requestHash,
                statusCode: 201,
                responseJson: response as string,
              })
          : undefined,
      });
    } catch (error) {
      // Lost a concurrent race on the same key: the winner already created it.
      if (idempotencyKey && isIdempotencyRaceError(error)) {
        const replay = await findReplay(auth.userId, routeKey, idempotencyKey, requestHash);
        if (replay) {
          const summary = await getFamilySummary({
            userId: auth.userId,
            familyId: String(replay.body),
            timeZone: request.timeZone,
          });
          return reply.code(replay.statusCode).send(familySummarySchema.parse(summary));
        }
      }
      throw error;
    }

    await maybeCompleteOnboarding({ userId: auth.userId, familyId });

    const summary = await getFamilySummary({
      userId: auth.userId,
      familyId,
      timeZone: request.timeZone,
    });

    return reply.code(201).send(familySummarySchema.parse(summary));
  });

  fastify.get("/api/v1/families/current", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const family = await requireCurrentFamily(auth);
    const summary = await getFamilySummary({
      userId: auth.userId,
      familyId: family.familyId,
      timeZone: request.timeZone,
    });

    return reply.send(familySummarySchema.parse(summary));
  });

  fastify.get("/api/v1/stage", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const family = await requireCurrentFamily(auth);

    const [{ stage, activeChildId }, children] = await Promise.all([
      resolveStageForUser({
        userId: auth.userId,
        familyId: family.familyId,
        timeZone: request.timeZone,
      }),
      listChildren(family.familyId, false),
    ]);

    const activeChild = children.find((child) => child.id === activeChildId) ?? null;

    return reply.send(
      stageResponseSchema.parse({
        stageMode: stage.stageMode,
        childDisplayName: activeChild?.displayName ?? null,
        // Echoed so the client never guesses which sibling the stage describes.
        activeChildId,
        children: children.map((child) => serializeChild(child, activeChildId)),
        dueDate: stage.dueDate,
        gestationalWeek: stage.gestationalWeek,
      }),
    );
  });

  fastify.post("/api/v1/families/current/invites", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = createInviteInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const family = await requireCurrentFamilyWithPermission(
      auth,
      "canManageMembers",
      "Only an owner or parent can invite members.",
    );

    const invite = await createInvite({
      familyId: family.familyId,
      actorUserId: auth.userId,
      role: parsed.data.role,
      email: parsed.data.email,
    });

    await trackProductEvent("INVITE_SENT", {
      actorUserId: auth.userId,
      familyId: family.familyId,
      logger: request.log,
    });

    return reply.code(201).send(createInviteResponseSchema.parse(invite));
  });

  /**
   * Preview requires a signed-in adult but *not* household membership — the whole
   * point is that the recipient is not a member yet.
   */
  fastify.get<{ Params: { token: string } }>(
    "/api/v1/invites/:token/preview",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const preview = await previewInvite(request.params.token);

      return reply.send(invitePreviewSchema.parse(preview));
    },
  );

  fastify.post<{ Params: { token: string } }>(
    "/api/v1/invites/:token/accept",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      // Token comes from the path; the body form is accepted only for compatibility
      // and must agree with it.
      const bodyToken = acceptInviteInputSchema.partial().safeParse(request.body ?? {});
      const token = request.params.token;

      if (bodyToken.success && bodyToken.data.token && bodyToken.data.token !== token) {
        return reply
          .code(400)
          .send({ error: { code: "INVALID_INPUT", message: "Token mismatch.", requestId: request.id } });
      }

      const routeKey = "POST /api/v1/invites/:token/accept";
      const idempotencyKey = readIdempotencyKey(request);
      const requestHash = hashRequest({ token });

      if (idempotencyKey) {
        const replay = await findReplay(auth.userId, routeKey, idempotencyKey, requestHash);

        if (replay) {
          const summary = await getFamilySummary({
            userId: auth.userId,
            familyId: String(replay.body),
            timeZone: request.timeZone,
          });
          return reply.code(replay.statusCode).send(familySummarySchema.parse(summary));
        }
      }

      const { familyId } = await acceptInvite({ token, userId: auth.userId });

      await maybeCompleteOnboarding({ userId: auth.userId, familyId });

      await trackProductEvent("INVITE_ACCEPTED", {
        actorUserId: auth.userId,
        familyId,
        logger: request.log,
      });

      const summary = await getFamilySummary({
        userId: auth.userId,
        familyId,
        timeZone: request.timeZone,
      });

      return reply.send(familySummarySchema.parse(summary));
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    "/api/v1/families/current/members/:id",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const parsed = updateMemberInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send(invalidInput(parsed.error, request.id));
      }

      const family = await requireCurrentFamilyWithPermission(
        auth,
        "canManageMembers",
        "Only an owner or parent can manage members.",
      );

      if (parsed.data.role) {
        await updateMemberRole({
          familyId: family.familyId,
          actorUserId: auth.userId,
          memberId: request.params.id,
          role: parsed.data.role,
        });
      }

      const summary = await getFamilySummary({
        userId: auth.userId,
        familyId: family.familyId,
        timeZone: request.timeZone,
      });

      return reply.send(familySummarySchema.parse(summary));
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/families/current/members/:id",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const family = await requireCurrentFamilyWithPermission(
        auth,
        "canManageMembers",
        "Only an owner or parent can remove members.",
      );

      await removeMember({
        familyId: family.familyId,
        actorUserId: auth.userId,
        memberId: request.params.id,
      });

      return reply.code(204).send();
    },
  );

  fastify.post("/api/v1/families/current/leave", async (request, reply) => {
    const auth = await d.requireAuth(request, reply);
    if (!auth) return;

    const parsed = leaveFamilyInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(invalidInput(parsed.error, request.id));
    }

    const family = await requireCurrentFamily(auth);

    await leaveFamily({ familyId: family.familyId, userId: auth.userId });

    return reply.code(204).send();
  });
}
