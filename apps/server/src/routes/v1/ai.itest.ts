import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { registerAiRoutes } from "@/routes/v1/ai";
import { registerFamilyRoutes } from "@/routes/v1/families";
import { registerPreferenceRoutes } from "@/routes/v1/preferences";
import { registerProfileRoutes } from "@/routes/v1/profiles";
import { sendMessage, type AiProvider } from "@/services/ai/chat";
import { asUser, testRequireAuth } from "@/test/helpers/auth";
import { buildTestApp } from "@/test/helpers/build-test-app";
import { disconnectDatabase, prisma, resetDatabase } from "@/test/helpers/db";

type App = Awaited<ReturnType<typeof createApp>>;

/**
 * `AI_ENABLED` is false in the test env — deliberately, since that is production's default.
 * Route tests assert the feature is inert; pipeline tests call `sendMessage` with the flag
 * dependency stubbed, so the safety behaviour is still fully covered.
 */
const aiEnabled = () => true;

/**
 * Purely a readability marker around blocks that run with the flag stubbed on — the stub
 * itself is `isEnabled: aiEnabled` on each call. It does not mutate any global state,
 * because `env` is parsed once at import and could not be changed here anyway.
 */
function withAiEnabled<T>(run: () => Promise<T>): Promise<T> {
  return run();
}

function fakeProvider(answer: string): AiProvider & { calls: number; lastPrompt?: unknown } {
  const provider = {
    calls: 0,
    lastPrompt: undefined as unknown,
    complete: async (input: unknown) => {
      provider.calls += 1;
      provider.lastPrompt = input;
      return answer;
    },
  };

  return provider;
}

async function createApp(provider?: AiProvider) {
  return buildTestApp({
    register: (fastify) => {
      fastify.register(registerFamilyRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerProfileRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerPreferenceRoutes, { requireAuth: testRequireAuth });
      fastify.register(registerAiRoutes, {
        requireAuth: testRequireAuth,
        ...(provider ? { provider } : {}),
      });
    },
  });
}

async function onboard(app: App, clerkId: string) {
  await app.inject({
    method: "POST",
    url: "/api/v1/consents",
    headers: asUser(clerkId),
    payload: { type: "age_attestation", version: "2026-07-01" },
  });
  const family = await app.inject({
    method: "POST",
    url: "/api/v1/families",
    headers: asUser(clerkId),
    payload: { name: "Household" },
  });
  await app.inject({
    method: "POST",
    url: "/api/v1/children",
    headers: asUser(clerkId),
    payload: { displayName: "Ava", dateOfBirth: "2026-05-01" },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { clerkId } });
  return { familyId: family.json().id as string, userId: user.id };
}

async function seedSnippet(slug = "wake-windows") {
  return prisma.contentItem.create({
    data: {
      slug,
      type: "AI_SNIPPET",
      title: "Wake windows around 12 weeks",
      summary: "Many babies stay awake about an hour between naps. Cues work better than the clock.",
      bodyMarkdown: "Longer text.",
      stageTags: [],
      reviewerName: "Dr Test Reviewer",
      reviewedOn: new Date("2026-03-12T00:00:00.000Z"),
      isPublished: true,
    },
  });
}

beforeEach(resetDatabase);
after(disconnectDatabase);

describe("AI feature flag", () => {
  it("returns 503 while the feature is off", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/ai/chat",
      headers: asUser("clerk_owner"),
      payload: { message: "what are wake windows" },
    });

    // Production default. Nothing is stored, no provider is contacted.
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().error.code, "FEATURE_UNAVAILABLE");
    assert.equal(await prisma.aiMessage.count(), 0);
    await app.close();
  });

  it("still reports usage honestly while disabled", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/ai/usage",
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().dailyUsed, 0);
    assert.equal(response.json().dailyLimit, 5);
    await app.close();
  });
});

