/**
 * Static pregnancy educational copy (weekly tip, week cards, checklist,
 * bump-journal prompt, mood options). This is real, reviewed app content —
 * not a mock of an API — it just has no CMS-backed endpoint yet. The due
 * date itself is real user data and comes from `useStageQuery`/`useFamilyQuery`,
 * not from here.
 */
export const pregnancyContent = {
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
    },
    {
      id: "c2",
      category: "Hospital bag",
      title: "Phone charger & snacks",
    },
    {
      id: "c3",
      category: "Hospital bag",
      title: "Baby's first outfit & blanket",
    },
    {
      id: "c4",
      category: "Questions for clinician",
      title: "Birth preferences & pain options",
    },
    {
      id: "c5",
      category: "Questions for clinician",
      title: "When to call between visits",
    },
    {
      id: "c6",
      category: "Nesting",
      title: "Car seat installed & checked",
    },
  ],
};
