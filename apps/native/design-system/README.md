# Native Design System — "Soft Atlas"

Visual foundation for **BumpAtlas**. Source of truth is the Claude Design
project `Bumpatlas.dc.html`; this document is its translation into RN tokens.

Pastel gradient canvas, white cards, honey accent, Poppins display over Inter body.

## Import surface

```ts
import {
  AppText, Atmosphere, Button, CardStack, Pill, Screen, Surface,
  colors, spacing, radius, shadows, useAppTheme,
} from "@/design-system";
```

## The four rules

1. **The canvas is a gradient, never a flat fill.** `Screen` renders it. Mint
   `#EEF5F1` → cream `#FCF1E7` → blush `#FDEAEE` on a 160° diagonal. Use
   `<Screen tone="soft">` for full-bleed auth/onboarding, default `cream`
   in-app. Only reach for `Screen background="..."` when a surface genuinely
   cannot host a gradient.
2. **Honey `#F4B942` is the only accent, and it is a fill.** Primary CTA,
   selected chip, active toggle, progress ring, send button. If you need the
   accent as *text on white*, use `theme.colors.brandText` (`honeyDeep`
   `#A9741A`) — raw honey on white is ~1.9:1 and fails contrast.
3. **There is no ink-filled button.** `theme.colors.primary` is honey with ink
   text in both light and dark. (This changed in this redesign — see below.)
4. **Poppins is display only, Inter is everything else.** `AppText` handles it:
   `hero`/`heading`/`title`/`subhead` → Poppins; `body`/`bodySmall`/`caption`/
   `label` → Inter. Never set `fontFamily` by hand.

## Palette

| Role | Token | Value |
|---|---|---|
| Canvas | `colors.gradient.canvas` | `#EEF5F1 → #FCF1E7 → #FDEAEE` |
| Card | `theme.colors.surface` | `#FFFFFF` |
| Ink / display type | `colors.brand.ink` | `#2B231F` |
| Accent fill | `colors.brand.honey` | `#F4B942` |
| Accent text | `colors.brand.honeyDeep` | `#A9741A` |
| Accent wash | `colors.brand.honeySoft` | `#FCEBC8` |
| Body copy | `theme.colors.textSecondary` | `#6A5A51` |
| Supporting line | `theme.colors.textTertiary` | `#8A7A72` |
| Timestamps / counts | `theme.colors.textMuted` | `#9A8C85` |
| Inactive tab, chevron | `theme.colors.textFaint` | `#C9BDB4` |
| Divider | `colors.border.subtle` | `#F1E9DE` |
| Destructive ("Sign out") | `theme.colors.danger` | `#C9736A` |
| Pastels (avatars, decks) | `colors.pastel.*` | petal / mint / lemon / sky |

Never introduce blues or purples as accents. Never hardcode hex in a feature
screen — add a token first.

## Shape & depth

Radii `md`16 (stat tiles) · `lg`18 (default card) · `xl`22 (hero media) ·
`sheet`24 (tab bar, sheets) · `full` (every pill, avatar, icon button).

Shadows are near-invisible by design — separation comes from white-on-wash, not
elevation. `shadows.soft` for chat bubbles and inputs, `shadows.card` for the
one hero card on a screen, `shadows.tabBar` for the floating bar. Anything
heavier stops looking like this app.

## Type scale

Measured off the 402pt iPhone frame in the source design, so these are device
points: hero 26 · heading 22 · title 18 · subhead 15 · body 14 · bodySmall 13 ·
caption 12 · label 11 (uppercase, +0.8 tracking). No negative tracking anywhere.

## Patterns

- **Screen header** — display title top-left with a one-line muted subtitle
  under it; circular white `IconButton`s top-right (bell, avatar).
- **Stat row** — three equal white `md`-radius tiles, emoji glyph, Poppins
  number, muted caption label.
- **Hero media card** — `xl` radius image with floating overlays: white status
  pill top-left, white/honey value pill bottom-right, display title bottom-left.
- **Filter row** — horizontal `Pill`s, white neutral + honey selected.
- **Segmented toggle** — white `sheet`-radius container, 6pt padding, honey
  `md`-radius fill on the active segment.
- **Timeline** — 2pt `#F1E9DE` rail, honey dot with a 3pt white ring, white
  card per entry.
- **Chat** — inbound white bubble with a squared top-left corner, outbound
  honey bubble with a squared top-right corner, both `lg`-radius elsewhere.
- **Settings list** — one white `lg`-radius card, rows split by `border.subtle`
  hairlines, faint chevrons.
- **Tab bar** — white, `sheet` radius on the top corners only, floats with 8pt
  side margin. Every scrollable tab screen needs
  `contentContainerStyle={{ paddingBottom: layout.tabBarScrollPadding }}`.

## Migration notes (from "Warm Nursery Light")

Three changes are behavioural, not cosmetic — check any screen you touch:

- **`primary` flipped from ink to honey, and `primaryText` from white to ink.**
  Any screen that hardcoded white text over a `primary` background is now white
  on honey. Use `theme.colors.primaryText`.
- **`radius.lg` 24→18 and `radius.xl` 32→22.** Tightly-nested rounded corners
  may need a pass.
- **The type scale came down** (hero 34→26, heading 28→22). Layouts that were
  sized around the old scale get roomier, not tighter.

`Atmosphere` no longer renders positioned "blob" views — it renders a real
`expo-linear-gradient`. Legacy tokens (`brand.peach*`, `brand.sage*`,
`transport.*`, `discovery.*`, `brand.butter`) still exist so old call sites
compile, but they resolve into the Soft Atlas palette. Prefer the named tokens.

## Rules

- Read `useAppTheme()` semantic colors; both schemes must look intentional.
- Tabs: Today, Journey, Connect, Guide, Family.
- Copy vocabulary: Capture, Care, Learn, Connect, Journey, soft weekly goals —
  never guilt streaks.
- Accessibility: labels on icon buttons, `accessibilityRole`, min 44pt targets.
