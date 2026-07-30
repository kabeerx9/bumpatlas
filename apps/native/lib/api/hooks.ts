import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  Child,
  EntitlementsResponse,
  FamilySummary,
  Memory,
  Recap,
  StageResponse,
  TodayResponse,
} from "@bumpatlas/contracts";

import * as aiApi from "@/lib/api/ai";
import * as billingApi from "@/lib/api/billing";
import { useMockData } from "@/lib/api/client";
import * as communityApi from "@/lib/api/community";
import * as contentApi from "@/lib/api/content";
import * as dataRequestsApi from "@/lib/api/data-requests";
import * as familiesApi from "@/lib/api/families";
import * as memoriesApi from "@/lib/api/memories";
import * as moderationApi from "@/lib/api/moderation";
import * as notificationsApi from "@/lib/api/notifications";
import * as profilesApi from "@/lib/api/profiles";
import * as recapsApi from "@/lib/api/recaps";
import * as todayApi from "@/lib/api/today";
import {
  mockGuides,
  mockGroupPosts,
  mockMemories,
  mockRecaps,
  mockToday as mockTodayContent,
} from "@/features/mock/demo-data";
import { mockBadges, mockModerationQueue, mockStageGroups } from "@/features/mock/mock-content";

export const queryKeys = {
  today: ["today"] as const,
  memories: ["memories"] as const,
  memory: (id: string) => ["memories", id] as const,
  family: ["family", "current"] as const,
  stage: ["stage"] as const,
  entitlements: ["entitlements"] as const,
  groups: ["groups"] as const,
  groupPosts: (groupId: string) => ["groups", groupId, "posts"] as const,
  content: ["content"] as const,
  contentDetail: (slug: string) => ["content", slug] as const,
  recap: ["recap", "current"] as const,
  aiUsage: ["ai", "usage"] as const,
  notificationPrefs: ["notifications", "preferences"] as const,
  badges: ["badges"] as const,
  moderation: ["moderation", "queue"] as const,
};

/**
 * The mock builders are annotated with the contract types on purpose: a contract
 * change then fails to compile *here*, at the fixture, instead of surfacing as an
 * unrelated `{}` inference failure inside every screen's useQuery call.
 */
const mockChild: Child = {
  id: "child-mock",
  displayName: "Ava",
  dateOfBirth: "2026-05-01",
  birthOrder: 0,
  isActive: true,
  archivedAt: null,
};

function mockToday(): TodayResponse {
  const prompt = "What made today feel like yours?";
  return {
    date: new Date().toISOString().slice(0, 10),
    prompt,
    cards: {
      capture: { promptId: "prompt-mock", prompt },
      care: mockTodayContent.wellnessAction,
      learn: {
        id: mockTodayContent.learnCard.id,
        slug: mockTodayContent.learnCard.id,
        title: mockTodayContent.learnCard.title,
        summary: mockTodayContent.learnCard.detail,
        readingMinutes: 3,
        stageTags: ["postpartum"],
      },
      connect: {
        mode: mockTodayContent.connectCard.mode,
        groupId: null,
        groupName: mockTodayContent.connectCard.groupName,
        prompt: mockTodayContent.connectCard.prompt,
        replyCount: mockTodayContent.connectCard.replyCount,
      },
    },
    loopCompletion: { capture: true, care: false, learn: false, connect: false },
    weekProgress: { storyDays: 3, wellnessDays: 2, activeDays: 3, goal: 4 },
    mediaUploadsUsed: 8,
    mediaUploadsLimit: 30,
    aiMessagesUsed: 2,
    aiDailyLimit: 10,
    isPremium: false,
  };
}

