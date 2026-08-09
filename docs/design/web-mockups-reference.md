# BumpAtlas web mockups — implementation reference

Source: claude.ai/design project "UI mockups for BumpAtlas web app"
(7cff25a7-346f-420a-9e53-950d7f23c4fc, `BumpAtlas UI Mockups.dc.html`), imported 2026-08-09.
This file is the distilled token/spec sheet; the raw mockup HTML lives next to it.

## Product palette (landing, auth, dashboard, account, not-found)

- Page background: `#FAFAF6`
- Ink: `#1F2420` · secondary text: `#4B4F45` · muted: `#6E7268`
- Borders: `#E1E4DC` · chip bg: `#EFF1EC`
- Primary (CTAs): `oklch(58% 0.09 150)` (sage green), white text
- Link: `oklch(45% 0.1 150)`, hover `oklch(38% 0.1 150)`
- Soft icon bg: `oklch(94% 0.03 150)` · selection: `oklch(90% 0.04 150)`
- Cards: white, 1px `#E1E4DC` border, radius 14–16px, shadow `0 1px 2px rgba(42,32,19,.04)`
- Buttons radius 9–10px

## Admin palette (deliberately cooler/denser)

- Ink `#0B1220` · secondary `#5B6472` / `#6B7280`
- Borders `#DEE2E8` · segmented bg `#F4F6F8`
- Primary/bars: `#14304F` (navy) · secondary chart series `#B8C2CE`
- Radii tighter: 8–10px · shadow `0 1px 2px rgba(15,23,42,.04)`

## Danger zone (account)

- Panel bg `#F6E9DD`, border `#E0C3A9`, heading `#7A3C1E`, body `#8A5A3B`
- Inline type-DELETE confirm (not a modal); delete button `#B5502E`, 50% opacity until "DELETE" typed

## Type

- Headings: Poppins 500–700 (hero 44px/1.15 w600; section 24–26px)
- Body/UI: Inter 400–600 (body 14–14.5px/1.6)
- Google Fonts: Poppins 500/600/700 + Inter 400/500/600

## Clerk appearance

colorPrimary `oklch(58% 0.09 150)` · colorBackground `#FFFFFF` · borderRadius 9px ·
fontFamily Inter (Poppins for headings if supported)

## Per-screen notes

1. **Landing**: signed-out header (text "Sign in" + filled "Get started"); hero headline
   "One meaningful moment. One small step for yourself." + promise subline; decorative
   sage circle blob at 7% opacity behind hero; two CTAs; 3 feature cards (Memory journal,
   Gentle daily challenges, Private stage groups) with inline-SVG line icons in soft-sage
   squares; footer "BumpAtlas · A calmer way to keep the moments that matter."
2. **Auth**: centered Clerk widget, wordmark above; auth-loading spinner in the card's place.
3. **Dashboard**: "Welcome back, {name}" + email; "Your household" card (no-household copy
   + "Set up in the app" CTA); "Get the app" card with App Store / Google Play chips;
   "Admin dashboard →" link only for admins.
4. **Account**: display-name row (input + sage Save), email row + "managed by Clerk" chip,
   danger zone per above.
5. **Admin**: "Reports" + human date-range line; 30d/90d segmented (active = navy fill);
   5 stat cards (Active users card holds a 1d/7d/30d triple); invites sent/redeemed pair;
   two charts — signups (navy bars) and engagement (stacked navy + `#B8C2CE`, legend
   top-right); 3 date ticks (first/mid/last) under each chart; loading = skeleton blocks;
   all-zeros = "No activity yet — numbers appear as families join" centered in chart area.
6. **Not found**: small "404" eyebrow, "This page doesn't exist", "Back to dashboard" CTA,
   full shell; identical for non-admins hitting /admin.
