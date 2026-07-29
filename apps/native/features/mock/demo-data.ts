export type MockStage = "pregnancy" | "newborn" | "infant" | "toddler";

export type MockProfile = {
  displayName: string;
  stage: MockStage;
  stageLabel: string;
  caregiverName: string;
  dob: string;
};

export const mockProfile: MockProfile = {
  displayName: "Ava",
  stage: "newborn",
  stageLabel: "12 weeks",
  caregiverName: "You",
  dob: "2026-05-06",
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
  pregnancyWellnessAction: {
    id: "wellness-pregnancy-side-rest",
    title: "Side-lying rest cue",
    duration: "3 min",
    durationSeconds: 180,
    detail: "A soft reset for third-trimester hips and breath — not a workout.",
    stageNote: "Pregnancy-safe rest cue. Stop anytime you feel unwell.",
    stageTags: ["pregnancy"],
    reviewerName: "Dr. Elena R., CNM",
    reviewedOn: "2026-02-18",
    sourceName: "BumpAtlas Pregnancy Wellness",
    clearanceCopy:
      "If you have pregnancy complications, bleeding, reduced fetal movement, chest pain, dizziness, or your clinician advised rest — pause and check with them before starting.",
    stopCopy:
      "If you feel dizzy, short of breath, chest pain, contractions that worry you, or anything that feels wrong — stop and rest. Seek care if it continues.",
    badgeOnComplete: {
      id: "b5",
      title: "Care Pause",
      description: "You completed a wellness Care action.",
    },
    steps: [
      {
        id: "p1",
        title: "Lie on your side",
        body: "Prefer left side if comfortable. Place a pillow between your knees.",
      },
      {
        id: "p2",
        title: "Soften your jaw",
        body: "Unclench, drop your shoulders, and let your belly feel supported.",
      },
      {
        id: "p3",
        title: "Breathe gently",
        body: "Inhale for 4, exhale for 6. Do about six rounds — fewer is fine.",
      },
    ],
  },
  wellnessAction: {
    id: "wellness-breathing-reset",
    title: "Two-minute breathing reset",
    duration: "2 min",
    durationSeconds: 120,
    detail: "A quiet pause for you — not a workout.",
    stageNote: "Gentle for most parents. Stop anytime you feel unwell.",
    stageTags: ["postpartum", "general-parent"],
    reviewerName: "Dr. Priya N., PT",
    reviewedOn: "2026-03-12",
    sourceName: "BumpAtlas Parent Wellness Library",
    clearanceCopy:
      "If you have pregnancy complications, recent surgery, chest pain, dizziness, or your clinician advised rest — pause and check with them before starting.",
    stopCopy:
      "If you feel dizzy, short of breath, chest pain, or anything that worries you — stop and rest. Seek care if it continues.",
    badgeOnComplete: {
      id: "b5",
      title: "Care Pause",
      description: "You completed a wellness Care action.",
    },
    steps: [
      {
        id: "s1",
        title: "Find a soft spot",
        body: "Sit or stand somewhere steady. Unclench your jaw and drop your shoulders.",
      },
      {
        id: "s2",
        title: "Breathe in for 4",
        body: "Inhale gently through your nose. Count slowly: 1 · 2 · 3 · 4.",
      },
      {
        id: "s3",
        title: "Breathe out for 6",
        body: "Exhale through your mouth, longer than the inhale. Count: 1 · 2 · 3 · 4 · 5 · 6.",
      },
      {
        id: "s4",
        title: "Repeat a few times",
        body: "Do this about six rounds — or fewer if that’s all you have. Stopping early is fine.",
      },
    ],
  },
  learnCard: {
    id: "g2",
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
    visibility: "HOUSEHOLD" as const,
  },
  {
    id: "2",
    dateLabel: "Yesterday",
    title: "Park stroll",
    body: "Slept through the whole walk. Soft breeze, soft light.",
    author: "Jordan",
    visibility: "HOUSEHOLD" as const,
  },
  {
    id: "3",
    dateLabel: "Mon",
    title: "Funny hiccups",
    body: "Three rounds after evening milk. We both laughed.",
    author: "You",
    visibility: "HOUSEHOLD" as const,
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
    authorId: "u-maya",
    author: "Maya · 11 weeks",
    body: "Anyone else finding evening fussiness peaks around the same hour?",
    reactions: 12,
    comments: [
      {
        id: "c1",
        authorId: "u-sam",
        author: "Sam · 14 weeks",
        body: "Same here around 6pm. Dim lights helped a little.",
        createdAt: "1h ago",
      },
      {
        id: "c2",
        authorId: "u-lee",
        author: "Lee · 10 weeks",
        body: "We started a shorter last nap — still figuring it out.",
        createdAt: "45m ago",
      },
    ],
  },
  {
    id: "p2",
    authorId: "u-sam",
    author: "Sam · 14 weeks",
    body: "We started a shared note for grandparents. Less WhatsApp spam, more calm.",
    reactions: 8,
    comments: [
      {
        id: "c3",
        authorId: "u-maya",
        author: "Maya · 11 weeks",
        body: "Love this idea. Stealing it.",
        createdAt: "3h ago",
      },
    ],
  },
];

