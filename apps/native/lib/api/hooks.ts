import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  DeleteAccountInput,
  EntitlementsResponse,
  FamilySummary,
  ListMilestonesResponse,
  MeResponse,
  Recap,
  StageResponse,
  TodayResponse,
  UpdateAccountInput,
  UpsertMilestoneObservationInput,
} from "@bumpatlas/contracts";

import * as accountApi from "@/lib/api/account";
import * as aiApi from "@/lib/api/ai";
import * as billingApi from "@/lib/api/billing";
import * as communityApi from "@/lib/api/community";
import * as contentApi from "@/lib/api/content";
import * as dataRequestsApi from "@/lib/api/data-requests";
import * as familiesApi from "@/lib/api/families";
import * as memoriesApi from "@/lib/api/memories";
import * as milestonesApi from "@/lib/api/milestones";
import * as moderationApi from "@/lib/api/moderation";
import * as notificationsApi from "@/lib/api/notifications";
import * as profilesApi from "@/lib/api/profiles";
import * as recapsApi from "@/lib/api/recaps";
import * as todayApi from "@/lib/api/today";

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
  milestones: (childId?: string) => ["milestones", childId ?? "current"] as const,
};

export function useTodayQuery() {
  return useQuery({
    queryKey: queryKeys.today,
    queryFn: () => todayApi.getToday(),
  });
}

export function useMemoriesQuery() {
  return useQuery({
    queryKey: queryKeys.memories,
    queryFn: () => memoriesApi.listMemories(),
  });
}

export function useMemoryQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.memory(id),
    enabled: Boolean(id),
    queryFn: () => memoriesApi.getMemory(id),
  });
}

export function useFamilyQuery() {
  return useQuery({
    queryKey: queryKeys.family,
    queryFn: () => familiesApi.getCurrentFamily(),
  });
}

export function useStageQuery() {
  return useQuery({
    queryKey: queryKeys.stage,
    queryFn: (): Promise<StageResponse> => familiesApi.getStage(),
  });
}

export function useEntitlementsQuery() {
  return useQuery({
    queryKey: queryKeys.entitlements,
    queryFn: (): Promise<EntitlementsResponse> => billingApi.getEntitlements(),
  });
}

export function useGroupsQuery() {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: () => communityApi.listGroups(),
  });
}

export function useGroupPostsQuery(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groupPosts(groupId),
    enabled: Boolean(groupId),
    queryFn: () => communityApi.listGroupPosts(groupId),
  });
}

export function useGroupPostDetailQuery(groupId: string, postId: string) {
  return useQuery({
    queryKey: [...queryKeys.groupPosts(groupId), postId] as const,
    enabled: Boolean(groupId && postId),
    queryFn: async () => {
      const detail = await communityApi.getPostDetail(postId);
      return { ...detail.post, comments: detail.comments.items };
    },
  });
}

export function useContentQuery() {
  return useQuery({
    queryKey: queryKeys.content,
    queryFn: () => contentApi.listContent(),
  });
}

export function useContentDetailQuery(slugOrId: string) {
  return useQuery({
    queryKey: queryKeys.contentDetail(slugOrId),
    enabled: Boolean(slugOrId),
    queryFn: () => contentApi.getContent(slugOrId),
  });
}

export function useCurrentRecapQuery() {
  return useQuery({
    queryKey: queryKeys.recap,
    queryFn: (): Promise<Recap> => recapsApi.getCurrentRecap(),
  });
}

export function useAiUsageQuery() {
  return useQuery({
    queryKey: queryKeys.aiUsage,
    queryFn: () => aiApi.getAiUsage(),
  });
}

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: queryKeys.notificationPrefs,
    queryFn: () => notificationsApi.getNotificationPreferences(),
  });
}

export function useBadgesQuery() {
  return useQuery({
    queryKey: queryKeys.badges,
    queryFn: () => todayApi.listBadges(),
  });
}

export function useModerationQueueQuery() {
  return useQuery({
    queryKey: queryKeys.moderation,
    queryFn: () => moderationApi.listModerationQueue(),
  });
}

export function useMilestonesQuery(childId?: string) {
  return useQuery({
    queryKey: queryKeys.milestones(childId),
    queryFn: () => milestonesApi.listMilestones(childId),
  });
}

export function useUpsertMilestoneObservationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { definitionId: string; body: UpsertMilestoneObservationInput }) => {
      return milestonesApi.upsertMilestoneObservation(input.definitionId, input.body);
    },
    onSuccess: async (observation) => {
      queryClient.setQueriesData<ListMilestonesResponse>(
        { queryKey: ["milestones"] },
        (current) => {
          if (!current) return current;
          const others = current.observations.filter(
            (item) => item.definitionId !== observation.definitionId,
          );
          return { ...current, observations: [...others, observation] };
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["milestones"] });
    },
  });
}

