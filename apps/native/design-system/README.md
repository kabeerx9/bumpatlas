# Native Design System — "Warm Nursery Light"

Visual foundation for **BumpAtlas**. Butter canvas, white cards, ink pill CTAs,
honey selected states, pastel card-stack decks, floating bubble tab bar.

## Import Surface

```ts
import { AppText, Button, CardStack, Pill, Screen, Surface, colors, spacing, radius, useAppTheme } from "@/design-system";
```

## Palette

- Canvas `colors.surface.app` #F4EDDA (butter) — every screen background.
- Cards `colors.surface.card` white, radius `lg`(24) or `xl`(32), hairline border + `shadows.card`.
- CTAs: `Button variant="primary"` = ink pill, white text (honey pill w/ ink text in dark mode). Full-round always.
- Selected state (chips, toggles, active filter): honey `#F2C878` fill + ink text — `Pill tone="selected"`.
- Accent washes: `colors.brand.honeySoft`, pastels `colors.pastel.{petal,mint,lemon,sky}`.
- Never introduce blues/purples as accents. Never hardcode hex in feature screens — add to tokens first.

## Type

All Poppins. Display roles (hero/heading/title) render Poppins SemiBold via `AppText`
(weight="medium" for a softer look). No serif anywhere anymore.

## Signature elements (use with restraint — one per screen max)

1. **CardStack** — hero card resting on a fanned pastel deck. Use on each tab's single most
   important card (e.g. Today's capture hero, Guide's daily read). Not on list rows.
2. **Bubble tab bar** — already implemented in `app/(tabs)/_layout.tsx`. It floats: every
   scrollable tab screen needs `contentContainerStyle={{ paddingBottom: 120 }}`.

## Patterns

- Screen root: `Screen` (butter bg comes from theme). Big friendly greeting/heading top-left,
  circular `IconButton`s top-right (reference: bell + avatar).
- Filter rows: horizontal `Pill`s, white neutral + honey selected, counts inline ("All 34").
- Media cards: image top with radius, floating white time/count pill overlaid top-right,
  title + one-line supporting text below, optional ink circular play/action button.
- Empty states: pastel wash card + one plain sentence + one ink CTA. No sad emoji walls.
- Motion: subtle only; respect `useRespectReduceMotion` where it exists.

## Stock imagery (verified URLs — use `Image` with `uri`, add `?w=1200&q=80`)

- https://images.unsplash.com/photo-1522771930-78848d9293e8 — baby in teddy onesie (onboarding hero)
- https://images.unsplash.com/photo-1519689680058-324335c77eba — baby on pool float, playful
- https://images.unsplash.com/photo-1555252333-9f8e92e65df9 — newborn feet, soft white (auth)
- https://images.unsplash.com/photo-1544126592-807ade215a0b — sleeping newborn (memories)
- https://images.unsplash.com/photo-1546015720-b8b30df5aa27 — yawning baby + teddy (sleep/care)
- https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4 — toddler + toys flat-lay (journey)
- https://images.unsplash.com/photo-1492725764893-90b379c2b6e7 — parent lifting baby (connect)
- https://images.unsplash.com/photo-1476703993599-0035a21b17a9 — parent + two kids couch (family)
- https://images.unsplash.com/photo-1531983412531-1f49a365ffed — parent + child beach (wellness)
- https://images.unsplash.com/photo-1457342813143-a1ae27448a82 — pregnant silhouette (pregnancy)

## Rules

- Use `useAppTheme()` semantic colors; both light and dark must look intentional.
- Tabs: Today, Journey, Connect, Guide, Family.
- Copy vocabulary: Capture, Care, Learn, Connect, Journey, soft weekly goals — never guilt streaks.
- Keep accessibility: labels on icon buttons, `accessibilityRole`, min 44pt targets.
