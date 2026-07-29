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

import { mockGroupPosts, mockMemories } from "@/features/mock/demo-data";
import { mockNotificationCategories, mockPregnancy, mockStageGroups } from "@/features/mock/mock-content";
import {
  clearMemoryDrafts,
  loadMemoryDrafts,
  saveMemoryDrafts,
  type PersistedMemoryDraft,
} from "@/lib/drafts/memory-draft-store";
import { flushMemoryDrafts } from "@/lib/drafts/flush-drafts";
import { useConnectivity } from "@/lib/network/use-connectivity";
import { useMockData } from "@/lib/api/client";
import {
  useAiUsageQuery,
  useEntitlementsQuery,
  useFamilyQuery,
  useNotificationPreferencesQuery,
  useTodayQuery,
} from "@/lib/api/hooks";
import * as familiesApi from "@/lib/api/families";
import * as profilesApi from "@/lib/api/profiles";
import * as consentsApi from "@/lib/api/consents";
import * as memoriesApi from "@/lib/api/memories";
import * as notificationsApi from "@/lib/api/notifications";

type StageMode = "postpartum" | "pregnancy" | "unknown";

type LoopKey = "capture" | "care" | "learn" | "connect";

type MilestoneStatus = "NOT_OBSERVED" | "EMERGING" | "OBSERVED" | "SKIPPED";

export type PrimaryGoal = "memories" | "wellness" | "connect" | "learn";

export type NotificationPrefKey =
  | "dailyPrompt"
  | "wellnessReminder"
  | "partnerActivity"
  | "weeklyRecap"
  | "communityReply"
  | "subscription";

export type JourneyMemory = {
  id: string;
  dateLabel: string;
  title: string;
  body: string;
  author: string;
  visibility: "HOUSEHOLD" | "PRIVATE";
};

export type GroupFeedPost = {
  id: string;
  groupId: string;
  authorId: string;
  author: string;
  body: string;
  reactions: number;
  comments: Array<{
    id: string;
    authorId: string;
    author: string;
    body: string;
    createdAt: string;
  }>;
};

type WeekProgress = {
  storyDays: number;
  wellnessDays: number;
  goal: number;
  activeDays: number;
};

type LoopCompletion = Record<LoopKey, boolean>;

export type MemoryDraft = {
  id: string;
  body: string;
  eventDate: string;
  createdAtLabel: string;
  hasPhoto: boolean;
  photoUri?: string | null;
  visibility: "HOUSEHOLD" | "PRIVATE";
};

export type OnboardingProfileInput = {
  role: "expecting" | "parent" | "partner" | null;
  dueDate?: string;
  childName?: string;
  childDob?: string;
  householdName?: string;
  primaryGoal?: PrimaryGoal | null;
  notificationPrefs?: Partial<Record<NotificationPrefKey, boolean>>;
};

type CaptureInput = {
  body: string;
  eventDate: string;
  hasPhoto?: boolean;
  visibility?: "HOUSEHOLD" | "PRIVATE";
};