export function useCreateMemoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      body: Parameters<typeof memoriesApi.createMemory>[0];
      idempotencyKey?: string;
    }) => {
      return memoriesApi.createMemory(input.body, input.idempotencyKey);
    },
    onSuccess: async (memory) => {
      queryClient.setQueryData(queryKeys.memory(memory.id), memory);
      await queryClient.invalidateQueries({ queryKey: queryKeys.memories });
      await queryClient.invalidateQueries({ queryKey: queryKeys.today });
      // A memory can be the "first capture" that earns a badge — refresh the
      // badges list so the celebration diff in the app-state provider sees it.
      await queryClient.invalidateQueries({ queryKey: queryKeys.badges });
    },
  });
}

export function useUpdateMemoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Parameters<typeof memoriesApi.updateMemory>[1] }) => {
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
      await memoriesApi.deleteMemory(id);
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
      return communityApi.createGroupPost(groupId, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupPosts(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.today });
      await queryClient.invalidateQueries({ queryKey: queryKeys.badges });
    },
  });
}

export function useCreateCommentMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; body: string }) => {
      return communityApi.createComment(input.postId, { body: input.body });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupPosts(groupId) });
    },
  });
}

/**
 * `reacted` is the post's *current* `reactedByMe` state, read off the query
 * data by the caller — the client decides PUT (add) vs DELETE (remove) from
 * that, since the reaction pair has no toggle semantics of its own.
 */
export function useReactToPostMutation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; reacted: boolean }) => {
      if (input.reacted) {
        await communityApi.removeReaction(input.postId);
      } else {
        await communityApi.setReaction(input.postId);
      }
      return input.postId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groupPosts(groupId) });
    },
  });
}

export function useCreateReportMutation() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof communityApi.createReport>[0]) => {
      await communityApi.createReport(input);
      return input;
    },
  });
}

export function useBlockUserMutation() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof communityApi.blockUser>[0]) => {
      await communityApi.blockUser(input);
      return input.userId;
    },
  });
}

export function useBookmarkContentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await contentApi.bookmarkContent(id);
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
      return familiesApi.createInvite(input);
    },
  });
}

export function useInvitePreviewQuery(token: string) {
  return useQuery({
    queryKey: ["invites", token, "preview"] as const,
    enabled: Boolean(token),
    queryFn: () => familiesApi.getInvitePreview(token),
  });
}

export function useAcceptInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof familiesApi.acceptInvite>[0]) => {
      return familiesApi.acceptInvite(input);
    },
    onSuccess: async (family) => {
      queryClient.setQueryData(queryKeys.family, family);
      await queryClient.invalidateQueries({ queryKey: queryKeys.stage });
    },
  });
}

export function useUpdateMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      memberId: string;
      patch: Parameters<typeof familiesApi.updateMember>[1];
    }) => {
      return familiesApi.updateMember(input.memberId, input.patch);
    },
    onSuccess: (family) => {
      queryClient.setQueryData(queryKeys.family, family);
    },
  });
}

export function useRemoveMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string): Promise<FamilySummary> => {
      await familiesApi.removeMember(memberId);
      // The route returns 204, so the client re-derives the new roster itself
      // rather than refetching.
      const current = queryClient.getQueryData<FamilySummary>(queryKeys.family);
      if (!current) return familiesApi.getCurrentFamily();
      return { ...current, members: current.members.filter((member) => member.id !== memberId) };
    },
    onSuccess: (family) => {
      queryClient.setQueryData(queryKeys.family, family);
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
      return dataRequestsApi.createDataRequest(input);
    },
  });
}

export function useUpdateAccountMutation() {
  return useMutation({
    mutationFn: (input: UpdateAccountInput): Promise<MeResponse> => accountApi.updateAccount(input),
  });
}

/** Danger domain: account deletion. Clears the cache after the server confirms the teardown. */
export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteAccountInput) => {
      await accountApi.deleteAccount(input);
    },
    onSuccess: () => {
      queryClient.clear();
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
      return aiApi.sendAiChat(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.aiUsage });
    },
  });
}

/** Sets the entitlements cache directly after a store purchase/restore response. */
export function useSetPremiumEntitlement() {
  const queryClient = useQueryClient();
  return (isPremium: boolean) => {
    const current = queryClient.getQueryData<EntitlementsResponse>(queryKeys.entitlements);
    queryClient.setQueryData<EntitlementsResponse>(queryKeys.entitlements, {
      isPremium,
      planId: isPremium ? current?.planId ?? "premium" : null,
      renewsAt: isPremium ? current?.renewsAt ?? null : null,
      mediaUploadsLimit: isPremium ? 1000 : 30,
      maxChildren: current?.maxChildren ?? 2,
      aiDailyLimit: isPremium ? 30 : 10,
      source: isPremium ? "revenuecat" : "free",
    });
    const today = queryClient.getQueryData<TodayResponse>(queryKeys.today);
    if (today) {
      queryClient.setQueryData(queryKeys.today, { ...today, isPremium });
    }
  };
}
