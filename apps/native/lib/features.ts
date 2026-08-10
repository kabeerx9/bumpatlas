/**
 * Native app feature flags.
 *
 * The server has no object storage yet, so any photo upload 503s. Flipping
 * `photos` back to true re-enables the add-photo affordance in capture and
 * the photo upload path in save-memory — nothing else needs to change.
 */
export const FEATURES = {
  photos: false,
  /** Keep the real onboarding UI on-screen for local design and motion work. */
  onboardingPreview: true,
} as const;
