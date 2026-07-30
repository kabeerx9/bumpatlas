import { env } from "@bumpatlas/env/server";
import type { FastifyRequest } from "fastify";

export type FeatureKey =
  | "FEATURE_COMMUNITY"
  | "FEATURE_AI"
  | "FEATURE_PREGNANCY_EXERCISE"
  | "COMMUNITY_POSTING_ENABLED"
  | "FEATURE_USER_GROUPS";

/**
 * Country headers set by the hosting layer, not by the client. A request that
 * reaches the app with one of these already set has passed through the proxy that
 * writes it.
 */
const TRUSTED_COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "fly-client-country",
  "x-appengine-country",
] as const;

export function resolveRequestCountry(request: FastifyRequest): string | null {
  for (const header of TRUSTED_COUNTRY_HEADERS) {
    const raw = request.headers[header];
    const value = Array.isArray(raw) ? raw[0] : raw;

    if (value && /^[A-Za-z]{2}$/.test(value)) {
      return value.toUpperCase();
    }
  }

  return null;
}

/**
 * The override asymmetry, isolated so it can be tested without rebuilding env.
 *
 * A country override may only turn a feature **off**. If it could turn one on, a
 * single bad config line would enable unmoderated community or unreviewed AI
 * content in a jurisdiction where it was deliberately disabled — the exact failure
 * a kill switch exists to prevent.
 */
export function applyCountryOverride(
  globallyEnabled: boolean,
  override: boolean | undefined,
): boolean {
  if (!globallyEnabled) return false;
  return override === false ? false : true;
}

export function isFeatureEnabled(key: FeatureKey, country?: string | null): boolean {
  const override = country
    ? env.COUNTRY_FEATURE_OVERRIDES_JSON[country.toUpperCase()]?.[key]
    : undefined;

  return applyCountryOverride(env[key], override);
}

export function isFeatureEnabledForRequest(key: FeatureKey, request: FastifyRequest): boolean {
  return isFeatureEnabled(key, resolveRequestCountry(request));
}
