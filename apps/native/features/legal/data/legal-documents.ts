/** Static legal copy (privacy policy, terms, community rules) — real content, no CMS endpoint yet. */
export const legalDocuments = {
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

export type LegalDocId = keyof typeof legalDocuments;