function mockMemoryItems(): Memory[] {
  return mockMemories.map((memory) => ({
    id: memory.id,
    title: memory.title,
    body: memory.body,
    eventDate: memory.dateLabel,
    authorName: memory.author,
    visibility: memory.visibility,
    childId: mockChild.id,
    pregnancyId: null,
    mediaStorageKey: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

function mockFamily(): FamilySummary {
  return {
    id: "fam-mock",
    name: "The Rivera household",
    stageMode: "postpartum" as const,
    childDisplayName: "Ava",
    children: [mockChild],
    dueDate: null as string | null,
    members: [
      {
        id: "m1",
        displayName: "You",
        role: "OWNER" as const,
        status: "active" as const,
      },
      {
        id: "m2",
        displayName: "Jordan",
        role: "CONTRIBUTOR" as const,
        status: "active" as const,
      },
    ],
  };
}

function mockGroupPostItems(groupId: string) {
  const group = mockStageGroups.find((item) => item.id === groupId);
  const source =
    group && "posts" in group && Array.isArray(group.posts) && group.posts.length > 0
      ? group.posts
      : mockGroupPosts;

  return source.map((post) => ({
    id: post.id,
    groupId,
    authorId: post.authorId,
    authorName: post.author,
    body: post.body,
    reactionCount: post.reactions,
    reactedByMe: false,
    commentCount: post.comments?.length ?? 0,
    createdAt: new Date().toISOString(),
    comments: (post.comments ?? []).map((comment) => ({
      id: comment.id,
      authorId: comment.authorId,
      authorName: comment.author,
      body: comment.body,
      createdAt: comment.createdAt,
    })),
  }));
}

export function useTodayQuery() {
  return useQuery({
    queryKey: queryKeys.today,
    queryFn: () => (useMockData ? Promise.resolve(mockToday()) : todayApi.getToday()),
  });
}

export function useMemoriesQuery() {
  return useQuery({
    queryKey: queryKeys.memories,
    queryFn: async () => {
      if (useMockData) {
        return { items: mockMemoryItems(), nextCursor: null };
      }
      return memoriesApi.listMemories();
    },
  });
}

export function useMemoryQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.memory(id),
    enabled: Boolean(id),
    queryFn: async () => {
      if (useMockData) {
        const found = mockMemoryItems().find((item) => item.id === id);
        if (!found) throw new Error("Memory not found");
        return found;
      }
      return memoriesApi.getMemory(id);
    },
  });
}

export function useFamilyQuery() {
  return useQuery({
    queryKey: queryKeys.family,
    queryFn: () => (useMockData ? Promise.resolve(mockFamily()) : familiesApi.getCurrentFamily()),
  });
}

export function useStageQuery() {
  return useQuery({
    queryKey: queryKeys.stage,
    queryFn: async () => {
      if (useMockData) {
        const family = mockFamily();
        const stage: StageResponse = {
          stageMode: family.stageMode,
          childDisplayName: family.childDisplayName,
          activeChildId: family.children.find((child) => child.isActive)?.id ?? null,
          children: family.children,
          dueDate: family.dueDate,
          gestationalWeek: null,
        };
        return stage;
      }
      return familiesApi.getStage();
    },
  });
}

export function useEntitlementsQuery() {
  return useQuery({
    queryKey: queryKeys.entitlements,
    queryFn: (): Promise<EntitlementsResponse> =>
      useMockData
        ? Promise.resolve({
            isPremium: false,
            planId: null,
            renewsAt: null,
            mediaUploadsLimit: 30,
            maxChildren: 2,
            aiDailyLimit: 10,
            source: "free" as const,
          })
        : billingApi.getEntitlements(),
  });
}

export function useGroupsQuery() {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: () =>
      useMockData
        ? Promise.resolve({
            items: mockStageGroups.map((group) => ({
              id: group.id,
              name: group.name,
              stageLabel: group.name,
              description: null,
              kind: "stage" as const,
              role: "member" as const,
              memberCount: group.memberCount ?? 12,
              memberLimit: 200,
              postingEnabled: true,
              archived: false,
              joined: true,
            })),
          })
        : communityApi.listGroups(),
  });
}

export function useGroupPostsQuery(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groupPosts(groupId),
    enabled: Boolean(groupId),
    queryFn: async () => {
      if (useMockData) {
        return {
          items: mockGroupPostItems(groupId).map(({ comments: _comments, ...post }) => post),
          nextCursor: null,
        };
      }
      return communityApi.listGroupPosts(groupId);
    },
  });
}

/** Mock-friendly post detail including nested comments for UI threads. */
export function useGroupPostDetailQuery(groupId: string, postId: string) {
  return useQuery({
    queryKey: [...queryKeys.groupPosts(groupId), postId] as const,
    enabled: Boolean(groupId && postId),
    queryFn: async () => {
      if (useMockData) {
        const found = mockGroupPostItems(groupId).find((post) => post.id === postId);
        if (!found) throw new Error("Post not found");
        return found;
      }
      const list = await communityApi.listGroupPosts(groupId);
      const post = list.items.find((item) => item.id === postId);
      if (!post) throw new Error("Post not found");
      return { ...post, comments: [] as Array<{
        id: string;
        authorId: string;
        authorName: string;
        body: string;
        createdAt: string;
      }> };
    },
  });
}

export function useContentQuery() {
  return useQuery({
    queryKey: queryKeys.content,
    queryFn: () =>
      useMockData
        ? Promise.resolve({
            items: mockGuides.map((guide) => ({
              id: guide.id,
              slug: guide.slug,
              title: guide.title,
              summary: guide.summary,
              readingMinutes: guide.readMinutes ?? 4,
              stageTags: guide.stageTags ?? [],
              bookmarked: false,
            })),
            nextCursor: null,
          })
        : contentApi.listContent(),
  });
}

