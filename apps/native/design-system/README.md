# Native Design System

This folder is the reusable visual foundation for `App Starter`. Values are taken from
`client/screens.html` and `client/developer-spec-v2.2.md`.

## Import Surface

Use the package barrel for product screens:

```ts
import { AppText, BrandWordmark, Button, Pill, Screen, Surface, colors, spacing } from "@/design-system";
```

## Rules

- Do not hardcode brand colors in feature screens. Add missing values to `tokens.ts` first.
- Use `useAppTheme()` for semantic runtime colors such as background, surface, text, border, and action colors.
- Use `Screen` for page roots, `Surface` for cards/sheets/panels, `AppText` for text, and `Button`/`IconButton` for actions.
- Feed, My Trip, and Profile are tabs. Navigation and Discovery are fullscreen overlays, not tab routes.
- Keep copy aligned with the product vocabulary: places, picks, hints, Go, Go now, vote.

## Mapping `screens.html` to Native

Treat each phone mock in `client/screens.html` as the actual React Native screen,
not as content to place inside an extra wrapper.

- The mock phone background maps to the screen background.
- Add `Surface` only when the mock visibly shows a card, sheet, panel, toast, modal, or raised block.
- If the mock content sits directly on the phone background, place native content directly on the screen.
- Preserve the mock's hierarchy first: background, safe area, header, body, actions, bottom nav or overlay.
- Use design-system primitives to reproduce the reference, not to reinterpret it.
- Keep existing app behavior wired underneath the visual structure, such as Clerk auth and navigation.

## Core Primitives

- `AppText`: type scale and tone control.
- `BrandWordmark`: reusable `App Starter` mark with mint GPS dot.
- `Button`: pill/circle actions for primary, purple, dark, ghost, and destructive actions.
- `IconButton`: fixed-size icon action wrapper with hit slop and press states.
- `Pill`: category, status, score, and filter chips.
- `Screen`: safe-area page root with product background and default padding.
- `Surface`: cards, sheets, and raised panels.

## Token Groups

- `colors`: brand, discovery, status, transport, surface, text, border.
- `spacing`: page padding, card padding, section gaps, tab height, status bar height.
- `radius`: cards, sheets, pills, and small controls.
- `typography`: font names, sizes, line heights, and weights.
- `shadows`: soft, card, purple, and mint elevations.
- `layout`: icon sizes, tab bar height, hit slop.
- `appThemes` and `useAppTheme`: semantic light/dark runtime colors. Light is the default fallback.