export const mockConnectAlone = {
  mode: "alone" as const,
  inviteMessage: "Invite your partner so both of you can add to Ava’s story.",
};

export const mockGuides = [
  {
    id: "g1",
    slug: "gentle-shoulder-stretch",
    category: "Parent care",
    title: "A gentle stretch for tired shoulders",
    summary: "Two minutes to loosen the tension that builds from holding, feeding, and carrying.",
    body: [
      "Parenting uses muscles you didn’t know you had — especially shoulders and upper back.",
      "Roll your shoulders back slowly, then down. Hold for a few breaths. Repeat three times.",
      "Gently tilt your ear toward one shoulder without lifting the shoulder. Hold 15 seconds each side.",
      "Stop if you feel sharp pain. This is comfort care, not a workout.",
    ],
    stageTags: ["postpartum", "general-parent"],
    sourceName: "BumpAtlas Parent Wellness Library",
    reviewerName: "Dr. Priya N., PT",
    reviewedOn: "2026-03-12",
    readMinutes: 2,
  },
  {
    id: "g2",
    slug: "wake-windows-12-weeks",
    category: "Development",
    title: "Wake windows around 12 weeks",
    summary: "Many babies this age stay awake 1–1.5 hours between naps. Watch cues, not the clock alone.",
    body: [
      "Around 12 weeks, many babies can stay awake a little longer — often about 1 to 1.5 hours between naps.",
      "Look for early tired cues: staring off, fussing, rubbing eyes, or turning away from stimulation.",
      "A calm dim room and a short wind-down routine can help — but every baby is different.",
      "If sleep feels hard for weeks, talk with your pediatric clinician. This tip is educational, not a diagnosis.",
    ],
    stageTags: ["0-3m", "3-6m"],
    sourceName: "BumpAtlas Development Tips",
    reviewerName: "Dr. Amara K., MD",
    reviewedOn: "2026-02-20",
    readMinutes: 3,
  },
  {
    id: "g3",
    slug: "clinic-questions-pregnancy",
    category: "Pregnancy",
    title: "Questions worth writing down for your next visit",
    summary: "A simple list so you leave appointments feeling heard — not scrambling to remember.",
    body: [
      "Sleep changes, mood shifts, and new symptoms are worth noting — even if they feel small.",
      "Write down: what changed, when it started, and what helps (even a little).",
      "Ask: Is this common at my stage? When should I call between visits?",
      "Bring your partner’s questions too. Shared notes reduce the mental load.",
    ],
    stageTags: ["pregnancy"],
    sourceName: "BumpAtlas Pregnancy Guides",
    reviewerName: "Dr. Elena R., CNM",
    reviewedOn: "2026-01-08",
    readMinutes: 2,
  },
  {
    id: "g4",
    slug: "feeding-positions-newborn",
    category: "Feeding",
    title: "Comfortable feeding positions to try",
    summary: "A few setups that reduce wrist and back strain while you figure out what works.",
    body: [
      "Support your arms with pillows so baby’s weight isn’t hanging on your wrists.",
      "Bring baby to you — don’t twist your torso to reach them.",
      "If latch or pain continues, contact a lactation consultant or your clinician.",
      "This is comfort guidance only — not a feeding diagnosis.",
    ],
    stageTags: ["0-3m"],
    sourceName: "BumpAtlas Newborn Care",
    reviewerName: "Samira L., IBCLC",
    reviewedOn: "2026-04-10",
    readMinutes: 3,
  },
  {
    id: "g5",
    slug: "partner-night-shifts",
    category: "Household",
    title: "Sharing nights without keeping score",
    summary: "A calm way to divide overnight care when both of you are exhausted.",
    body: [
      "Agree on blocks (for example 10pm–2am / 2am–6am) rather than every wake.",
      "The “off” partner sleeps elsewhere if possible — even one solid stretch helps.",
      "Write the plan once, then revisit weekly without blame language.",
      "If sleep deprivation feels unsafe, talk with your clinician about support options.",
    ],
    stageTags: ["postpartum", "0-3m", "3-6m"],
    sourceName: "BumpAtlas Family Guides",
    reviewerName: "Dr. Amara K., MD",
    reviewedOn: "2026-03-01",
    readMinutes: 3,
  },
  {
    id: "g6",
    slug: "toddler-boundaries-soft",
    category: "Toddlers",
    title: "Soft boundaries that still feel kind",
    summary: "Short scripts for saying no without escalating a tired toddler moment.",
    body: [
      "Name the feeling: “You want another cookie. You’re disappointed.”",
      "Hold the limit once: “Dinner is next. Cookie after.”",
      "Offer a small choice inside the limit when you can.",
      "If meltdowns feel extreme or lasting, check in with your pediatric clinician.",
    ],
    stageTags: ["12-24m", "2-6y"],
    sourceName: "BumpAtlas Toddler Tips",
    reviewerName: "Jordan P., LCSW",
    reviewedOn: "2026-05-14",
    readMinutes: 2,
  },
  {
    id: "g7",
    slug: "fever-when-to-call",
    category: "Safety",
    title: "Fever — when to call (not dose)",
    summary: "Educational timing cues only. We never recommend medicine doses in-app.",
    body: [
      "Know your local emergency number and your pediatric clinic’s after-hours line.",
      "For infants under 3 months, many clinicians want a call for any fever — ask yours what they prefer.",
      "Watch breathing, hydration, alertness, and rashes — not temperature alone.",
      "BumpAtlas cannot diagnose or dose. If you’re worried, seek care now.",
    ],
    stageTags: ["0-3m", "3-6m", "6-12m", "safety"],
    sourceName: "BumpAtlas Safety Always-Free",
    reviewerName: "Dr. Amara K., MD",
    reviewedOn: "2026-02-02",
    readMinutes: 3,
  },
  {
    id: "g8",
    slug: "third-trimester-rest",
    category: "Pregnancy",
    title: "Rest cues in the third trimester",
    summary: "Permission to pause — and language for when rest isn’t optional.",
    body: [
      "Swelling, dizziness, reduced fetal movement, or severe headache deserve a call — don’t wait for a scheduled visit.",
      "Side-lying with a pillow between knees can ease hips and low back.",
      "Hydration and short walks often help more than “pushing through.”",
      "Your clinician’s advice always overrides a tip card.",
    ],
    stageTags: ["pregnancy"],
    sourceName: "BumpAtlas Pregnancy Week Cards",
    reviewerName: "Dr. Elena R., CNM",
    reviewedOn: "2026-02-22",
    readMinutes: 2,
  },
];