export function useContentDetailQuery(slugOrId: string) {
  return useQuery({
    queryKey: queryKeys.contentDetail(slugOrId),
    enabled: Boolean(slugOrId),
    queryFn: async () => {
      if (useMockData) {
        const guide =
          mockGuides.find((item) => item.id === slugOrId || item.slug === slugOrId) ??
          mockGuides[0];
        return {
          id: guide.id,
          slug: guide.slug,
          title: guide.title,
          summary: guide.summary,
          readingMinutes: guide.readMinutes ?? 4,
          stageTags: guide.stageTags ?? [],
          bookmarked: false,
          bodyMarkdown: Array.isArray(guide.body) ? guide.body.join("\n\n") : guide.summary,
          citations: [
            {
              title: guide.title,
              source: guide.sourceName,
              url: undefined as string | undefined,
            },
          ],
        };
      }
      return contentApi.getContent(slugOrId);
    },
  });
}

export function useCurrentRecapQuery() {
  return useQuery({
    queryKey: queryKeys.recap,
    queryFn: (): Promise<Recap> =>
      useMockData
        ? Promise.resolve({
            id: mockRecaps[0].id,
            weekLabel: mockRecaps[0].weekLabel,
            title: mockRecaps[0].title,
            highlights: mockRecaps[0].highlights,
            eligible: true,
            childId: mockChild.id,
            childDisplayName: mockChild.displayName,
          })
        : recapsApi.getCurrentRecap(),
  });
}

export function useAiUsageQuery() {
  return useQuery({
    queryKey: queryKeys.aiUsage,
    queryFn: () =>
      useMockData
        ? Promise.resolve({
            dailyUsed: 2,
            dailyLimit: 10,
            hourlyUsed: 4,
            hourlyLimit: 20,
          })
        : aiApi.getAiUsage(),
  });
}

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: queryKeys.notificationPrefs,
    queryFn: () =>
      useMockData
        ? Promise.resolve({
            prefs: {
              dailyPrompt: true,
              wellnessReminder: true,
              partnerActivity: true,
              weeklyRecap: true,
              communityReply: false,
              subscription: true,
            },
            quietHoursEnabled: true,
            quietStart: "21:00",
            quietEnd: "08:00",
            groupRelatedAlerts: true,
          })
        : notificationsApi.getNotificationPreferences(),
  });
}

export function useBadgesQuery() {
  return useQuery({
    queryKey: queryKeys.badges,
    queryFn: () =>
      useMockData
        ? Promise.resolve({
            items: mockBadges.map((badge) => ({
              id: badge.id,
              title: badge.title,
              description: badge.description,
              earnedAt: badge.earned ? "2026-07-12T00:00:00.000Z" : null,
            })),
          })
        : todayApi.listBadges(),
  });
}

export function useModerationQueueQuery() {
  return useQuery({
    queryKey: queryKeys.moderation,
    queryFn: () =>
      useMockData
        ? Promise.resolve({
            items: mockModerationQueue.map((item) => ({
              id: item.id,
              type: item.type,
              summary: item.summary,
              postPreview: item.postPreview,
              reporter: item.reporter,
              priority: item.severity === "high" ? ("high" as const) : ("normal" as const),
              status: item.status,
              groupId: null,
              groupKind: null,
              createdAt: item.createdAt,
            })),
          })
        : moderationApi.listModerationQueue(),
  });
}

export function useCreateMemoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      body: Parameters<typeof memoriesApi.createMemory>[0];
      idempotencyKey?: string;
    }) => {
      if (useMockData) {
        const now = new Date().toISOString();
        const memory: Memory = {
          id: `mem-${Date.now()}`,
          title: input.body.body.slice(0, 48),
          body: input.body.body,
          eventDate: input.body.eventDate,
          authorName: "You",
          visibility: input.body.visibility ?? "HOUSEHOLD",
          childId: input.body.childId ?? mockChild.id,
          pregnancyId: input.body.pregnancyId ?? null,
          mediaStorageKey: input.body.mediaStorageKey ?? null,
          createdAt: now,
          updatedAt: now,
        };
        return memory;
      }
      return memoriesApi.createMemory(input.body, input.idempotencyKey);
    },
    onSuccess: async (memory) => {
      queryClient.setQueryData(queryKeys.memory(memory.id), memory);
      await queryClient.invalidateQueries({ queryKey: queryKeys.memories });
      await queryClient.invalidateQueries({ queryKey: queryKeys.today });
    },
  });
}

