# Assistant (Phase 7)

Off by default. `AI_ENABLED=false` **and** `FEATURE_AI=false`; both must be true for
`POST /api/v1/ai/chat` to do anything other than return `503 FEATURE_UNAVAILABLE`.

## Why it cannot be enabled yet

Two independent blockers, both deliberate:

1. **No reviewed content exists to cite.** Retrieval reads only published `ContentItem`
   rows, and the pipeline refuses when it finds none. With today's seed inventory
   (0 published AI snippets, 0 tips, 0 pregnancy cards) every factual question refuses.
   That is the correct behaviour, not a bug — see `pnpm --filter @bumpatlas/db seed:validate`.
2. **The safety eval has not been run against a real provider.** The gate is ≥95% correct
   escalation/refusal on the critical set. `pnpm --filter server ai:eval` runs the case
   file against the deterministic classifier; it does **not** yet test a provider's
   generated output, because no provider is configured.

## What crosses the provider boundary

Only these, assembled in `chat.ts`:

- the system prompt (server-side, never client-supplied)
- the user's message text
- retrieved snippets from reviewed published content
- a stage key such as `P_T2` or `NB_0_3M`

Never: memories, memory history, community posts, another family's anything, photos, exact
dates of birth, child names, member emails, or subscription identifiers.

## Vendor settings to record before enabling

Fill these in when a provider is chosen. Leaving them blank is a release blocker, because
"we assumed retention was off" is not a defensible answer to a parent.

| Setting | Required value | Actual value | Verified on | By |
|---|---|---|---|---|
| Provider and model | — | _not configured_ | — | — |
| Training on inputs/outputs | Off | _not configured_ | — | — |
| Data retention | Zero, or the shortest available | _not configured_ | — | — |
| Region / data residency | — | _not configured_ | — | — |
| Sub-processor listed in privacy policy | Yes | No | — | — |

## Pipeline order, and why

1. Flag check.
2. **Classify before reserving quota** — someone describing self-harm must never be told
   they have run out of messages.
3. Critical categories return fixed text without contacting a provider at all.
4. Reserve quota (conditional atomic UPDATE).
5. Retrieve reviewed sources; refuse if none.
6. Call the provider.
7. Post-check the output for doses, diagnoses, and normality claims.
8. Store with citations and a safety label.
9. Release the reservation on provider failure, so an outage does not consume a parent's
   daily allowance.

## Quota

- Daily, per **family**: `FREE_AI_MESSAGES_PER_DAY` / `PREMIUM_AI_MESSAGES_PER_DAY`
- Hourly, per **user**: `AI_MESSAGES_PER_HOUR` — applies to premium too, since it exists to
  stop one member burning the household's day in a minute.

## Retention

Assistant messages are purged after 30 days by `/api/cron/purge-expired`. Messages the user
has **reported** are retained as moderation evidence.
