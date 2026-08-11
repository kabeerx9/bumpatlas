import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";

import { useOnboarding } from "@/features/onboarding/providers/onboarding-provider";
import type { NotificationPrefKey } from "@/features/family/data/notification-categories";
import { queryKeys, useBadgesQuery, useGroupsQuery } from "@/lib/api/hooks";
import * as consentsApi from "@/lib/api/consents";
import {
  clearMemoryDrafts,
  loadMemoryDrafts,
  removeMemoryDraft,
  upsertMemoryDraft,
  type PersistedMemoryDraft,
} from "@/lib/drafts/memory-draft-store";
import {
  clearDraftQueueDurably,
  commitDraftMutationDurably,
} from "@/lib/drafts/clear-drafts";
import { isDraftQueueReadyForOwner } from "@/lib/drafts/draft-owner";
import { flushMemoryDrafts } from "@/lib/drafts/flush-drafts";
import * as familiesApi from "@/lib/api/families";
import { useConnectivity } from "@/lib/network/use-connectivity";
import * as notificationsApi from "@/lib/api/notifications";
import * as profilesApi from "@/lib/api/profiles";
import { REQUIRED_ONBOARDING_CONSENTS } from "@/lib/legal-policy";

type ConnectTodayMode = "group" | "alone";

export type PrimaryGoal = "memories" | "wellness" | "connect" | "learn";

export type MemoryDraft = {
  id: string;
  familyId: string;
  body: string;
  eventDate: string;
  createdAtLabel: string;
  hasPhoto: boolean;
  photoUri?: string | null;
  visibility: "HOUSEHOLD" | "PRIVATE";
};

export type OnboardingProfileInput = {
  role: "expecting" | "parent" | null;
  dueDate?: string;
  childName?: string;
  childDob?: string;
  householdName?: string;
  primaryGoal?: PrimaryGoal | null;
  notificationPrefs?: Partial<Record<NotificationPrefKey, boolean>>;
  /**
   * True when the caller already has a default family (e.g. stage setup,
   * reachable only after onboarding). Skips `createFamily` and the
   * onboarding consent writes so a post-onboarding stage pick doesn't spawn
   * a second household and orphan the first one's data.
   */
  existingFamily?: boolean;
};

type CaptureInput = {
  body: string;
  eventDate: string;
  hasPhoto?: boolean;
  visibility?: "HOUSEHOLD" | "PRIVATE";
};

type AppState = {
  // Connectivity (features/network) — a thin, named re-export so screens
  // don't each import the raw hook.
  isOffline: boolean;
  deviceOffline: boolean;
  offlineBannerDismissed: boolean;
  dismissOfflineBanner: () => void;

  // Offline draft queue.
  draftsHydrated: boolean;
  draftHydrationFailed: boolean;
  drafts: MemoryDraft[];
  pendingDraft: boolean;
  syncingDrafts: boolean;
  saveDraft: (input: {
    familyId: string;
    body: string;
    eventDate: string;
    hasPhoto: boolean;
    photoUri?: string | null;
    visibility?: "HOUSEHOLD" | "PRIVATE";
  }) => Promise<boolean>;
  removeDraft: (id: string) => Promise<boolean>;
  clearDrafts: () => Promise<boolean>;
  retryDraftHydration: () => Promise<boolean>;
  flushDraftQueue: () => Promise<number>;

  // Community client-side state — throttling counters and moderation
  // affordances that have no server mirror yet.
  blockedAuthorIds: string[];
  blockAuthor: (authorId: string) => void;
  unblockAuthor: (authorId: string) => void;
  communityRulesAccepted: boolean;
  acceptCommunityRules: () => void;
  connectRulesSeen: boolean;
  markConnectRulesSeen: () => void;
  activeGroupId: string;
  setActiveGroupId: (id: string) => void;
  postsUsedToday: number;
  incrementPostCount: () => void;
  commentsUsedToday: number;
  incrementCommentCount: () => void;
  commentsDailyLimit: number;
  /** Not yet server-backed — no membership-age field is threaded to the client. */
  accountAgeDays: number;
  linksAllowed: boolean;
  connectTodayMode: ConnectTodayMode;
  setConnectTodayMode: (value: ConnectTodayMode) => void;
  markPartnerJoined: () => void;

  // UI prefs.
  journalQuery: string;
  setJournalQuery: (value: string) => void;
  inviteCtaDismissed: boolean;
  dismissInviteCta: () => void;
  weekSummaryConsent: boolean;
  setWeekSummaryConsent: (value: boolean) => void;
  /** Onboarding-selected emphasis for the Today tiles; no persistence yet. */
  primaryGoal: PrimaryGoal | null;

  // Badge celebration toast — diffed off the real badges query, not a fixture.
  newlyEarnedBadgeId: string | null;
  clearNewlyEarnedBadge: () => void;

  /**
   * "Learn" has no completion endpoint yet (unlike capture/care/connect,
   * which the server derives from real mutations) — this is a local-only
   * flag for the day's Learn tile until that ships.
   */
  learnDoneToday: boolean;
  markLearnDone: () => void;

  /** Real onboarding orchestration: household/pregnancy/child/consents/notification prefs. */
  applyOnboardingProfile: (input: OnboardingProfileInput) => Promise<void>;
};

