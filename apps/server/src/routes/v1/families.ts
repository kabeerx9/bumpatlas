import {
  createFamilyInputSchema,
  createInviteInputSchema,
  createInviteResponseSchema,
  familySummarySchema,
  invitePreviewSchema,
  leaveFamilyInputSchema,
  stageResponseSchema,
  updateMemberInputSchema,
} from "@bumpatlas/contracts/v1";
import { clerkClient } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/middleware/require-auth";
import {
  requireCurrentFamily,
  requireCurrentFamilyWithPermission,
  requireFamilyMember,
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
import {
  acceptInvite,
  createInvite,
  hashInviteToken,
  inviteNeedsVerifiedEmail,
  previewInvite,
} from "@/services/invite";
import { maybeCompleteOnboarding } from "@/services/preference";
import { listChildren, resolveStageForUser, serializeChild } from "@/services/profile";
import { trackProductEvent } from "@/services/product-event";
import { listVerifiedClerkEmails } from "@/services/user";

export type FamilyRouteDeps = {
  requireAuth: typeof requireAuth;
  getVerifiedEmails: (clerkUserId: string) => Promise<string[]>;
};

const defaultFamilyRouteDeps: FamilyRouteDeps = {
  requireAuth,
  getVerifiedEmails: async (clerkUserId) =>
    listVerifiedClerkEmails(await clerkClient.users.getUser(clerkUserId)),
};

export async function registerFamilyRoutes(
  fastify: FastifyInstance,
  deps: Partial<FamilyRouteDeps> = {},
) {
  const d = { ...defaultFamilyRouteDeps, ...deps };

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
   * Public possession-based preview. The service returns a strict allowlist and
   * deliberately excludes child/member detail; household access still requires
   * authenticated acceptance below.
   */
  fastify.get<{ Params: { token: string } }>(
    "/api/v1/invites/:token/preview",
    async (request, reply) => {
      const preview = await previewInvite(request.params.token);

      return reply.send(invitePreviewSchema.parse(preview));
    },
  );

  fastify.post<{ Params: { token: string } }>(
    "/api/v1/invites/:token/accept",
    async (request, reply) => {
      const auth = await d.requireAuth(request, reply);
      if (!auth) return;

      const token = request.params.token;

      const routeKey = "POST /api/v1/invites/:token/accept";
      // A single-use token is already the natural operation identity. Hash it so
      // response-loss retries are safe without persisting the bearer token itself.
      const idempotencyKey = hashInviteToken(token);
      const requestHash = hashRequest({ token });

      const sendReplay = async (replay: { statusCode: number; body: unknown }) => {
        const familyId = String(replay.body);
        // Idempotency is not authorization. A removed member must not recover
        // household data by replaying an old successful acceptance.
        await requireFamilyMember(auth, familyId);

        // The membership and replay record commit together, while onboarding
        // completion is intentionally post-transaction. Re-run that idempotent
        // projection so a process/response loss in between self-heals on retry.
        await maybeCompleteOnboarding({ userId: auth.userId, familyId });

        const summary = await getFamilySummary({
          userId: auth.userId,
          familyId,
          timeZone: request.timeZone,
        });
        return reply.code(replay.statusCode).send(familySummarySchema.parse(summary));
      };

      const existingReplay = await findReplay(
        auth.userId,
        routeKey,
        idempotencyKey,
        requestHash,
      );

      if (existingReplay) {
        return sendReplay(existingReplay);
      }

      // Email-locked invites are an authorization boundary. Resolve the current
      // verified Clerk addresses for this attempt; the local profile mirror can
      // be stale after an address is removed or before verification completes.
      // Unbound invites skip that external dependency and latency entirely.
      const verifiedEmails = (await inviteNeedsVerifiedEmail(token))
        ? await d.getVerifiedEmails(auth.clerkUserId)
        : [];

      let familyId: string;
      try {
        ({ familyId } = await acceptInvite({
          token,
          userId: auth.userId,
          verifiedEmails,
          idempotency: (tx, responseFamilyId) =>
            recordIdempotencyTx(tx, {
              userId: auth.userId,
              routeKey,
              idempotencyKey,
              requestHash,
              statusCode: 200,
              responseJson: responseFamilyId,
            }),
        }));
      } catch (error) {
        // Two same-user retries can both miss the first read. One then waits on
        // the invite row lock and observes the consumed invite. Re-reading the
        // record after any failure distinguishes that response-loss race from a
        // genuinely expired/different-user token.
        const winningReplay = await findReplay(
          auth.userId,
          routeKey,
          idempotencyKey,
          requestHash,
        );
        if (winningReplay) {
          return sendReplay(winningReplay);
        }
        throw error;
      }

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