describe("AI pipeline", () => {
  it("refuses when no reviewed source matches, without calling the provider", async () => {
    const app = await createApp();
    const { familyId, userId } = await onboard(app, "clerk_owner");
    const provider = fakeProvider("should never be used");

    const response = await withAiEnabled(() =>
      sendMessage({
        userId,
        familyId,
        timeZone: "UTC",
        message: "how do wake windows work",
        provider,
        isEnabled: aiEnabled,
      }),
    );

    assert.equal(provider.calls, 0);
    assert.match(response.message.body, /do not have a reviewed answer/);
    assert.deepEqual(response.message.citations, []);

    const stored = await prisma.aiMessage.findFirstOrThrow({ where: { role: "ASSISTANT" } });
    assert.equal(stored.safetyLabel, "REFUSED_NO_SOURCE");
    await app.close();
  });

  it("answers with citations when a reviewed source exists", async () => {
    const app = await createApp();
    const { familyId, userId } = await onboard(app, "clerk_owner");
    await seedSnippet();
    const provider = fakeProvider(
      "Many babies this age stay awake for about an hour between naps.",
    );

    const response = await withAiEnabled(() =>
      sendModel({ userId, familyId, provider, message: "tell me about wake windows" }),
    );

    assert.equal(provider.calls, 1);
    assert.equal(response.message.citations?.length, 1);
    assert.equal(response.message.citations?.[0]?.id, "wake-windows");

    const stored = await prisma.aiMessage.findFirstOrThrow({ where: { role: "ASSISTANT" } });
    assert.equal(stored.safetyLabel, "SOURCED");
    await app.close();
  });

  it("sends only snippets and a stage key to the provider", async () => {
    const app = await createApp();
    const { familyId, userId } = await onboard(app, "clerk_owner");
    await seedSnippet();
    // Household content that must never cross the boundary.
    await prisma.memoryEntry.create({
      data: {
        familyId,
        authorUserId: userId,
        title: "Private memory",
        body: "Ava smiled at the window light",
        eventDate: new Date("2026-07-29T00:00:00.000Z"),
      },
    });
    const provider = fakeProvider("An answer.");

    await withAiEnabled(() =>
      sendModel({ userId, familyId, provider, message: "tell me about wake windows" }),
    );

    const serialized = JSON.stringify(provider.lastPrompt);

    assert.equal(serialized.includes("Ava smiled at the window light"), false);
    assert.equal(serialized.includes("Private memory"), false);
    // The child's name and date of birth must not leak either.
    assert.equal(serialized.includes("2026-05-01"), false);
    assert.ok(serialized.includes("wake-windows") || serialized.includes("Wake windows"));
    await app.close();
  });

  it("returns a fixed escalation for a critical message, bypassing the provider and the quota", async () => {
    const app = await createApp();
    const { familyId, userId } = await onboard(app, "clerk_owner");
    await seedSnippet();
    const provider = fakeProvider("should never be used");

    const response = await withAiEnabled(() =>
      sendMessage({
        userId,
        familyId,
        timeZone: "UTC",
        message: "i want to hurt myself",
        provider,
        isEnabled: aiEnabled,
      }),
    );

    assert.equal(provider.calls, 0);
    assert.ok(response.message.escalate);
    // Someone in crisis must never meet a quota wall.
    assert.equal(response.usage.dailyUsed, 0);

    const stored = await prisma.aiMessage.findFirstOrThrow({ where: { role: "ASSISTANT" } });
    assert.equal(stored.safetyLabel, "ESCALATED");
    await app.close();
  });

  it("refuses a dosing question without contacting the provider", async () => {
    const app = await createApp();
    const { familyId, userId } = await onboard(app, "clerk_owner");
    const provider = fakeProvider("Give 5ml.");

    const response = await withAiEnabled(() =>
      sendMessage({
        userId,
        familyId,
        timeZone: "UTC",
        message: "how much calpol for a 4 month old",
        provider,
        isEnabled: aiEnabled,
      }),
    );

    assert.equal(provider.calls, 0);
    assert.equal(response.message.body.includes("ml"), false);

    const stored = await prisma.aiMessage.findFirstOrThrow({ where: { role: "ASSISTANT" } });
    assert.equal(stored.safetyLabel, "REFUSED_OUT_OF_SCOPE");
    await app.close();
  });

  it("suppresses a provider answer containing a blocked claim", async () => {
    const app = await createApp();
    const { familyId, userId } = await onboard(app, "clerk_owner");
    await seedSnippet();
    // The classifier passed the question, but the model volunteered a dose anyway.
    const provider = fakeProvider("You can give them 5ml of paracetamol every four hours.");

    const response = await withAiEnabled(() =>
      sendModel({ userId, familyId, provider, message: "tell me about wake windows" }),
    );

    assert.equal(provider.calls, 1);
    assert.equal(response.message.body.includes("5ml"), false);
    assert.deepEqual(response.message.citations, []);

    const stored = await prisma.aiMessage.findFirstOrThrow({ where: { role: "ASSISTANT" } });
    assert.equal(stored.safetyLabel, "REFUSED_OUT_OF_SCOPE");
    await app.close();
  });

  it("enforces the daily family quota", async () => {
    const app = await createApp();
    const { familyId, userId } = await onboard(app, "clerk_owner");
    await seedSnippet();
    await prisma.entitlementCache.update({ where: { familyId }, data: { aiDailyLimit: 2 } });
    const provider = fakeProvider("An answer.");

    await withAiEnabled(async () => {
      await sendModel({ userId, familyId, provider, message: "wake windows question one" });
      await sendModel({ userId, familyId, provider, message: "wake windows question two" });

      await assert.rejects(
        sendModel({ userId, familyId, provider, message: "wake windows question three" }),
        (error: unknown) => (error as { code?: string }).code === "QUOTA_EXCEEDED",
      );
    });

    await app.close();
  });

  it("does not charge the quota when the provider fails", async () => {
    const app = await createApp();
    const { familyId, userId } = await onboard(app, "clerk_owner");
    await seedSnippet();
    const failing: AiProvider = {
      complete: async () => {
        throw new Error("provider timeout");
      },
    };

    await withAiEnabled(async () => {
      await assert.rejects(
        sendModel({ userId, familyId, provider: failing, message: "wake windows question" }),
        (error: unknown) => (error as { code?: string }).code === "PROVIDER_ERROR",
      );
    });

    const usage = await prisma.aiUsageDaily.findFirstOrThrow();
    // Reserve-then-release: an outage must not consume a parent's allowance.
    assert.equal(usage.count, 0);
    await app.close();
  });

  it("refuses a conversation belonging to another user", async () => {
    const app = await createApp();
    const owner = await onboard(app, "clerk_owner");
    const other = await onboard(app, "clerk_other");
    await seedSnippet();
    const theirConversation = await prisma.aiConversation.create({
      data: { userId: other.userId, familyId: other.familyId },
    });
    const provider = fakeProvider("An answer.");

    await withAiEnabled(async () => {
      await assert.rejects(
        sendMessage({
          userId: owner.userId,
          familyId: owner.familyId,
          timeZone: "UTC",
          conversationId: theirConversation.id,
          message: "wake windows question",
          provider,
          isEnabled: aiEnabled,
        }),
        (error: unknown) => (error as { code?: string }).code === "CONVERSATION_NOT_FOUND",
      );
    });

    await app.close();
  });
});