const AppStateContext = createContext<AppState | null>(null);

function toPersistedDraft(draft: MemoryDraft): PersistedMemoryDraft {
  return {
    id: draft.id,
    familyId: draft.familyId,
    body: draft.body,
    eventDate: draft.eventDate,
    createdAtLabel: draft.createdAtLabel,
    createdAtIso: new Date().toISOString(),
    hasPhoto: draft.hasPhoto,
    photoUri: draft.photoUri ?? null,
    visibility: draft.visibility ?? "HOUSEHOLD",
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn, userId } = useAuth();
  const currentDraftOwner = isSignedIn === true && userId ? userId : null;
  const { isOnboardingComplete, isOnboardingLoading } = useOnboarding();
  const queryClient = useQueryClient();
  const connectivity = useConnectivity();
  const canReadHousehold =
    isSignedIn === true && isOnboardingComplete && !isOnboardingLoading;
  const badgesQuery = useBadgesQuery(canReadHousehold);
  const groupsQuery = useGroupsQuery(canReadHousehold);
  const deviceOffline = connectivity.isOffline;
  const isOffline = deviceOffline;

  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
  const [draftsHydrated, setDraftsHydrated] = useState(false);
  const [draftHydrationFailed, setDraftHydrationFailed] = useState(false);
  const [hydratedDraftOwner, setHydratedDraftOwner] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<MemoryDraft[]>([]);
  const [pendingDraft, setPendingDraft] = useState(false);
  const [syncingDrafts, setSyncingDrafts] = useState(false);

  const [blockedAuthorIds, setBlockedAuthorIds] = useState<string[]>([]);
  const [communityRulesAccepted, setCommunityRulesAccepted] = useState(false);
  const [connectRulesSeen, setConnectRulesSeen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState("");
  const [postsUsedToday, setPostsUsedToday] = useState(0);
  const [commentsUsedToday, setCommentsUsedToday] = useState(0);
  const [connectTodayMode, setConnectTodayMode] = useState<ConnectTodayMode>("group");
  const [accountAgeDays] = useState(14);

  const [journalQuery, setJournalQuery] = useState("");
  const [inviteCtaDismissed, setInviteCtaDismissed] = useState(false);
  const [weekSummaryConsent, setWeekSummaryConsent] = useState(false);
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null);

  const [newlyEarnedBadgeId, setNewlyEarnedBadgeId] = useState<string | null>(null);
  const [learnDoneToday, setLearnDoneToday] = useState(false);

  const wasOfflineRef = useRef(isOffline);
  const seenEarnedBadgeIdsRef = useRef<Set<string> | null>(null);
  const clearingDraftsRef = useRef(false);
  const draftOwnerRef = useRef(currentDraftOwner);
  const draftSyncOwnerRef = useRef<string | null>(null);
  draftOwnerRef.current = currentDraftOwner;

  const draftQueueReady = isDraftQueueReadyForOwner(
    currentDraftOwner,
    hydratedDraftOwner,
    draftsHydrated,
  );
  const currentDrafts = draftQueueReady ? drafts : [];
  const currentDraftHydrationFailed = Boolean(
    currentDraftOwner &&
      hydratedDraftOwner === currentDraftOwner &&
      draftHydrationFailed,
  );
  const currentDraftSyncing = Boolean(
    currentDraftOwner &&
      draftSyncOwnerRef.current === currentDraftOwner &&
      syncingDrafts,
  );

  // Default to the first joined stage group once real groups load, rather
  // than a hardcoded fixture id.
  useEffect(() => {
    const items = groupsQuery.data?.items;
    if (!items || items.length === 0) return;
    if (items.some((group) => group.id === activeGroupId)) return;
    const joined = items.find((group) => group.joined) ?? items[0];
    if (joined) setActiveGroupId(joined.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsQuery.data?.items]);

  // Badge celebration: diff the real badges query against the last-seen
  // earned set so a newly-earned badge (from any mutation that invalidates
  // ["badges"]) triggers the global toast, without fabricating a badge id.
  useEffect(() => {
    const items = badgesQuery.data?.items;
    if (!items) return;
    const currentlyEarned = new Set(items.filter((badge) => badge.earnedAt).map((badge) => badge.id));
    const previouslySeen = seenEarnedBadgeIdsRef.current;
    if (previouslySeen) {
      for (const id of currentlyEarned) {
        if (!previouslySeen.has(id)) {
          setNewlyEarnedBadgeId(id);
          break;
        }
      }
    }
    seenEarnedBadgeIdsRef.current = currentlyEarned;
  }, [badgesQuery.data]);

  const retryDraftHydration = useCallback(async () => {
    const ownerUserId = currentDraftOwner;
    setDraftsHydrated(false);
    setDraftHydrationFailed(false);
    setHydratedDraftOwner(ownerUserId);
    setDrafts([]);
    setPendingDraft(false);
    draftSyncOwnerRef.current = null;
    setSyncingDrafts(false);

    if (!ownerUserId) {
      return true;
    }

    try {
      const stored = await loadMemoryDrafts(ownerUserId);
      if (draftOwnerRef.current !== ownerUserId) return false;
      const mapped: MemoryDraft[] = stored.map((draft) => ({
        id: draft.id,
        familyId: draft.familyId,
        body: draft.body,
        eventDate: draft.eventDate,
        createdAtLabel: draft.createdAtLabel,
        hasPhoto: draft.hasPhoto,
        photoUri: draft.photoUri,
        visibility: draft.visibility,
      }));
      setDrafts(mapped);
      setPendingDraft(mapped.length > 0);
      setDraftsHydrated(true);
      return true;
    } catch {
      if (draftOwnerRef.current !== ownerUserId) return false;
      // Unknown device state is not equivalent to an empty queue. Keep all
      // tenant-switching paths blocked until retry or a strict clear succeeds.
      setDraftHydrationFailed(true);
      return false;
    }
  }, [currentDraftOwner]);

  useEffect(() => {
    void retryDraftHydration();
  }, [retryDraftHydration]);

  const flushDraftQueue = useCallback(async () => {
    const ownerUserId = currentDraftOwner;
    if (
      !ownerUserId ||
      !draftQueueReady ||
      !canReadHousehold ||
      syncingDrafts ||
      drafts.length === 0 ||
      isOffline
    ) {
      return 0;
    }
    const ownerToken = await getToken();
    if (!ownerToken || draftOwnerRef.current !== ownerUserId) return 0;

    draftSyncOwnerRef.current = ownerUserId;
    setSyncingDrafts(true);
    try {
      const flushed = await flushMemoryDrafts(ownerUserId, drafts, ownerToken);
      if (draftOwnerRef.current !== ownerUserId) return 0;
      const flushedIds = new Set(flushed.map((item) => item.draftId));
      // Body-less/photo-only drafts stay visible until the user explicitly
      // removes them; silently hiding them would bypass the tenant barrier.
      setDrafts((current) => {
        const next = current.filter((draft) => !flushedIds.has(draft.id));
        setPendingDraft(next.length > 0);
        return next;
      });

      if (flushed.length > 0) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.memories });
        await queryClient.invalidateQueries({ queryKey: queryKeys.today });
      }

      return flushed.length;
    } catch {
      // A failed durable removal leaves React state untouched, so household
      // switching remains blocked and an idempotent retry can finish later.
      return 0;
    } finally {
      if (draftSyncOwnerRef.current === ownerUserId) {
        draftSyncOwnerRef.current = null;
        setSyncingDrafts(false);
      }
    }
  }, [
    canReadHousehold,
    currentDraftOwner,
    draftQueueReady,
    drafts,
    getToken,
    isOffline,
    queryClient,
    syncingDrafts,
  ]);

  const flushDraftQueueRef = useRef(flushDraftQueue);
  flushDraftQueueRef.current = flushDraftQueue;

  useEffect(() => {
    const cameOnline = wasOfflineRef.current && !isOffline;
    wasOfflineRef.current = isOffline;
    if (!draftQueueReady || !canReadHousehold || isOffline) return;
    if (cameOnline || draftQueueReady) {
      void flushDraftQueueRef.current();
    }
  }, [canReadHousehold, draftQueueReady, isOffline]);

  const saveDraft = useCallback(
    async (input: {
      familyId: string;
      body: string;
      eventDate: string;
      hasPhoto: boolean;
      photoUri?: string | null;
      visibility?: "HOUSEHOLD" | "PRIVATE";
    }) => {
      if (!currentDraftOwner || !draftQueueReady || !input.familyId.trim()) return false;
      const ownerUserId = currentDraftOwner;
      const draft: MemoryDraft = {
        id: `draft-${Date.now()}`,
        familyId: input.familyId,
        body: input.body,
        eventDate: input.eventDate,
        hasPhoto: input.hasPhoto,
        photoUri: input.photoUri ?? null,
        visibility: input.visibility ?? "HOUSEHOLD",
        createdAtLabel: "Just now",
      };
      return commitDraftMutationDurably({
        persist: async () => {
          await upsertMemoryDraft(ownerUserId, toPersistedDraft(draft));
        },
        commit: () => {
          if (draftOwnerRef.current !== ownerUserId) return false;
          setDrafts((current) => [draft, ...current]);
          setPendingDraft(true);
          return true;
        },
      });
    },
    [currentDraftOwner, draftQueueReady],
  );

  const removeDraft = useCallback(async (id: string) => {
    const ownerUserId = currentDraftOwner;
    if (!ownerUserId || !draftQueueReady) return false;
    return commitDraftMutationDurably({
      persist: async () => {
        await removeMemoryDraft(ownerUserId, id);
      },
      commit: () => {
        if (draftOwnerRef.current !== ownerUserId) return;
        setDrafts((current) => {
          const next = current.filter((draft) => draft.id !== id);
          setPendingDraft(next.length > 0);
          return next;
        });
      },
    });
  }, [currentDraftOwner, draftQueueReady]);

  const clearDrafts = useCallback(async () => {
    const ownerUserId = currentDraftOwner;
    if (!ownerUserId) return false;
    clearingDraftsRef.current = true;
    try {
      return await clearDraftQueueDurably({
        clearPersisted: () => clearMemoryDrafts(ownerUserId),
        commitCleared: () => {
          if (draftOwnerRef.current !== ownerUserId) return;
          setDrafts([]);
          setPendingDraft(false);
          setDraftHydrationFailed(false);
          setHydratedDraftOwner(ownerUserId);
          setDraftsHydrated(true);
        },
      });
    } finally {
      clearingDraftsRef.current = false;
    }
  }, [currentDraftOwner]);

  const markPartnerJoined = useCallback(() => {
    setConnectTodayMode("group");
  }, []);

  const incrementPostCount = useCallback(() => {
    setPostsUsedToday((count) => count + 1);
    setConnectTodayMode("group");
  }, []);

  const incrementCommentCount = useCallback(() => {
    setCommentsUsedToday((count) => count + 1);
    setConnectTodayMode("group");
  }, []);

  const markLearnDone = useCallback(() => {
    setLearnDoneToday(true);
  }, []);

  const applyOnboardingProfile = useCallback(
    async (input: OnboardingProfileInput) => {
      if (input.primaryGoal) setPrimaryGoal(input.primaryGoal);

      // Deliberately not swallowed: a failure here means the household (or
      // pregnancy/child/consent record) was never written server-side.
      // Letting the caller catch this keeps `completeOnboarding()` from
      // running and the local "onboarding complete" flag from being set on
      // a household that doesn't actually exist yet.
      if (!input.existingFamily) {
        const familyName =
          input.householdName?.trim() ||
          (input.childName?.trim() ? `${input.childName.trim()}'s household` : "Our household");
        await familiesApi.createFamily({ name: familyName });
      }

      if (input.role === "expecting" && input.dueDate?.trim()) {
        await profilesApi.createPregnancy({ dueDate: input.dueDate.trim() });
      }
      if (input.role === "parent" && input.childName?.trim() && input.childDob?.trim()) {
        await profilesApi.createChild({
          displayName: input.childName.trim(),
          dateOfBirth: input.childDob.trim(),
        });
      }

      if (!input.existingFamily) {
        for (const consent of REQUIRED_ONBOARDING_CONSENTS) {
          await consentsApi.createConsent(consent);
        }
      }

      if (input.notificationPrefs) {
        await notificationsApi.updateNotificationPreferences({
          prefs: {
            dailyPrompt: true,
            wellnessReminder: true,
            partnerActivity: true,
            weeklyRecap: true,
            communityReply: false,
            subscription: true,
            ...input.notificationPrefs,
          },
        });
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.family });
      await queryClient.invalidateQueries({ queryKey: queryKeys.stage });
      await queryClient.invalidateQueries({ queryKey: queryKeys.notificationPrefs });
    },
    [queryClient],
  );

  const linksAllowed = accountAgeDays >= 14;

  const value = useMemo<AppState>(
    () => ({
      isOffline,
      deviceOffline,
      offlineBannerDismissed,
      dismissOfflineBanner: () => setOfflineBannerDismissed(true),
      draftsHydrated: draftQueueReady,
      draftHydrationFailed: currentDraftHydrationFailed,
      drafts: currentDrafts,
      pendingDraft: draftQueueReady ? pendingDraft : false,
      syncingDrafts: currentDraftSyncing,
      saveDraft,
      removeDraft,
      clearDrafts,
      retryDraftHydration,
      flushDraftQueue,
      blockedAuthorIds,
      blockAuthor: (authorId) =>
        setBlockedAuthorIds((current) =>
          current.includes(authorId) ? current : [...current, authorId],
        ),
      unblockAuthor: (authorId) =>
        setBlockedAuthorIds((current) => current.filter((id) => id !== authorId)),
      communityRulesAccepted,
      acceptCommunityRules: () => setCommunityRulesAccepted(true),
      connectRulesSeen,
      markConnectRulesSeen: () => setConnectRulesSeen(true),
      activeGroupId,
      setActiveGroupId,
      postsUsedToday,
      incrementPostCount,
      commentsUsedToday,
      incrementCommentCount,
      commentsDailyLimit: 50,
      accountAgeDays,
      linksAllowed,
      connectTodayMode,
      setConnectTodayMode,
      markPartnerJoined,
      journalQuery,
      setJournalQuery,
      inviteCtaDismissed,
      dismissInviteCta: () => setInviteCtaDismissed(true),
      weekSummaryConsent,
      setWeekSummaryConsent,
      primaryGoal,
      newlyEarnedBadgeId,
      clearNewlyEarnedBadge: () => setNewlyEarnedBadgeId(null),
      learnDoneToday,
      markLearnDone,
      applyOnboardingProfile,
    }),
    [
      accountAgeDays,
      activeGroupId,
      applyOnboardingProfile,
      blockedAuthorIds,
      clearDrafts,
      commentsUsedToday,
      communityRulesAccepted,
      connectRulesSeen,
      connectTodayMode,
      currentDraftHydrationFailed,
      currentDraftSyncing,
      currentDrafts,
      deviceOffline,
      draftQueueReady,
      flushDraftQueue,
      incrementCommentCount,
      incrementPostCount,
      inviteCtaDismissed,
      isOffline,
      journalQuery,
      learnDoneToday,
      linksAllowed,
      markLearnDone,
      markPartnerJoined,
      newlyEarnedBadgeId,
      offlineBannerDismissed,
      pendingDraft,
      postsUsedToday,
      primaryGoal,
      removeDraft,
      retryDraftHydration,
      saveDraft,
      weekSummaryConsent,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