export function useUpdateMemoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Parameters<typeof memoriesApi.updateMemory>[1] }) => {
      if (useMockData) {
        const current =
          queryClient.getQueryData<ReturnType<typeof mockMemoryItems>[number]>(queryKeys.memory(input.id)) ??
          mockMemoryItems().find((item) => item.id === input.id);
        if (!current) throw new Error("Memory not found");
        return {
          ...current,
          ...input.patch,
          updatedAt: new Date().toISOString(),
        };
      }
      return memoriesApi.updateMemory(input.id, input.patch);
    },
    onSuccess: async (memory) => {
      queryClient.setQueryData(queryKeys.memory(memory.id), memory);
      await queryClient.invalidateQueries({ queryKey: queryKeys.memories });
    },
  });
}

export function useDeleteMemoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!useMockData) await memoriesApi.deleteMemory(id);
      return id;
    },
    onSuccess: async (id) => {
      queryClient.removeQueries({ queryKey: queryKeys.memory(id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.memories });
      await queryClient.invalidateQueries({ queryKey: queryKeys.today });
    },
  });
}

export function useCompleteChallengeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof todayApi.completeChallenge>[0]) => {
      if (useMockData) {
        const today = queryClient.getQueryData<ReturnType<typeof mockToday>>(queryKeys.today) ?? mockToday();
        return {
          ...today,
          loopCompletion: { ...today.loopCompletion, care: true },
          weekProgress: {
            ...today.weekProgress,
            wellnessDays: Math.min(today.weekProgress.goal, today.weekProgress.wellnessDays + 1),
            activeDays: Math.min(
              today.weekProgress.goal,
              Math.max(today.weekProgress.activeDays, today.weekProgress.wellnessDays + 1),
            ),
          },
        };
      }
      return todayApi.completeChallenge(input);
    },
    onSuccess: async (today) => {
      queryClient.setQueryData(queryKeys.today, today);
      await queryClient.invalidateQueries({ queryKey: queryKeys.badges });
    },
  });
}

export function useCreateGroupPostMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof communityApi.createGroupPost>[1]) => {
      if (useMockData) {
        return {
          id: `post-${Date.now()}`,
          groupId,
          authorId: "me",
          authorName: "You",
          body: input.body,
          reactionCount: 0,
          reactedByMe: false,
          commentCount: 0,
          createdAt: new Date().toISOString(),
        };
      }
      return communityApi.createGroupPost(groupId, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupPosts(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.today });
    },
  });
}

export function useCreateCommentMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; body: string }) => {
      if (useMockData) {
        return {
          id: `c-${Date.now()}`,
          authorId: "me",
          authorName: "You",
          body: input.body,
          createdAt: "Just now",
        };
      }
      return communityApi.createComment(input.postId, { body: input.body });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupPosts(groupId) });
    },
  });
}

export function useReactToPostMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      if (!useMockData) await communityApi.reactToPost(postId);
      return postId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupPosts(groupId) });
    },
  });
}

export function useCreateReportMutation() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof communityApi.createReport>[0]) => {
      if (!useMockData) await communityApi.createReport(input);
      return input;
    },
  });
}

export function useBlockUserMutation() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof communityApi.blockUser>[0]) => {
      if (!useMockData) await communityApi.blockUser(input);
      return input.userId;
    },
  });
}

export function useBookmarkContentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!useMockData) await contentApi.bookmarkContent(id);
      return id;
    },
    onSuccess: async (_id, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.content });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contentDetail(variables) });
    },
  });
}