type MockUiState = {
  isOffline: boolean;
  deviceOffline: boolean;
  dismissOfflineBanner: () => void;
  offlineBannerDismissed: boolean;
  aiMessagesUsed: number;
  incrementAiUsage: () => void;
  setAiUsage: (usage: {
    dailyUsed: number;
    dailyLimit: number;
    hourlyUsed: number;
    hourlyLimit: number;
  }) => void;
  aiDailyLimit: number;
  aiHourlyUsed: number;
  aiHourlyLimit: number;
  likedPosts: Record<string, boolean>;
  togglePostLike: (postId: string) => void;
  blockedAuthorIds: string[];
  blockAuthor: (authorId: string) => void;
  unblockAuthor: (authorId: string) => void;
  communityRulesAccepted: boolean;
  acceptCommunityRules: () => void;
  connectRulesSeen: boolean;
  markConnectRulesSeen: () => void;
  pendingDraft: boolean;
  setPendingDraft: (value: boolean) => void;
  drafts: MemoryDraft[];
  saveDraft: (input: {
    body: string;
    eventDate: string;
    hasPhoto: boolean;
    photoUri?: string | null;
    visibility?: "HOUSEHOLD" | "PRIVATE";
  }) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
  connectScenario: "active" | "warming";
  setConnectScenario: (value: "active" | "warming") => void;
  connectTodayMode: "group" | "alone";
  setConnectTodayMode: (value: "group" | "alone") => void;
  stageMode: StageMode;
  setStageMode: (value: StageMode) => void;
  pregnancyConverted: boolean;
  convertPregnancy: (childName: string, birthDate: string) => void;
  pregnancyChildName: string | null;
  pregnancyBirthDate: string | null;
  checklistDone: Record<string, boolean>;
  toggleChecklistItem: (id: string) => void;
  selectedMood: string | null;
  setSelectedMood: (id: string | null) => void;
  memoryCount: number;
  completeCapture: (input?: CaptureInput) => { awardedBadgeId: string | null };
  inviteCtaDismissed: boolean;
  dismissInviteCta: () => void;
  showEmptyJourney: boolean;
  setShowEmptyJourney: (value: boolean) => void;
  activeGroupId: string;
  setActiveGroupId: (id: string) => void;
  postsUsedToday: number;
  incrementPostCount: () => void;
  commentsUsedToday: number;
  incrementCommentCount: () => void;
  commentsDailyLimit: number;
  bookmarkedGuides: Record<string, boolean>;
  toggleBookmark: (id: string) => void;
  earnedBadgeIds: string[];
  earnBadge: (id: string) => void;
  quietHoursEnabled: boolean;
  setQuietHoursEnabled: (value: boolean) => void;
  quietStart: string;
  quietEnd: string;
  setQuietHours: (start: string, end: string) => void;
  weekSummaryConsent: boolean;
  setWeekSummaryConsent: (value: boolean) => void;
  mediaUploadsUsed: number;
  mediaUploadsLimit: number;
  incrementMediaUpload: () => void;
  weekProgress: WeekProgress;
  loopCompletion: LoopCompletion;
  completeCare: () => { awardedBadgeId: string | null };
  markLearnDone: () => void;
  markConnectDone: () => void;
  storyDaysThisWeek: number;
  wellnessDaysThisWeek: number;
  recapEligible: boolean;
  milestoneStatuses: Record<string, MilestoneStatus>;
  setMilestoneStatus: (id: string, status: MilestoneStatus) => void;
  moderationStatuses: Record<string, string>;
  resolveModerationItem: (id: string, status: string) => void;
  journalQuery: string;
  setJournalQuery: (value: string) => void;
  isPremiumPreview: boolean;
  setPremiumPreview: (value: boolean) => void;
  newlyEarnedBadgeId: string | null;
  clearNewlyEarnedBadge: () => void;
  applyOnboardingProfile: (input: OnboardingProfileInput) => Promise<void>;
  flushDraftQueue: () => Promise<number>;
  syncingDrafts: boolean;
  groupRelatedAlerts: boolean;
  setGroupRelatedAlerts: (value: boolean) => void;
  accountAgeDays: number;
  linksAllowed: boolean;
  markPartnerJoined: () => void;
  householdName: string;
  childDisplayName: string;
  dueDateOverride: string | null;
  primaryGoal: PrimaryGoal | null;
  notificationPrefs: Record<NotificationPrefKey, boolean>;
  setNotificationPref: (key: NotificationPrefKey, value: boolean) => void;
  journeyMemories: JourneyMemory[];
  updateJourneyMemory: (
    id: string,
    patch: Partial<Pick<JourneyMemory, "title" | "body" | "visibility">>,
  ) => void;
  deleteJourneyMemory: (id: string) => void;
  groupFeedPosts: GroupFeedPost[];
  addGroupPost: (input: { body: string; groupId: string }) => string;
  addGroupComment: (input: { postId: string; body: string; groupId: string }) => void;
  getGroupFeed: (groupId: string) => GroupFeedPost[];
};

const MockUiContext = createContext<MockUiState | null>(null);

const initialChecklist = Object.fromEntries(
  mockPregnancy.checklist.map((item) => [item.id, item.done]),
);

const WEEK_GOAL = 4;

const defaultNotificationPrefs = Object.fromEntries(
  mockNotificationCategories.map((category) => [category.id, category.defaultOn]),
) as Record<NotificationPrefKey, boolean>;

function recomputeActiveDays(storyDays: number, wellnessDays: number) {
  // Soft dual challenge: either story or wellness can count toward an active day.
  // For mock UI we treat union-ish progress as max of the two tracks, capped by goal.
  return Math.min(WEEK_GOAL, Math.max(storyDays, wellnessDays, Math.min(storyDays + wellnessDays, WEEK_GOAL)));
}

