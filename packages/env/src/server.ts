import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Environment values arrive as strings, so booleans and numbers are parsed here
 * rather than at each call site. Adding a variable takes two edits — this schema
 * and `apps/server/.env.example` — and missing either produces a confusing
 * runtime failure.
 */
const boolFromString = (defaultValue: boolean) =>
  z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");

const intWithDefault = (defaultValue: number) =>
  z.coerce.number().int().positive().default(defaultValue);

/** UTC wall-clock time, `HH:MM`. Used for moderation coverage windows. */
const utcTimeOfDay = (defaultValue: string) =>
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM in UTC")
    .default(defaultValue);

/**
 * Per-country feature overrides, e.g. `{"IN":{"FEATURE_COMMUNITY":false}}`.
 *
 * An override may only *disable* a feature — the feature-flag service never lets
 * a country value switch on something that is globally off. Malformed JSON fails
 * startup rather than silently disabling nothing.
 */
const countryFeatureOverridesSchema = z.record(
  z.string().length(2),
  z.record(z.string(), z.boolean()),
);

export const env = createEnv({
  server: {
    // --- Core (present since the starter) ---
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    /**
     * Postgres schema for generated queries. Unset means `public`.
     *
     * Integration tests set this to `bumpatlas_test` so they can truncate freely
     * inside one database without touching development data.
     */
    DATABASE_SCHEMA: z.string().min(1).optional(),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // --- Phase 1 ---
    APP_BASE_URL: z.url().default("http://localhost:3000"),
    WEB_BASE_URL: z.url().default("http://localhost:3001"),
    /** Comma-separated Clerk user IDs. Parsed to a trimmed, deduplicated list. */
    ADMIN_USER_IDS: z
      .string()
      .default("")
      .transform((value) => [
        ...new Set(
          value
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
        ),
      ]),
    CRON_SECRET: z.string().min(1),
    COUNTRY_FEATURE_OVERRIDES_JSON: z
      .string()
      .default("{}")
      .transform((value, ctx) => {
        try {
          return countryFeatureOverridesSchema.parse(JSON.parse(value));
        } catch {
          ctx.addIssue({
            code: "custom",
            message: "Must be JSON of shape {\"XX\":{\"FLAG\":boolean}}",
          });
          return z.NEVER;
        }
      }),
    MODERATION_COVERAGE_START_UTC: utcTimeOfDay("06:00"),
    MODERATION_COVERAGE_END_UTC: utcTimeOfDay("23:00"),
    COMMUNITY_24H_COVERAGE: boolFromString(false),

    // --- Media phase (optional until Phase 2 wires storage) ---
    OBJECT_STORAGE_ENDPOINT: z.string().min(1).optional(),
    OBJECT_STORAGE_REGION: z.string().min(1).default("auto"),
    OBJECT_STORAGE_BUCKET: z.string().min(1).optional(),
    OBJECT_STORAGE_ACCESS_KEY_ID: z.string().min(1).optional(),
    OBJECT_STORAGE_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    OBJECT_STORAGE_PUBLIC_HOST: z.string().min(1).optional(),

    // --- Billing phase ---
    REVENUECAT_WEBHOOK_SECRET: z.string().min(1).optional(),
    REVENUECAT_PROJECT_ID: z.string().min(1).optional(),

    // --- AI phase ---
    AI_PROVIDER_API_KEY: z.string().min(1).optional(),
    AI_MODEL: z.string().min(1).optional(),
    AI_ENABLED: boolFromString(false),

    // --- Feature flags ---
    FEATURE_COMMUNITY: boolFromString(true),
    FEATURE_AI: boolFromString(false),
    FEATURE_PREGNANCY_EXERCISE: boolFromString(true),
    COMMUNITY_POSTING_ENABLED: boolFromString(true),
    /** Member-created groups. Stays off until their moderation coverage is real. */
    FEATURE_USER_GROUPS: boolFromString(false),

    /**
     * Give every newly provisioned user a populated demo household on their first
     * authenticated request, so a fresh sign-in lands on a filled-in app instead of
     * empty-state screens.
     *
     * Development affordance only. Defaults off, and the service refuses to run when
     * NODE_ENV is production regardless of this value — a flag flipped by accident in a
     * real environment would write fake children and memories into real accounts.
     */
    DEMO_SEED_NEW_USERS: boolFromString(false),

    // --- Numeric limits (env so launch tuning needs no code deploy) ---
    FREE_MEDIA_UPLOADS_PER_MONTH: intWithDefault(100),
    PREMIUM_MEDIA_UPLOADS_PER_MONTH: intWithDefault(1000),
    /** At least 2 so twins or a second sibling never hit a paywall at birth. */
    FREE_CHILDREN_LIMIT: intWithDefault(2),
    FREE_FAMILY_SEATS: intWithDefault(2),
    PREMIUM_FAMILY_SEATS: intWithDefault(6),
    FREE_AI_MESSAGES_PER_DAY: intWithDefault(5),
    PREMIUM_AI_MESSAGES_PER_DAY: intWithDefault(30),
    AI_MESSAGES_PER_HOUR: intWithDefault(20),
    COMMUNITY_POSTS_PER_DAY: intWithDefault(10),
    COMMUNITY_COMMENTS_PER_DAY: intWithDefault(50),
    COMMUNITY_NEW_ACCOUNT_LINK_DAYS: intWithDefault(14),
    USER_GROUPS_CREATED_LIMIT_FREE: intWithDefault(1),
    USER_GROUPS_CREATED_LIMIT_PREMIUM: intWithDefault(5),
    USER_GROUP_MEMBER_LIMIT: intWithDefault(50),
    USER_GROUP_JOINED_LIMIT: intWithDefault(10),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
