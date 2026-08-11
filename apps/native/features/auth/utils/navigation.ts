import type { Href } from "expo-router";

type NavigationRouter = {
  push: (href: Href) => void;
};

type ReturnToParam = string | string[] | undefined;

const INVITE_RETURN_TO = /^\/invite\/[A-Za-z0-9_-]+$/;

/** Least-privilege post-auth redirect: only the inbound invite gateway survives. */
export function resolveAuthReturnTo(value: ReturnToParam): Href {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && INVITE_RETURN_TO.test(candidate) ? (candidate as Href) : ("/" as Href);
}

export function pushDecoratedUrl(
  router: NavigationRouter,
  decorateUrl: (url: string) => string,
  href: Href,
) {
  const path = typeof href === "string" ? href : "/";
  const url = decorateUrl(path);
  const decorated = url.startsWith("http") ? new URL(url) : null;
  const nextHref = decorated
    ? `${decorated.pathname}${decorated.search}${decorated.hash}`
    : url;
  router.push(nextHref as Href);
}
