/** Static wellness-pack catalog copy — real content, no CMS endpoint yet. */
export const wellnessPacks = [
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
