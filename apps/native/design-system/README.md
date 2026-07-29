# Native Design System

Visual foundation for **BumpAtlas** — calm mist surfaces, charcoal type, sage accent.

## Import Surface

```ts
import { AppText, BrandWordmark, Button, Pill, Screen, Surface, colors, spacing } from "@/design-system";
```

## Rules

- Do not hardcode brand colors in feature screens. Add missing values to `tokens.ts` first.
- Use `useAppTheme()` for semantic runtime colors.
- Use `Screen` for page roots, `Surface` for cards/sheets, `AppText` for text, `Button`/`IconButton` for actions.
- Tabs: Today, Journey, Connect, Guide, Family.
- Copy vocabulary: Capture, Care, Learn, Connect, Journey, soft weekly goals — never guilt streaks.

## Core Primitives

- `AppText`, `BrandWordmark` (BumpAtlas), `Button`, `IconButton`, `Pill`, `Screen`, `Surface`

## Direction

Inspired by calm parenting apps (Tinybeans/FamilyAlbum memory clarity + Nara home simplicity). Avoid purple gradients, cream-terracotta clusters, and noisy dashboards.
