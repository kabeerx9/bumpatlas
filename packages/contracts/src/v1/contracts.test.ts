import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  completeChallengeInputSchema,
  createInviteInputSchema,
  createMemoryInputSchema,
  familySummarySchema,
  groupPostSchema,
  listBadgesResponseSchema,
  listModerationQueueResponseSchema,
  mediaUploadUrlInputSchema,
  notificationPreferencesSchema,
  reportInputSchema,
  todayResponseSchema,
} from "./index.ts";

describe("todayResponseSchema", () => {
  it("accepts a valid today payload", () => {
    const payload = {
      date: "2026-07-29",
      prompt: "What made today feel like yours?",
      cards: {
        capture: { promptId: "prompt_1", prompt: "What made today feel like yours?" },
        care: null,
        learn: null,
        connect: null,
      },
      loopCompletion: { capture: true, care: false, learn: false, connect: false },
      weekProgress: { storyDays: 3, wellnessDays: 2, activeDays: 3, goal: 4 },
      mediaUploadsUsed: 8,
      mediaUploadsLimit: 30,
      aiMessagesUsed: 2,
      aiDailyLimit: 10,
      isPremium: false,
    };
    assert.deepEqual(todayResponseSchema.parse(payload), payload);
  });

  it("rejects missing week progress", () => {
    assert.throws(() =>
      todayResponseSchema.parse({
        date: "2026-07-29",
        prompt: "x",
        loopCompletion: { capture: true, care: false, learn: false, connect: false },
        mediaUploadsUsed: 0,
        mediaUploadsLimit: 30,
        aiMessagesUsed: 0,
        aiDailyLimit: 10,
        isPremium: false,
      }),
    );
  });
});

describe("completeChallengeInputSchema", () => {
  it("requires challengeId", () => {
    assert.equal(completeChallengeInputSchema.parse({ challengeId: "care-1" }).challengeId, "care-1");
    assert.throws(() => completeChallengeInputSchema.parse({}));
  });
});

describe("listBadgesResponseSchema", () => {
  it("accepts earned and locked badges", () => {
    const payload = {
      items: [
        {
          id: "b1",
          title: "First Capture",
          description: "Saved one memory",
          earnedAt: "2026-07-12T00:00:00.000Z",
        },
        {
          id: "b2",
          title: "Week of Stories",
          description: "4 of 7 days",
          earnedAt: null,
        },
      ],
    };
    assert.deepEqual(listBadgesResponseSchema.parse(payload), payload);
  });
});

describe("createMemoryInputSchema", () => {
  it("accepts household memory create payloads", () => {
    const payload = {
      familyId: "family-1",
      body: "Ava smiled at the window light.",
      eventDate: "2026-07-29",
      visibility: "HOUSEHOLD" as const,
      mediaStorageKey: null,
    };
    const parsed = createMemoryInputSchema.parse(payload);
    assert.equal(parsed.familyId, "family-1");
    assert.equal(parsed.visibility, "HOUSEHOLD");
  });

  it("requires an explicit household target", () => {
    assert.throws(() =>
      createMemoryInputSchema.parse({
        body: "A memory with an ambiguous destination.",
        eventDate: "2026-07-29",
      }),
    );
  });
});

describe("mediaUploadUrlInputSchema", () => {
  it("requires and preserves the explicit household target", () => {
    const parsed = mediaUploadUrlInputSchema.parse({
      familyId: "family-1",
      contentType: "image/jpeg",
      byteSize: 1024,
    });

    assert.equal(parsed.familyId, "family-1");
    assert.throws(() =>
      mediaUploadUrlInputSchema.parse({ contentType: "image/jpeg", byteSize: 1024 }),
    );
  });
});

describe("familySummarySchema", () => {
  it("accepts owner and contributor members", () => {
    const payload = {
      id: "fam-1",
      name: "The Rivera household",
      stageMode: "postpartum" as const,
      childDisplayName: "Ava",
      children: [
        {
          id: "child_1",
          displayName: "Ava",
          dateOfBirth: "2026-05-01",
          birthOrder: 0,
          isActive: true,
          archivedAt: null,
        },
      ],
      dueDate: null,
      members: [
        { id: "m1", displayName: "You", role: "OWNER" as const, status: "active" as const },
        {
          id: "m2",
          displayName: "Jordan",
          role: "CONTRIBUTOR" as const,
          status: "active" as const,
        },
      ],
    };
    assert.equal(familySummarySchema.parse(payload).members.length, 2);
  });
});

describe("createInviteInputSchema", () => {
  it("accepts contributor invites", () => {
    assert.equal(
      createInviteInputSchema.parse({ role: "CONTRIBUTOR" }).role,
      "CONTRIBUTOR",
    );
  });
});

describe("groupPostSchema", () => {
  it("accepts a group post", () => {
    const payload = {
      id: "p1",
      groupId: "g1",
      authorId: "u1",
      authorName: "Maya",
      body: "Evening fussiness tips?",
      reactionCount: 3,
      commentCount: 1,
      createdAt: "2026-07-29T12:00:00.000Z",
    };
    assert.equal(groupPostSchema.parse(payload).reactionCount, 3);
  });
});

describe("reportInputSchema", () => {
  it("requires target and reason", () => {
    assert.equal(
      reportInputSchema.parse({
        targetType: "post",
        targetId: "p1",
        reason: "Medical advice",
      }).targetType,
      "post",
    );
    assert.throws(() =>
      reportInputSchema.parse({
        targetType: "post",
        targetId: "p1",
        reason: "",
      }),
    );
  });
});

describe("listModerationQueueResponseSchema", () => {
  it("accepts queue items", () => {
    const payload = {
      items: [
        {
          id: "mod1",
          type: "Report",
          summary: "Possible medical advice",
          postPreview: "Try giving…",
          reporter: "Anonymous",
          priority: "high" as const,
          status: "Open",
          groupId: "grp_1",
          groupKind: "stage" as const,
          createdAt: "2026-07-29T10:00:00.000Z",
        },
      ],
    };
    assert.equal(listModerationQueueResponseSchema.parse(payload).items[0]?.priority, "high");
  });
});

describe("notificationPreferencesSchema", () => {
  it("accepts preference payloads", () => {
    const payload = {
      prefs: {
        dailyPrompt: true,
        wellnessReminder: true,
        partnerActivity: false,
        weeklyRecap: true,
        communityReply: false,
        subscription: true,
      },
      quietHoursEnabled: true,
      quietStart: "21:00",
      quietEnd: "08:00",
      groupRelatedAlerts: true,
    };
    assert.equal(notificationPreferencesSchema.parse(payload).quietStart, "21:00");
  });
});
