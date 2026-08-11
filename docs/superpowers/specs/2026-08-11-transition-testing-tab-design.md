# Transition Testing Tab Design

## Purpose

Add an always-visible `Testing` tab immediately after `Family` so the shared-element sheet interaction can be developed and judged in isolation from product screens.

## Navigation

The Expo Router tab group gains a sixth route, `testing`. The custom tab bar renders it after `family` with a Feather expansion-style icon and the label `Testing`. This is deliberately not behind a feature flag.

## Screen

The screen follows the existing `SoftScreen` atmosphere and design tokens. It contains:

- A short explanation that this is a motion playground.
- One card using the existing local expecting/ultrasound keepsake asset.
- An `Open sheet` button.

No network request, persistence, or user data is involved.

## Transition architecture

Use a production-style measured overlay rather than Reanimated's experimental shared-element API.

1. Measure the source image in window coordinates when the user opens the sheet.
2. Mount the backdrop and bottom sheet in the same React Native view hierarchy.
3. Render a temporary absolute `Animated.Image` over both surfaces at the source frame.
4. Animate the overlay into the sheet's wide header frame while the backdrop and sheet content fade/translate in.
5. Reveal the destination image when the transition settles and hide the overlay.
6. On close, hide the destination, remount the overlay at the destination frame, and reverse it to the source before unmounting the sheet.

The overlay owns position, width, height, border radius, and shadow during the handoff. The source and destination images use the same asset and `cover` crop.

## Interaction and accessibility

- Tapping the backdrop or close button dismisses the sheet.
- While open, the backdrop blocks interaction with the underlying screen.
- The close control has an explicit accessibility label and a minimum 44-point target.
- Reduce Motion replaces the spatial morph with a short opacity transition.
- A transition lock prevents repeated taps from starting overlapping animations.

## Failure handling

If source measurement is unavailable, open the sheet with the reduced-motion fade path instead of failing silently or leaving a partial overlay.

## Verification

- A pure geometry helper is tested for source-to-destination interpolation and clamping.
- Native type-check passes.
- iOS Simulator verifies open, settled, backdrop close, close-button close, and repeated taps.
- The tab bar remains usable with six destinations on the iPhone simulator.

## Exclusions

- No experimental `sharedTransitionTag` feature flag.
- No third-party bottom-sheet dependency.
- No production feature integration yet.
- No API, storage, analytics, or backend changes.
