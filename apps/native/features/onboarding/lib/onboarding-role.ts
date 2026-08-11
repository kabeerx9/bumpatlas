export const CREATOR_ONBOARDING_ROLES = ["expecting", "parent"] as const;

export type OnboardingRole = (typeof CREATOR_ONBOARDING_ROLES)[number];
