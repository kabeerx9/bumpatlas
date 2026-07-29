import type { Href } from "expo-router";

export const appRoutes = {
  home: "/" as Href,
  journey: "/journey" as Href,
  connect: "/connect" as Href,
  connectPost: (id: string) => `/connect/post/${id}` as Href,
  connectReport: (postId: string) =>
    `/connect/report?postId=${encodeURIComponent(postId)}` as Href,
  connectBlocked: "/connect/blocked" as Href,
  connectGroups: "/connect/groups" as Href,
  connectCompose: (params?: { mode?: "prompt" | "reply"; postId?: string }) => {
    if (!params?.mode && !params?.postId) return "/connect-compose" as Href;
    const search = new URLSearchParams();
    if (params.mode) search.set("mode", params.mode);
    if (params.postId) search.set("postId", params.postId);
    const query = search.toString();
    return (query ? `/connect-compose?${query}` : "/connect-compose") as Href;
  },
  guide: "/guide" as Href,
  guideArticle: (id: string) => `/guide/${id}` as Href,
  family: "/family" as Href,
  capture: "/capture" as Href,
  care: "/care" as Href,
  wellnessPacks: "/wellness-packs" as Href,
  memory: (id: string) => `/memory/${id}` as Href,
  milestone: (id: string) => `/milestone/${id}` as Href,
  badges: "/badges" as Href,
  pregnancy: "/pregnancy" as Href,
  convertBirth: "/convert-birth" as Href,
  recap: (id?: string) => (id ? `/recap/${id}` : "/recap/latest") as Href,
  assistant: "/assistant" as Href,
  paywall: (source?: string) => {
    if (!source) return "/paywall" as Href;
    return `/paywall?source=${encodeURIComponent(source)}` as Href;
  },
  invite: "/invite" as Href,
  inviteAccept: (token: string) => `/invite/${token}` as Href,
  exportData: "/export-data" as Href,
  notificationSettings: "/notification-settings" as Href,
  memberRoles: "/member-roles" as Href,
  moderation: "/moderation" as Href,
  legal: (doc: "privacy" | "terms" | "community") => `/legal/${doc}` as Href,
  sessionExpired: "/session-expired" as Href,
  noAccess: "/no-access" as Href,
  account: "/account" as Href,
  stageSetup: "/stage-setup" as Href,
  expoUi: "/expo-ui" as Href,
  widgets: "/widgets" as Href,
  auth: {
    signIn: "/sign-in" as Href,
    signUp: "/sign-up" as Href,
  },
  onboarding: "/(onboarding)" as Href,
  ssoCallback: "/sso-callback" as Href,
};
