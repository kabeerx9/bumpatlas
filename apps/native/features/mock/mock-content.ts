export const mockLegalDocuments = {
  privacy: {
    title: "Privacy Policy",
    updated: "March 1, 2026",
    sections: [
      {
        heading: "What we collect",
        body: "Account info, household membership, journal text and photos you choose to save, wellness completions, and optional community posts (text only).",
      },
      {
        heading: "What stays private",
        body: "Household memories are private by default. We do not auto-post journal content to Connect. Child photos in community are disabled at launch.",
      },
      {
        heading: "Your controls",
        body: "Export or delete your data from Family at any time. Invites expire after 7 days. You can revoke household access for any member.",
      },
      {
        heading: "AI usage",
        body: "Assistant messages are logged to improve safety routing. Training on your private journal content is disabled in vendor configuration.",
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "March 1, 2026",
    sections: [
      {
        heading: "Adults only",
        body: "BumpAtlas is for caregivers 18+. You may not create accounts for children.",
      },
      {
        heading: "Educational content",
        body: "Tips and AI answers are educational — not medical advice, diagnosis, or emergency guidance.",
      },
      {
        heading: "Community",
        body: "Connect groups are invite-only and text-first. You agree to our Community Rules when posting.",
      },
      {
        heading: "Subscriptions",
        body: "Premium is billed through the App Store or Google Play. Manage or cancel in store settings.",
      },
    ],
  },
  community: {
    title: "Community Rules",
    updated: "March 1, 2026",
    sections: [
      {
        heading: "Text only",
        body: "No child photos in Connect. Share words of support — not images of minors.",
      },
      {
        heading: "Be kind",
        body: "No harassment, hate, shaming, or medical advice for others. Report anything that feels unsafe.",
      },
      {
        heading: "No spam or links (beta)",
        body: "New accounts cannot post links for the first 14 days. No unsolicited DMs between strangers.",
      },
      {
        heading: "Moderation",
        body: "Reports are reviewed by founders during beta. High-risk reports receive priority escalation.",
      },
    ],
  },
} as const;

export type LegalDocId = keyof typeof mockLegalDocuments;

export const mockHouseholdMembers = [
  {
    id: "m-owner",
    name: "You",
    role: "Owner" as const,
    email: "you@email.com",
    canManageBilling: true,
    canInvite: true,
    canExport: true,
  },
  {
    id: "m-partner",
    name: "Jordan",
    role: "Contributor" as const,
    email: "partner@email.com",
    canManageBilling: false,
    canInvite: false,
    canExport: false,
  },
];

export const mockRecaps = [
  {
    id: "r1",
    weekLabel: "Week of Jul 21",
    title: "This week with Ava",
    summary: "3 memories · 2 wellness pauses · first park stroll",
    memoryCount: 3,
    theme: "standard" as const,
    highlights: ["First long eye contact", "Park stroll", "Funny hiccups"],
  },
  {
    id: "r2",
    weekLabel: "Week of Jul 14",
    title: "Tiny hellos",
    summary: "2 memories · social smile emerging",
    memoryCount: 2,
    theme: "standard" as const,
    highlights: ["Morning feed giggles", "Grandma's visit"],
  },
];

export const mockModerationQueue = [
  {
    id: "mod1",
    type: "Report",
    summary: "Possible medical advice in comment",
    postPreview: "Try giving gripe water every hour...",
    reporter: "Anonymous member",
    status: "Open",
    severity: "medium" as const,
    createdAt: "2h ago",
  },
  {
    id: "mod2",
    type: "High-risk language",
    summary: "Self-harm phrase detected",
    postPreview: "I can't do this anymore...",
    reporter: "System classifier",
    status: "Escalated",
    severity: "high" as const,
    createdAt: "45m ago",
  },
];

export const mockNotificationCategories = [
  {
    id: "dailyPrompt",
    label: "Daily memory prompt",
    description: "A gentle nudge to capture one moment",
    defaultOn: true,
  },
  {
    id: "wellnessReminder",
    label: "Wellness reminder",
    description: "Two-minute care suggestions",
    defaultOn: true,
  },
  {
    id: "partnerActivity",
    label: "Partner activity",
    description: "When someone adds to the journal",
    defaultOn: true,
  },
  {
    id: "weeklyRecap",
    label: "Weekly recap ready",
    description: "When your share card is prepared",
    defaultOn: true,
  },
  {
    id: "communityReply",
    label: "Community reply",
    description: "Muted by default during beta",
    defaultOn: false,
  },
  {
    id: "subscription",
    label: "Subscription",
    description: "Billing and plan updates",
    defaultOn: true,
  },
];

export const mockAssistantResponses = {
  wellness: {
    text: "A two-minute shoulder roll between feeds can ease tension. Stop if anything feels sharp or dizzy.",
    citation: {
      title: "A gentle stretch for tired shoulders",
      sourceName: "BumpAtlas Parent Wellness Library",
      reviewerName: "Dr. Priya N., PT",
      reviewedOn: "Mar 12, 2026",
      guideId: "g1",
    },
  },
  escalate: {
    text: "I'm not able to assess whether a fever is safe. A clinician who knows your baby should hear about symptoms like this.",
    escalate: true,
  },
  dosing: {
    text: "I can't recommend medication doses. Please check with a pharmacist or clinician who knows your child.",
    escalate: true,
  },
  summary: {
    text: "This week you captured three gentle moments — eye contact, a park stroll, and hiccups that made you both laugh. Wellness pauses: 2.",
    citation: {
      title: "Weekly memory summary",
      sourceName: "Your household journal",
      reviewerName: "BumpAtlas (your words only)",
      reviewedOn: "Today",
      guideId: "g5",
    },
  },
};

export const mockPregnancy = {
  dueDate: "2026-10-12",
  week: 28,
  weekLabel: "Week 28",
  trimester: "Third trimester",
  bumpPrompt: "How does your bump feel today — heavy, fluttery, or quiet?",
  weeklyTip: {
    id: "pw28",
    title: "Braxton Hicks vs rest cues",
    summary: "Practice contractions can feel tight. Rest, hydrate, and note patterns for your clinician.",
    reviewerName: "Dr. Elena R., CNM",
    reviewedOn: "2026-02-01",
    sourceName: "BumpAtlas Pregnancy Week Cards",
  },
  weekCards: [
    {
      week: 8,
      title: "Early energy shifts",
      summary: "Rest when you can. Small meals often help more than skipping.",
    },
    {
      week: 12,
      title: "Energy dips are common",
      summary: "Short rests and protein snacks often help more than “pushing through.”",
    },
    {
      week: 16,
      title: "Movement feels different",
      summary: "Note new flutters without scoring yourself against anyone else’s timeline.",
    },
    {
      week: 20,
      title: "Anatomy scan notes",
      summary: "Write questions before the appointment so you leave with clarity.",
    },
    {
      week: 24,
      title: "Sleep positions soften",
      summary: "Side-lying with a pillow between knees can ease hips.",
    },
    {
      week: 28,
      title: "Braxton Hicks vs rest cues",
      summary: "Practice contractions can feel tight. Rest, hydrate, and note patterns.",
    },
    {
      week: 32,
      title: "Packing without panic",
      summary: "A soft list for you matters as much as baby’s first outfit.",
    },
    {
      week: 36,
      title: "Hospital bag soft list",
      summary: "Comfort items for you matter as much as baby’s first outfit.",
    },
    {
      week: 39,
      title: "Near-term quiet",
      summary: "Fewer plans is still progress. Keep your clinician’s call thresholds handy.",
    },
  ],
  moodOptions: [
    { id: "calm", label: "Calm" },
    { id: "tired", label: "Tired" },
    { id: "hopeful", label: "Hopeful" },
    { id: "anxious", label: "Anxious" },
    { id: "mixed", label: "Mixed" },
  ],
  checklist: [
    {
      id: "c1",
      category: "Hospital bag",
      title: "Comfortable going-home outfit",
      done: true,
    },
    {
      id: "c2",
      category: "Hospital bag",
      title: "Phone charger & snacks",
      done: false,
    },
    {
      id: "c3",
      category: "Hospital bag",
      title: "Baby's first outfit & blanket",
      done: false,
    },
    {
      id: "c4",
      category: "Questions for clinician",
      title: "Birth preferences & pain options",
      done: true,
    },
    {
      id: "c5",
      category: "Questions for clinician",
      title: "When to call between visits",
      done: false,
    },
    {
      id: "c6",
      category: "Nesting",
      title: "Car seat installed & checked",
      done: false,
    },
  ],
};

export const mockBadges = [
  {
    id: "b1",
    title: "First Capture",
    description: "You saved your first memory.",
    earned: true,
    earnedLabel: "Earned Jul 12",
  },
  {
    id: "b2",
    title: "Week of Stories",
    description: "4 of 7 active days in a week.",
    earned: false,
    earnedLabel: "3 of 4 days so far",
  },
  {
    id: "b3",
    title: "Partner Joined",
    description: "Someone you love is helping write the story.",
    earned: true,
    earnedLabel: "Earned Jul 18",
  },
  {
    id: "b4",
    title: "Pregnancy Journal Started",
    description: "Began a pregnancy journal with a due date.",
    earned: false,
    earnedLabel: "Start from Family → Pregnancy",
  },
  {
    id: "b5",
    title: "Care Pause",
    description: "Completed a wellness Care action.",
    earned: true,
    earnedLabel: "Earned Jul 20",
  },
];

export const mockMilestoneDetails = [
  {
    id: "m1",
    title: "Social smile",
    status: "Observed" as const,
    window: "Usually emerges around 6–12 weeks",
    note: "A smile in response to your face or voice — not a diagnosis, just a lovely window.",
    canLinkMemory: true,
  },
  {
    id: "m2",
    title: "Tracks faces",
    status: "Emerging" as const,
    window: "Often noticed in the first months",
    note: "Eyes following a face across a short distance. Every baby’s pace is their own.",
    canLinkMemory: true,
  },
  {
    id: "m3",
    title: "Lifts head briefly",
    status: "Observed" as const,
    window: "Common during tummy time in early months",
    note: "Short lifts during supervised tummy time. Stop if baby seems tired or distressed.",
    canLinkMemory: true,
  },
  {
    id: "m4",
    title: "Cooing sounds",
    status: "Emerging" as const,
    window: "Often around 1–4 months",
    note: "Soft vowel sounds while calm or engaged. Not a speech milestone grade.",
    canLinkMemory: true,
  },
  {
    id: "m5",
    title: "Hands to mouth",
    status: "Not observed" as const,
    window: "Common in early months",
    note: "Bringing hands toward mouth during play or calm. Optional to note — never required.",
    canLinkMemory: true,
  },
];

export const mockStageGroups = [
  {
    id: "g-preg",
    name: "Pregnancy circle",
    description: "Expecting parents · text-only support",
    memberCount: 42,
    prompt: "What’s one thing that made today feel a little softer?",
    posts: [
      {
        id: "gp1",
        authorId: "u-leia",
        author: "Leia · week 24",
        body: "Third trimester naps hit different. Grateful for a quiet sofa hour.",
        reactions: 9,
        comments: [
          {
            id: "gc1",
            authorId: "u-sam",
            author: "Sam · week 28",
            body: "Same. Rest counts.",
            createdAt: "1h ago",
          },
        ],
      },
    ],
  },
  {
    id: "g-06",
    name: "0–6 months circle",
    description: "Newborns & early weeks",
    memberCount: 68,
    prompt: "What’s one thing that made today easier?",
  },
  {
    id: "g-618",
    name: "6–18 months circle",
    description: "Sitting, crawling, first foods",
    memberCount: 51,
    prompt: "What new tiny skill surprised you this week?",
    posts: [
      {
        id: "gp2",
        authorId: "u-noah",
        author: "Noah · 11 months",
        body: "First successful self-feed with a soft spoon. Floor was a crime scene.",
        reactions: 14,
        comments: [],
      },
    ],
  },
  {
    id: "g-tod",
    name: "Toddler / preschool",
    description: "Walking, talking, big feelings",
    memberCount: 37,
    prompt: "What boundary felt kind today?",
    posts: [
      {
        id: "gp3",
        authorId: "u-rim",
        author: "Rim · 2y",
        body: "We named the feeling and held the limit. Hard, but calmer than yesterday.",
        reactions: 11,
        comments: [],
      },
    ],
  },
  {
    id: "g-well",
    name: "Parent wellbeing",
    description: "Care for the caregiver",
    memberCount: 29,
    prompt: "What did you do for yourself in under five minutes?",
    posts: [] as Array<{
      id: string;
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
    }>,
  },
];

export const mockWellnessPacks = [
  {
    id: "wp1",
    title: "Daily Calm",
    stage: "general-parent",
    free: true,
    reviewerName: "Dr. Priya N., PT",
    reviewedOn: "2026-03-12",
    sourceName: "BumpAtlas Parent Wellness Library",
    actions: [
      {
        id: "wellness-breathing-reset",
        title: "Two-minute breathing reset",
        duration: "2 min",
      },
      {
        id: "wp1-a2",
        title: "Shoulder drop stretch",
        duration: "3 min",
      },
      {
        id: "wp1-a3",
        title: "Hydration pause",
        duration: "1 min",
      },
    ],
  },
  {
    id: "wp2",
    title: "Pregnancy Soft Stretch",
    stage: "pregnancy",
    free: true,
    reviewerName: "Dr. Elena R., CNM",
    reviewedOn: "2026-02-18",
    sourceName: "BumpAtlas Pregnancy Wellness",
    actions: [
      {
        id: "wp2-a1",
        title: "Side-lying rest cue",
        duration: "3 min",
      },
      {
        id: "wp2-a2",
        title: "Gentle hip circle",
        duration: "2 min",
      },
    ],
  },
  {
    id: "wp3",
    title: "Premium Evening Wind-down",
    stage: "general-parent",
    free: false,
    reviewerName: "Dr. Priya N., PT",
    reviewedOn: "2026-04-02",
    sourceName: "BumpAtlas Premium Wellness",
    actions: [
      {
        id: "wp3-a1",
        title: "Guided body scan",
        duration: "5 min",
      },
      {
        id: "wp3-a2",
        title: "Gratitude whisper",
        duration: "2 min",
      },
    ],
  },
];

export const mockOnThisDay = {
  yearsAgo: 0,
  daysAgo: 42,
  title: "First park stroll",
  body: "Slept through the whole walk. Soft breeze, soft light.",
  dateLabel: "Jun 17",
};

export const mockPostLimits = {
  postsUsed: 2,
  postsLimit: 10,
  commentsUsed: 7,
  commentsLimit: 50,
  accountAgeDays: 21,
  linksAllowed: true,
};