export function useCreateInviteMutation() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof familiesApi.createInvite>[0]) => {
      if (useMockData) {
        const token = `mock-invite-${Date.now()}`;
        return {
          token,
          inviteUrl: `https://bumpatlas.app/invite/${token}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      return familiesApi.createInvite(input);
    },
  });
}

export function useAcceptInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof familiesApi.acceptInvite>[0]) => {
      if (useMockData) return mockFamily();
      return familiesApi.acceptInvite(input);
    },
    onSuccess: async (family) => {
      queryClient.setQueryData(queryKeys.family, family);
      await queryClient.invalidateQueries({ queryKey: queryKeys.stage });
    },
  });
}

export function useModerationActionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      action: Parameters<typeof moderationApi.applyModerationAction>[1];
    }) => {
      if (useMockData) {
        return {
          id: input.id,
          type: "Report",
          summary: "Resolved locally",
          postPreview: "",
          reporter: "You",
          priority: "normal" as const,
          status: input.action.action,
          groupId: null,
          groupKind: null,
          createdAt: new Date().toISOString(),
        };
      }
      return moderationApi.applyModerationAction(input.id, input.action);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.moderation });
    },
  });
}

export function useCreateDataRequestMutation() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof dataRequestsApi.createDataRequest>[0]) => {
      if (useMockData) {
        return {
          id: `req-${Date.now()}`,
          type: input.type,
          status: "queued" as const,
          createdAt: new Date().toISOString(),
        };
      }
      return dataRequestsApi.createDataRequest(input);
    },
  });
}

export function useConvertPregnancyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      pregnancyId: string;
      body: Parameters<typeof profilesApi.convertPregnancy>[1];
    }) => {
      if (useMockData) {
        // The convert contract is a union: one baby, or several sharing a birth
        // date (twins). Mock mode has to handle both branches now that the
        // contract can express them.
        const babies =
          "babies" in input.body
            ? input.body.babies.map((baby) => baby.displayName)
            : [input.body.childName];

        const children: Child[] = babies.map((displayName, index) => ({
          id: `child-${Date.now()}-${index}`,
          displayName,
          dateOfBirth: input.body.birthDate,
          birthOrder: index,
          isActive: index === 0,
          archivedAt: null,
        }));

        return { ...children[0], children };
      }
      return profilesApi.convertPregnancy(input.pregnancyId, input.body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.family });
      await queryClient.invalidateQueries({ queryKey: queryKeys.stage });
    },
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Parameters<typeof notificationsApi.updateNotificationPreferences>[0],
    ) => {
      if (useMockData) {
        const current = queryClient.getQueryData<
          Awaited<ReturnType<typeof notificationsApi.getNotificationPreferences>>
        >(queryKeys.notificationPrefs);
        return {
          prefs: {
            dailyPrompt: true,
            wellnessReminder: true,
            partnerActivity: true,
            weeklyRecap: true,
            communityReply: false,
            subscription: true,
            ...current?.prefs,
            ...input.prefs,
          },
          quietHoursEnabled: input.quietHoursEnabled ?? current?.quietHoursEnabled ?? true,
          quietStart: input.quietStart ?? current?.quietStart ?? "21:00",
          quietEnd: input.quietEnd ?? current?.quietEnd ?? "08:00",
          groupRelatedAlerts: input.groupRelatedAlerts ?? current?.groupRelatedAlerts ?? true,
        };
      }
      return notificationsApi.updateNotificationPreferences(input);
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.notificationPrefs, data);
    },
  });
}

export function useSendAiChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof aiApi.sendAiChat>[0]) => {
      if (useMockData) {
        const usage = queryClient.getQueryData<{
          dailyUsed: number;
          dailyLimit: number;
          hourlyUsed: number;
          hourlyLimit: number;
        }>(queryKeys.aiUsage) ?? {
          dailyUsed: 2,
          dailyLimit: 10,
          hourlyUsed: 4,
          hourlyLimit: 20,
        };
        const nextUsage = {
          ...usage,
          dailyUsed: usage.dailyUsed + 1,
          hourlyUsed: usage.hourlyUsed + 1,
        };
        queryClient.setQueryData(queryKeys.aiUsage, nextUsage);
        return {
          conversationId: "mock-conversation",
          message: {
            id: `a-${Date.now()}`,
            role: "assistant" as const,
            body: "Here's a calm, stage-aware thought based on reviewed BumpAtlas content.",
            citations: [],
            escalate: null,
            createdAt: new Date().toISOString(),
          },
          usage: nextUsage,
        };
      }
      return aiApi.sendAiChat(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiUsage });
    },
  });
}

export function useSetPremiumEntitlement() {
  const queryClient = useQueryClient();
  return (isPremium: boolean) => {
    const current = queryClient.getQueryData<{
      isPremium: boolean;
      planId: string | null;
      renewsAt: string | null;
      mediaUploadsLimit: number;
      aiDailyLimit: number;
      source: "free" | "store" | "promo";
    }>(queryKeys.entitlements);
    queryClient.setQueryData(queryKeys.entitlements, {
      isPremium,
      planId: isPremium ? current?.planId ?? "premium" : null,
      renewsAt: isPremium ? current?.renewsAt ?? null : null,
      mediaUploadsLimit: isPremium ? 1000 : 30,
      aiDailyLimit: isPremium ? 30 : 10,
      source: isPremium ? ("store" as const) : ("free" as const),
    });
    const today = queryClient.getQueryData<ReturnType<typeof mockToday>>(queryKeys.today);
    if (today) {
      queryClient.setQueryData(queryKeys.today, { ...today, isPremium });
    }
  };
}