describe("conversations", () => {
  it("deletes the caller's own conversation", async () => {
    const app = await createApp();
    const { familyId, userId } = await onboard(app, "clerk_owner");
    const conversation = await prisma.aiConversation.create({ data: { userId, familyId } });
    await prisma.aiMessage.create({
      data: { conversationId: conversation.id, role: "USER", body: "hello", citationSlugs: [] },
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/ai/conversations/${conversation.id}`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 204);
    assert.equal(await prisma.aiMessage.count(), 0);
    await app.close();
  });

  it("refuses to delete another user's conversation", async () => {
    const app = await createApp();
    await onboard(app, "clerk_owner");
    const other = await onboard(app, "clerk_other");
    const theirs = await prisma.aiConversation.create({
      data: { userId: other.userId, familyId: other.familyId },
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/ai/conversations/${theirs.id}`,
      headers: asUser("clerk_owner"),
    });

    assert.equal(response.statusCode, 404);
    // Still there: the 404 must not have deleted it.
    assert.equal(await prisma.aiConversation.count(), 1);
    await app.close();
  });

  it("marks a reported message so retention keeps it as evidence", async () => {
    const app = await createApp();
    const { familyId, userId } = await onboard(app, "clerk_owner");
    const conversation = await prisma.aiConversation.create({ data: { userId, familyId } });
    const message = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        body: "Something unhelpful",
        citationSlugs: [],
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/ai/messages/${message.id}/report`,
      headers: asUser("clerk_owner"),
      payload: { reason: "This felt wrong" },
    });

    assert.equal(response.statusCode, 204);
    const stored = await prisma.aiMessage.findUniqueOrThrow({ where: { id: message.id } });
    assert.ok(stored.reportedAt);
    await app.close();
  });
});

/** Small wrapper so the pipeline tests read as one line each. */
function sendModel(input: {
  userId: string;
  familyId: string;
  provider: AiProvider;
  message: string;
}) {
  return sendMessage({
    userId: input.userId,
    familyId: input.familyId,
    timeZone: "UTC",
    message: input.message,
    provider: input.provider,
    isEnabled: aiEnabled,
  });
}
