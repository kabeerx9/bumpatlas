export const appRoutes = {
  home: "/",
  journey: "/journey",
  connect: "/connect",
  connectPost: (id: string) => `/connect/post/${id}`,
  connectReport: (postId: string) =>
    `/connect/report?postId=${encodeURIComponent(postId)}`,
  connectBlocked: "/connect/blocked",
  connectGroups: "/connect/groups",
  connectCompose: (params?: { mode?: "prompt" | "reply"; postId?: string }) => {
    if (!params?.mode && !params?.postId) return "/connect-compose";
    const search = new URLSearchParams();
    if (params.mode) search.set("mode", params.mode);
    if (params.postId) search.set("postId", params.postId);
    const query = search.toString();
    return query ? `/connect-compose?${query}` : "/connect-compose";
  },
  guide: "/guide",
  guideArticle: (id: string) => `/guide/${id}`,
  family: "/family",
  capture: "/capture",
  care: "/care",
  wellnessPacks: "/wellness-packs",
  memory: (id: string) => `/memory/${id}`,
  milestone: (id: string) => `/milestone/${id}`,
  badges: "/badges",
  pregnancy: "/pregnancy",
  convertBirth: "/convert-birth",
  recap: (id?: string) => (id ? `/recap/${id}` : "/recap/latest"),
  assistant: "/assistant",
  paywall: (source?: string) => {
    if (!source) return "/paywall";
    return `/paywall?source=${encodeURIComponent(source)}`;
  },
  invite: "/invite",
  inviteAccept: (token: string) => `/invite/${token}`,
  exportData: "/export-data",
  notificationSettings: "/notification-settings",
  memberRoles: "/member-roles",
  moderation: "/moderation",
  legal: (doc: "privacy" | "terms" | "community") => `/legal/${doc}`,
  sessionExpired: "/session-expired",
  noAccess: "/no-access",
  account: "/account",
  expoUi: "/expo-ui",
  widgets: "/widgets",
  auth: {
    signIn: "/sign-in",
    signUp: "/sign-up",
  },
  onboarding: "/(onboarding)",
  ssoCallback: "/sso-callback",
} as const;
