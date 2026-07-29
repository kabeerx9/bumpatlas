export type MockStage = "pregnancy" | "newborn" | "infant" | "toddler";

export type MockProfile = {
  displayName: string;
  stage: MockStage;
  stageLabel: string;
  caregiverName: string;
};

export const mockProfile: MockProfile = {
  displayName: "Ava",
  stage: "newborn",
  stageLabel: "12 weeks",
  caregiverName: "You",
};

export const mockToday = {
  weekProgress: {
    storyDays: 3,
    wellnessDays: 2,
    goal: 4,
    activeDays: 3,
  },
  loopCompletion: {
    capture: true,
    care: false,
    learn: false,
    connect: false,
  },
  memoryPrompt: "What made Ava smile today?",
  wellnessAction: {
    title: "Two-minute breathing reset",
    duration: "2 min",
    detail: "Sit tall, inhale for 4, exhale for 6. Repeat six times.",
  },
  learnCard: {
    title: "Wake windows around 12 weeks",
    detail: "Many babies this age stay awake 1–1.5 hours between naps. Watch cues, not the clock alone.",
  },
  connectCard: {
    mode: "group" as const,
    groupName: "0–6 months circle",
    prompt: "What’s one thing that made today easier?",
    replyCount: 14,
  },
  connectPrompt: "Invite your partner so both of you can add to Ava’s story.",
  latestMemory: {
    title: "First long eye contact",
    dateLabel: "Today",
  },
};

export const mockMemories = [
  {
    id: "1",
    dateLabel: "Today",
    title: "First long eye contact",
    body: "Held my gaze during the morning feed. Felt like a tiny hello.",
    author: "You",
  },
  {
    id: "2",
    dateLabel: "Yesterday",
    title: "Park stroll",
    body: "Slept through the whole walk. Soft breeze, soft light.",
    author: "Jordan",
  },
  {
    id: "3",
    dateLabel: "Mon",
    title: "Funny hiccups",
    body: "Three rounds after evening milk. We both laughed.",
    author: "You",
  },
];

export const mockMilestones = [
  { id: "m1", title: "Social smile", status: "Observed" },
  { id: "m2", title: "Tracks faces", status: "Emerging" },
  { id: "m3", title: "Lifts head briefly", status: "Observed" },
];

export const mockGroupPosts = [
  {
    id: "p1",
    author: "Maya · 11 weeks",
    body: "Anyone else finding evening fussiness peaks around the same hour?",
    reactions: 12,
  },
  {
    id: "p2",
    author: "Sam · 14 weeks",
    body: "We started a shared note for grandparents. Less WhatsApp spam, more calm.",
    reactions: 8,
  },
];

export const mockGuides = [
  {
    id: "g1",
    category: "Parent care",
    title: "A gentle stretch for tired shoulders",
  },
  {
    id: "g2",
    category: "Development",
    title: "Tummy time that doesn’t feel like a chore",
  },
  {
    id: "g3",
    category: "Pregnancy",
    title: "Questions worth writing down for your next visit",
  },
];
