/** Notification preference category copy + the key union both onboarding and settings share. */
export type NotificationPrefKey =
  | "dailyPrompt"
  | "wellnessReminder"
  | "partnerActivity"
  | "weeklyRecap"
  | "communityReply"
  | "subscription";

export const notificationCategories: Array<{
  id: NotificationPrefKey;
  label: string;
  description: string;
  defaultOn: boolean;
}> = [
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
