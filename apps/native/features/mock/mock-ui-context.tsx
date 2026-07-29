import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { mockPregnancy, mockStageGroups } from "@/features/mock/mock-content";

type StageMode = "postpartum" | "pregnancy" | "unknown";

type LoopKey = "capture" | "care" | "learn" | "connect";

type MilestoneStatus = "NOT_OBSERVED" | "EMERGING" | "OBSERVED" | "SKIPPED";

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
};

export type OnboardingProfileInput = {
  role: "expecting" | "parent" | "partner" | null;
  dueDate?: string;
  childName?: string;
  childDob?: string;
  householdName?: string;
};

type MockUiState = {
  isOffline: boolean;
  setOffline: (value: boolean) => void;
  dismissOfflineBanner: () => void;
  offlineBannerDismissed: boolean;
  aiMessagesUsed: number;
  incrementAiUsage: () => void;
  resetAiUsage: () => void;
  aiDailyLimit: number;
  aiHourlyUsed: number;
  aiHourlyLimit: number;
  resetAiHourly: () => void;
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
  saveDraft: (input: { body: string; eventDate: string; hasPhoto: boolean }) => void;
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
  completeCapture: () => { awardedBadgeId: string | null };
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
  setMediaNearLimit: () => void;
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
  applyOnboardingProfile: (input: OnboardingProfileInput) => void;
  groupRelatedAlerts: boolean;
  setGroupRelatedAlerts: (value: boolean) => void;
  accountAgeDays: number;
  linksAllowed: boolean;
  markPartnerJoined: () => void;
  householdName: string;
  childDisplayName: string;
  dueDateOverride: string | null;
};

const MockUiContext = createContext<MockUiState | null>(null);

const initialChecklist = Object.fromEntries(
  mockPregnancy.checklist.map((item) => [item.id, item.done]),
);

const WEEK_GOAL = 4;

function recomputeActiveDays(storyDays: number, wellnessDays: number) {
  // Soft dual challenge: either story or wellness can count toward an active day.
  // For mock UI we treat union-ish progress as max of the two tracks, capped by goal.
  return Math.min(WEEK_GOAL, Math.max(storyDays, wellnessDays, Math.min(storyDays + wellnessDays, WEEK_GOAL)));
}

export function MockUiProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
  const [aiMessagesUsed, setAiMessagesUsed] = useState(2);
  const [aiHourlyUsed, setAiHourlyUsed] = useState(4);
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

  const earnBadge = useCallback((id: string) => {
    setEarnedBadgeIds((current) => {
      if (current.includes(id)) return current;
      setNewlyEarnedBadgeId(id);
      return [...current, id];
    });
  }, []);

  const completeCapture = useCallback(() => {
    let awardedBadgeId: string | null = null;
    setEarnedBadgeIds((badges) => {
      if (!badges.includes("b1")) {
        awardedBadgeId = "b1";
        setNewlyEarnedBadgeId("b1");
        return [...badges, "b1"];
      }
      return badges;
    });
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
    (input: { body: string; eventDate: string; hasPhoto: boolean }) => {
      const draft: MemoryDraft = {
        id: `draft-${Date.now()}`,
        body: input.body,
        eventDate: input.eventDate,
        hasPhoto: input.hasPhoto,
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
  }, []);

  const applyOnboardingProfile = useCallback(
    (input: OnboardingProfileInput) => {
      if (input.householdName?.trim()) setHouseholdName(input.householdName.trim());
      if (input.childName?.trim()) setChildDisplayName(input.childName.trim());

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
      setOffline: setIsOffline,
      dismissOfflineBanner: () => setOfflineBannerDismissed(true),
      offlineBannerDismissed,
      aiMessagesUsed,
      incrementAiUsage: () => {
        setAiMessagesUsed((count) => count + 1);
        setAiHourlyUsed((count) => count + 1);
      },
      resetAiUsage: () => {
        setAiMessagesUsed(0);
        setAiHourlyUsed(0);
      },
      aiDailyLimit: 5,
      aiHourlyUsed,
      aiHourlyLimit: 20,
      resetAiHourly: () => setAiHourlyUsed(0),
      likedPosts,
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
        setStageMode("postpartum");
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
      mediaUploadsLimit: 10,
      incrementMediaUpload: () => setMediaUploadsUsed((count) => count + 1),
      setMediaNearLimit: () => setMediaUploadsUsed(9),
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
      groupRelatedAlerts,
      setGroupRelatedAlerts,
      accountAgeDays,
      linksAllowed: accountAgeDays >= 14,
      markPartnerJoined,
      householdName,
      childDisplayName,
      dueDateOverride,
    }),
    [
      activeDays,
      activeGroupId,
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
      drafts,
      dueDateOverride,
      earnBadge,
      earnedBadgeIds,
      groupRelatedAlerts,
      householdName,
      inviteCtaDismissed,
      isOffline,
      isPremiumPreview,
      journalQuery,
      likedPosts,
      loopCompletion,
      markConnectDone,
      markLearnDone,
      markPartnerJoined,
      mediaUploadsUsed,
      memoryCount,
      milestoneStatuses,
      moderationStatuses,
      newlyEarnedBadgeId,
      offlineBannerDismissed,
      pendingDraft,
      postsUsedToday,
      pregnancyBirthDate,
      pregnancyChildName,
      pregnancyConverted,
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