export const mockPaywall = {
  monthlyPrice: "$6.99",
  annualPrice: "$59",
  foundingAnnualPrice: "$49",
  foundingLabel: "Founding price · first 90 days",
  freeForever: [
    "Today loop — Capture, Care, Learn, Connect",
    "Core journal with text and compressed photos",
    "Household with 2 adults",
    "Weekly standard recap",
    "Stage group participation",
    "5 AI messages per day",
    "Export and delete your data",
    "Safety content always free",
  ],
  premiumIncludes: [
    "Higher media quota and original quality",
    "Unlimited children and journals",
    "Premium recap themes and “on this day”",
    "30 AI messages per day",
    "Up to 6 household seats",
    "Premium guided wellness packs",
    "Advanced search across your journal",
  ],
  contextualHeadlines: {
    recap: "Unlock premium recap themes",
    "ai-quota": "More calm answers when you need them",
    "third-seat": "Room for everyone who helps",
    "media-quota": "Keep every photo without worry",
    wellness: "Unlock guided wellness packs",
    search: "Search every moment in your journal",
    "on-this-day": "Relive moments from this day last month",
    default: "Premium for your whole household",
  } as Record<string, string>,
};

export const mockHousehold = {
  name: "The Rivera household",
  childName: "Ava",
  ownerName: "You",
};

export const mockInvitePreview = {
  token: "demo-partner-ava",
  inviterName: "You",
  householdName: "The Rivera household",
  childName: "Ava",
  role: "Partner · contributor",
  expiresLabel: "Expires in 7 days",
};

export * from "./mock-content";