function seedPostsForGroup(groupId: string): GroupFeedPost[] {
  const group = mockStageGroups.find((item) => item.id === groupId);
  if (!group) return mockGroupPosts.map((post) => ({ ...post, groupId }));
  if ("posts" in group && Array.isArray(group.posts)) {
    return group.posts.map((post) => ({ ...post, groupId }));
  }
  return mockGroupPosts.map((post) => ({ ...post, groupId }));
}

function buildInitialGroupFeed(): GroupFeedPost[] {
  return mockStageGroups.flatMap((group) => seedPostsForGroup(group.id));
}

function toPersistedDraft(draft: MemoryDraft): PersistedMemoryDraft {
  return {
    id: draft.id,
    body: draft.body,
    eventDate: draft.eventDate,
    createdAtLabel: draft.createdAtLabel,
    createdAtIso: new Date().toISOString(),
    hasPhoto: draft.hasPhoto,
    photoUri: draft.photoUri ?? null,
    visibility: draft.visibility ?? "HOUSEHOLD",
  };
}

export function MockUiProvider({ children }: { children: ReactNode }) {
  const connectivity = useConnectivity();
  const todayQuery = useTodayQuery();
  const entitlementsQuery = useEntitlementsQuery();
  const familyQuery = useFamilyQuery();
  const aiUsageQuery = useAiUsageQuery();
  const notificationPrefsQuery = useNotificationPreferencesQuery();
  const deviceOffline = connectivity.isOffline;
  const isOffline = deviceOffline;
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
  const [draftsHydrated, setDraftsHydrated] = useState(false);
  const [aiMessagesUsed, setAiMessagesUsed] = useState(2);
  const [aiHourlyUsed, setAiHourlyUsed] = useState(4);
  const [aiDailyLimit, setAiDailyLimit] = useState(10);
  const [aiHourlyLimit, setAiHourlyLimit] = useState(20);
  const [mediaUploadsLimit, setMediaUploadsLimit] = useState(30);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [blockedAuthorIds, setBlockedAuthorIds] = useState<string[]>([]);
  const [communityRulesAccepted, setCommunityRulesAccepted] = useState(false);
  const [connectRulesSeen, setConnectRulesSeen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(false);
  const [drafts, setDrafts] = useState<MemoryDraft[]>([]);
  const [connectScenario, setConnectScenario] = useState<"active" | "warming">("active");
  const [connectTodayMode, setConnectTodayMode] = useState<"group" | "alone">("group");
  const [stageMode, setStageMode] = useState<StageMode>("postpartum");
  const [pregnancyConverted, setPregnancyConverted] = useState(false);
  const [pregnancyChildName, setPregnancyChildName] = useState<string | null>(null);
  const [pregnancyBirthDate, setPregnancyBirthDate] = useState<string | null>(null);
  const [checklistDone, setChecklistDone] = useState(initialChecklist);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [memoryCount, setMemoryCount] = useState(3);
  const [inviteCtaDismissed, setInviteCtaDismissed] = useState(false);
  const [showEmptyJourney, setShowEmptyJourney] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(mockStageGroups[1].id);
  const [postsUsedToday, setPostsUsedToday] = useState(2);
  const [commentsUsedToday, setCommentsUsedToday] = useState(7);
  const [bookmarkedGuides, setBookmarkedGuides] = useState<Record<string, boolean>>({});
  const [earnedBadgeIds, setEarnedBadgeIds] = useState(["b3", "b5"]);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState("21:00");
  const [quietEnd, setQuietEnd] = useState("08:00");
  const [weekSummaryConsent, setWeekSummaryConsent] = useState(false);
  const [mediaUploadsUsed, setMediaUploadsUsed] = useState(8);
  const [storyDaysThisWeek, setStoryDaysThisWeek] = useState(3);
  const [wellnessDaysThisWeek, setWellnessDaysThisWeek] = useState(2);
  const [loopCompletion, setLoopCompletion] = useState<LoopCompletion>({
    capture: true,
    care: false,
    learn: false,
    connect: false,
  });
  const [milestoneStatuses, setMilestoneStatuses] = useState<Record<string, MilestoneStatus>>({
    m1: "OBSERVED",
    m2: "EMERGING",
    m3: "OBSERVED",
    m4: "EMERGING",
    m5: "NOT_OBSERVED",
  });
  const [moderationStatuses, setModerationStatuses] = useState<Record<string, string>>({});
  const [journalQuery, setJournalQuery] = useState("");
  const [isPremiumPreview, setPremiumPreview] = useState(false);
  const [newlyEarnedBadgeId, setNewlyEarnedBadgeId] = useState<string | null>(null);
  const [groupRelatedAlerts, setGroupRelatedAlerts] = useState(true);
  const [accountAgeDays] = useState(7);
  const [householdName, setHouseholdName] = useState("The Rivera household");
  const [childDisplayName, setChildDisplayName] = useState("Ava");
  const [dueDateOverride, setDueDateOverride] = useState<string | null>(null);
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null);
  const [notificationPrefs, setNotificationPrefs] =
    useState<Record<NotificationPrefKey, boolean>>(defaultNotificationPrefs);
  const [journeyMemories, setJourneyMemories] = useState<JourneyMemory[]>(() =>
    mockMemories.map((memory) => ({ ...memory })),
  );
  const [groupFeedPosts, setGroupFeedPosts] = useState<GroupFeedPost[]>(buildInitialGroupFeed);
  const [syncingDrafts, setSyncingDrafts] = useState(false);
  const wasOfflineRef = useRef(isOffline);

  useEffect(() => {
    const today = todayQuery.data;
    if (!today) return;
    setLoopCompletion(today.loopCompletion);
    setStoryDaysThisWeek(today.weekProgress.storyDays);
    setWellnessDaysThisWeek(today.weekProgress.wellnessDays);
    setMediaUploadsUsed(today.mediaUploadsUsed);
    setMediaUploadsLimit(today.mediaUploadsLimit);
    setAiMessagesUsed(today.aiMessagesUsed);
    setAiDailyLimit(today.aiDailyLimit);
    setPremiumPreview(today.isPremium);
  }, [todayQuery.data]);

  useEffect(() => {
    const entitlements = entitlementsQuery.data;
    if (!entitlements) return;
    setPremiumPreview(entitlements.isPremium);
    setMediaUploadsLimit(entitlements.mediaUploadsLimit);
    setAiDailyLimit(entitlements.aiDailyLimit);
  }, [entitlementsQuery.data]);

  useEffect(() => {
    const family = familyQuery.data;
    if (!family) return;
    setHouseholdName(family.name);
    if (family.childDisplayName) setChildDisplayName(family.childDisplayName);
    setStageMode(family.stageMode);
    if (family.dueDate) setDueDateOverride(family.dueDate);
  }, [familyQuery.data]);

  useEffect(() => {
    const usage = aiUsageQuery.data;
    if (!usage) return;
    setAiMessagesUsed(usage.dailyUsed);
    setAiDailyLimit(usage.dailyLimit);
    setAiHourlyUsed(usage.hourlyUsed);
    setAiHourlyLimit(usage.hourlyLimit);
  }, [aiUsageQuery.data]);

  useEffect(() => {
    const prefs = notificationPrefsQuery.data;
    if (!prefs) return;
    setQuietHoursEnabled(prefs.quietHoursEnabled);
    setQuietStart(prefs.quietStart);
    setQuietEnd(prefs.quietEnd);
    setGroupRelatedAlerts(prefs.groupRelatedAlerts);
    setNotificationPrefs((current) => ({ ...current, ...prefs.prefs }));
  }, [notificationPrefsQuery.data]);

  useEffect(() => {
    let cancelled = false;
    void loadMemoryDrafts().then((stored) => {
      if (cancelled) return;
      const mapped: MemoryDraft[] = stored.map((draft) => ({
        id: draft.id,
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
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftsHydrated) return;
    void saveMemoryDrafts(drafts.map(toPersistedDraft));
  }, [drafts, draftsHydrated]);

  useEffect(() => {
    if (!useMockData) return;
    // Mock mode still keeps seeded memories for UX demos.
  }, []);

  useEffect(() => {
    if (useMockData) return;
    let cancelled = false;
    void (async () => {
      try {
        const [memories, family] = await Promise.all([
          memoriesApi.listMemories(),
          familiesApi.getCurrentFamily().catch(() => null),
        ]);
        if (cancelled) return;
        setJourneyMemories(
          memories.items.map((memory) => ({
            id: memory.id,
            dateLabel: memory.eventDate,
            title: memory.title,
            body: memory.body,
            author: memory.authorName,
            visibility: memory.visibility,
          })),
        );
        setMemoryCount(memories.items.length);
        if (family) {
          setHouseholdName(family.name);
          if (family.childDisplayName) setChildDisplayName(family.childDisplayName);
          setStageMode(family.stageMode);
          if (family.dueDate) setDueDateOverride(family.dueDate);
        }
      } catch {
        // Keep local seed until API is available.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flushDraftQueue = useCallback(async () => {
    if (syncingDrafts || drafts.length === 0 || isOffline) return 0;
    setSyncingDrafts(true);
    try {
      const flushed = await flushMemoryDrafts(drafts);
      if (flushed.length === 0) {
        // Drop empty drafts that can never sync so we don't retry forever.
        setDrafts((current) => {
          const next = current.filter((draft) => draft.body.trim().length > 0);
          setPendingDraft(next.length > 0);
          return next;
        });
        return 0;
      }

      const flushedIds = new Set(flushed.map((item) => item.draftId));
      setDrafts((current) => {
        const next = current.filter((draft) => !flushedIds.has(draft.id));
        setPendingDraft(next.length > 0);
        return next;
      });

      for (const item of flushed) {
        setJourneyMemories((current) => [
          {
            id: item.memoryId,
            dateLabel: item.eventDate,
            title:
              item.body.length > 48 ? `${item.body.slice(0, 48)}…` : item.body,
            body: item.body,
            author: "You",
            visibility: item.visibility,
          },
          ...current,
        ]);
        setMemoryCount((count) => count + 1);
        setShowEmptyJourney(false);
      }

      return flushed.length;
    } finally {
      setSyncingDrafts(false);
    }
  }, [drafts, isOffline, syncingDrafts]);

  const flushDraftQueueRef = useRef(flushDraftQueue);
  flushDraftQueueRef.current = flushDraftQueue;

  useEffect(() => {
    const cameOnline = wasOfflineRef.current && !isOffline;
    wasOfflineRef.current = isOffline;
    if (!draftsHydrated || isOffline) return;
    if (cameOnline || draftsHydrated) {
      void flushDraftQueueRef.current();
    }
  }, [draftsHydrated, isOffline]);

  const earnBadge = useCallback((id: string) => {
    setEarnedBadgeIds((current) => {
      if (current.includes(id)) return current;
      setNewlyEarnedBadgeId(id);
      return [...current, id];
    });
  }, []);

  const completeCapture = useCallback((input?: CaptureInput) => {
    let awardedBadgeId: string | null = null;
    setEarnedBadgeIds((badges) => {
      if (!badges.includes("b1")) {
        awardedBadgeId = "b1";
        setNewlyEarnedBadgeId("b1");
        return [...badges, "b1"];
      }
      return badges;
    });

    if (input?.body.trim()) {
      const trimmed = input.body.trim();
      const memory: JourneyMemory = {
        id: `mem-${Date.now()}`,
        dateLabel: input.eventDate || "Today",
        title: trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed,
        body: trimmed,
        author: "You",
        visibility: input.visibility ?? "HOUSEHOLD",
      };
      setJourneyMemories((current) => [memory, ...current]);
      setShowEmptyJourney(false);
    }

    setMemoryCount((count) => count + 1);
    setLoopCompletion((current) => {
      if (!current.capture) {
        setStoryDaysThisWeek((days) => {
          const next = Math.min(WEEK_GOAL, days + 1);
          if (next >= WEEK_GOAL) {
            setEarnedBadgeIds((badges) =>
              badges.includes("b2") ? badges : [...badges, "b2"],
            );
          }
          return next;
        });
      }
      return { ...current, capture: true };
    });
    return { awardedBadgeId };
  }, []);

  const updateJourneyMemory = useCallback(
    (id: string, patch: Partial<Pick<JourneyMemory, "title" | "body" | "visibility">>) => {
      setJourneyMemories((current) =>
        current.map((memory) => (memory.id === id ? { ...memory, ...patch } : memory)),
      );
      if (!useMockData) {
        void memoriesApi.updateMemory(id, {
          title: patch.title,
          body: patch.body,
          visibility: patch.visibility,
        });
      }
    },
    [],
  );

  const deleteJourneyMemory = useCallback((id: string) => {
    setJourneyMemories((current) => {
      const next = current.filter((memory) => memory.id !== id);
      setMemoryCount(next.length);
      if (next.length === 0) setShowEmptyJourney(true);
      return next;
    });
    if (!useMockData) {
      void memoriesApi.deleteMemory(id);
    }
  }, []);

  const getGroupFeed = useCallback(
    (groupId: string) => groupFeedPosts.filter((post) => post.groupId === groupId),
    [groupFeedPosts],
  );

  const addGroupPost = useCallback((input: { body: string; groupId: string }) => {
    const id = `up-${Date.now()}`;
    const post: GroupFeedPost = {
      id,
      groupId: input.groupId,
      authorId: "u-you",
      author: "You",
      body: input.body.trim(),
      reactions: 0,
      comments: [],
    };
    setGroupFeedPosts((current) => [post, ...current]);
    setPostsUsedToday((count) => count + 1);
    setConnectScenario("active");
    setLoopCompletion((current) => ({ ...current, connect: true }));
    return id;
  }, []);

  const addGroupComment = useCallback((input: { postId: string; body: string; groupId: string }) => {
    const comment = {
      id: `uc-${Date.now()}`,
      authorId: "u-you",
      author: "You",
      body: input.body.trim(),
      createdAt: "Just now",
    };
    setGroupFeedPosts((current) => {
      const exists = current.some((post) => post.id === input.postId);
      if (exists) {
        return current.map((post) =>
          post.id === input.postId
            ? { ...post, comments: [...post.comments, comment] }
            : post,
        );
      }
      return [
        {
          id: input.postId,
          groupId: input.groupId,
          authorId: "u-unknown",
          author: "Parent",
          body: "(original post)",
          reactions: 0,
          comments: [comment],
        },
        ...current,
      ];
    });
    setCommentsUsedToday((count) => count + 1);
    setConnectScenario("active");
    setLoopCompletion((current) => ({ ...current, connect: true }));
  }, []);

  const completeCare = useCallback(() => {
    let awardedBadgeId: string | null = null;
    setEarnedBadgeIds((badges) => {
      if (!badges.includes("b5")) {
        awardedBadgeId = "b5";
        setNewlyEarnedBadgeId("b5");
        return [...badges, "b5"];
      }
      return badges;
    });
    setLoopCompletion((current) => {
      if (!current.care) {
        setWellnessDaysThisWeek((days) => Math.min(WEEK_GOAL, days + 1));
      }
      return { ...current, care: true };
    });
    return { awardedBadgeId };
  }, []);

  const markLearnDone = useCallback(() => {
    setLoopCompletion((current) => ({ ...current, learn: true }));
  }, []);

  const markConnectDone = useCallback(() => {
    setLoopCompletion((current) => ({ ...current, connect: true }));
  }, []);

  const saveDraft = useCallback(
    (input: {
      body: string;
      eventDate: string;
      hasPhoto: boolean;
      photoUri?: string | null;
      visibility?: "HOUSEHOLD" | "PRIVATE";
    }) => {
      const draft: MemoryDraft = {
        id: `draft-${Date.now()}`,
        body: input.body,
        eventDate: input.eventDate,
        hasPhoto: input.hasPhoto,
        photoUri: input.photoUri ?? null,
        visibility: input.visibility ?? "HOUSEHOLD",
        createdAtLabel: "Just now",
      };
      setDrafts((current) => [draft, ...current]);
      setPendingDraft(true);
    },
    [],
  );

  const removeDraft = useCallback((id: string) => {
    setDrafts((current) => {
      const next = current.filter((draft) => draft.id !== id);
      setPendingDraft(next.length > 0);
      return next;
    });
  }, []);

  const clearDrafts = useCallback(() => {
    setDrafts([]);
    setPendingDraft(false);
    void clearMemoryDrafts();
  }, []);

  const applyOnboardingProfile = useCallback(
    async (input: OnboardingProfileInput) => {
      if (input.householdName?.trim()) setHouseholdName(input.householdName.trim());
      if (input.childName?.trim()) setChildDisplayName(input.childName.trim());
      if (input.primaryGoal) setPrimaryGoal(input.primaryGoal);
      if (input.notificationPrefs) {
        setNotificationPrefs((current) => ({
          ...current,
          ...input.notificationPrefs,
        }));
      }

      if (!useMockData) {
        try {
          const familyName =
            input.householdName?.trim() ||
            (input.childName?.trim() ? `${input.childName.trim()}'s household` : "Our household");
          await familiesApi.createFamily({ name: familyName });

          if (input.role === "expecting" && input.dueDate?.trim()) {
            await profilesApi.createPregnancy({ dueDate: input.dueDate.trim() });
          }
          if (input.role === "parent" && input.childName?.trim() && input.childDob?.trim()) {
            await profilesApi.createChild({
              displayName: input.childName.trim(),
              dateOfBirth: input.childDob.trim(),
            });
          }

          await consentsApi.createConsent({ type: "age_attestation", version: "mvp-1" });
          await consentsApi.createConsent({ type: "terms", version: "mvp-1" });
          await consentsApi.createConsent({ type: "privacy", version: "mvp-1" });

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
        } catch {
          // Local onboarding still completes; API retry happens when backend is up.
        }
      }

      if (input.role === "expecting") {
        setStageMode("pregnancy");
        if (input.dueDate?.trim()) setDueDateOverride(input.dueDate.trim());
        earnBadge("b4");
        setActiveGroupId(mockStageGroups[0]?.id ?? "g-preg");
        return;
      }

      if (input.role === "parent") {
        setStageMode("postpartum");
        setActiveGroupId(mockStageGroups[1]?.id ?? "g-06");
        return;
      }

      if (input.role === "partner") {
        setStageMode("unknown");
        setConnectTodayMode("alone");
      }
    },
    [earnBadge],
  );

  const markPartnerJoined = useCallback(() => {
    earnBadge("b3");
    setConnectTodayMode("group");
  }, [earnBadge]);

  const activeDays = recomputeActiveDays(storyDaysThisWeek, wellnessDaysThisWeek);
  const recapEligible =
    memoryCount >= 3 || (storyDaysThisWeek >= 2 && wellnessDaysThisWeek >= 1);

  const value = useMemo<MockUiState>(
    () => ({
      isOffline,
      deviceOffline,
      dismissOfflineBanner: () => setOfflineBannerDismissed(true),
      offlineBannerDismissed,
      aiMessagesUsed,
      incrementAiUsage: () => {
        setAiMessagesUsed((count) => count + 1);
        setAiHourlyUsed((count) => count + 1);
      },
      setAiUsage: (usage) => {
        setAiMessagesUsed(usage.dailyUsed);
        setAiDailyLimit(usage.dailyLimit);
        setAiHourlyUsed(usage.hourlyUsed);
        setAiHourlyLimit(usage.hourlyLimit);
      },
      aiDailyLimit,
      aiHourlyUsed,
      aiHourlyLimit,      likedPosts,
      togglePostLike: (postId) =>
        setLikedPosts((current) => ({
          ...current,
          [postId]: !current[postId],
        })),
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
      pendingDraft,
      setPendingDraft,
      drafts,
      saveDraft,
      removeDraft,
      clearDrafts,
      connectScenario,
      setConnectScenario,
      connectTodayMode,
      setConnectTodayMode,
      stageMode,
      setStageMode,
      pregnancyConverted,
      convertPregnancy: (childName, birthDate) => {
        setPregnancyChildName(childName);
        setPregnancyBirthDate(birthDate);
        setPregnancyConverted(true);
        setChildDisplayName(childName);
        setStageMode("postpartum");
        setActiveGroupId(mockStageGroups[1]?.id ?? "g-06");
        earnBadge("b4");
      },
      pregnancyChildName,
      pregnancyBirthDate,
      checklistDone,
      toggleChecklistItem: (id) =>
        setChecklistDone((current) => ({ ...current, [id]: !current[id] })),
      selectedMood,
      setSelectedMood,
      memoryCount,
      completeCapture,
      inviteCtaDismissed,
      dismissInviteCta: () => setInviteCtaDismissed(true),
      showEmptyJourney,
      setShowEmptyJourney,
      activeGroupId,
      setActiveGroupId,
      postsUsedToday,
      incrementPostCount: () => {
        setPostsUsedToday((count) => count + 1);
        markConnectDone();
      },
      commentsUsedToday,
      incrementCommentCount: () => {
        setCommentsUsedToday((count) => count + 1);
        markConnectDone();
      },
      commentsDailyLimit: 50,
      bookmarkedGuides,
      toggleBookmark: (id) =>
        setBookmarkedGuides((current) => ({
          ...current,
          [id]: !current[id],
        })),
      earnedBadgeIds,
      earnBadge,
      quietHoursEnabled,
      setQuietHoursEnabled,
      quietStart,
      quietEnd,
      setQuietHours: (start, end) => {
        setQuietStart(start);
        setQuietEnd(end);
      },
      weekSummaryConsent,
      setWeekSummaryConsent,
      mediaUploadsUsed,
      mediaUploadsLimit,
      incrementMediaUpload: () => setMediaUploadsUsed((count) => count + 1),
      weekProgress: {
        storyDays: storyDaysThisWeek,
        wellnessDays: wellnessDaysThisWeek,
        goal: WEEK_GOAL,
        activeDays,
      },
      loopCompletion,
      completeCare,
      markLearnDone,
      markConnectDone,
      storyDaysThisWeek,
      wellnessDaysThisWeek,
      recapEligible,
      milestoneStatuses,
      setMilestoneStatus: (id, status) =>
        setMilestoneStatuses((current) => ({ ...current, [id]: status })),
      moderationStatuses,
      resolveModerationItem: (id, status) =>
        setModerationStatuses((current) => ({ ...current, [id]: status })),
      journalQuery,
      setJournalQuery,
      isPremiumPreview,
      setPremiumPreview,
      newlyEarnedBadgeId,
      clearNewlyEarnedBadge: () => setNewlyEarnedBadgeId(null),
      applyOnboardingProfile,
      flushDraftQueue,
      syncingDrafts,
      groupRelatedAlerts,
      setGroupRelatedAlerts,
      accountAgeDays,
      linksAllowed: accountAgeDays >= 14,
      markPartnerJoined,
      householdName,
      childDisplayName,
      dueDateOverride,
      primaryGoal,
      notificationPrefs,
      setNotificationPref: (key, value) =>
        setNotificationPrefs((current) => ({ ...current, [key]: value })),
      journeyMemories,
      updateJourneyMemory,
      deleteJourneyMemory,
      groupFeedPosts,
      addGroupPost,
      addGroupComment,
      getGroupFeed,
    }),
    [
      activeDays,
      activeGroupId,
      addGroupComment,
      addGroupPost,
      aiDailyLimit,
      aiHourlyLimit,
      aiHourlyUsed,
      aiMessagesUsed,
      applyOnboardingProfile,
      accountAgeDays,
      blockedAuthorIds,
      bookmarkedGuides,
      checklistDone,
      childDisplayName,
      clearDrafts,
      commentsUsedToday,
      communityRulesAccepted,
      completeCapture,
      completeCare,
      connectRulesSeen,
      connectScenario,
      connectTodayMode,
      deleteJourneyMemory,
      deviceOffline,
      drafts,
      dueDateOverride,
      earnBadge,
      earnedBadgeIds,
      flushDraftQueue,
      getGroupFeed,
      groupFeedPosts,
      groupRelatedAlerts,
      householdName,
      inviteCtaDismissed,
      isOffline,
      isPremiumPreview,
      journalQuery,
      journeyMemories,
      likedPosts,
      loopCompletion,
      markConnectDone,
      markLearnDone,
      markPartnerJoined,
      mediaUploadsLimit,
      mediaUploadsUsed,
      memoryCount,
      milestoneStatuses,
      moderationStatuses,
      newlyEarnedBadgeId,
      notificationPrefs,
      offlineBannerDismissed,
      pendingDraft,
      postsUsedToday,
      pregnancyBirthDate,
      pregnancyChildName,
      pregnancyConverted,
      primaryGoal,
      quietEnd,
      quietHoursEnabled,
      quietStart,
      recapEligible,
      removeDraft,
      saveDraft,
      selectedMood,
      showEmptyJourney,
      stageMode,
      storyDaysThisWeek,
      syncingDrafts,
      updateJourneyMemory,
      weekSummaryConsent,
      wellnessDaysThisWeek,
    ],
  );

  return <MockUiContext.Provider value={value}>{children}</MockUiContext.Provider>;
}

export function useMockUi() {
  const context = useContext(MockUiContext);
  if (!context) {
    throw new Error("useMockUi must be used within MockUiProvider");
  }
  return context;
}

/** Prefer this name in new code — same session facade as useMockUi. */
export const useAppSession = useMockUi;
