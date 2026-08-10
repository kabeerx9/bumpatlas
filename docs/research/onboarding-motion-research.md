# Onboarding motion research

Research date: 2026-08-10

## Executive recommendation

BumpAtlas should treat onboarding as one calm, continuous scene rather than eight separate animated cards. Keep a small set of visual anchors mounted across the flow—the progress trail, the primary illustration, and the selected answer—and animate their state and position as the user advances. Replace only the question-specific content.

This gives the requested “morph into the next step” feeling while using motion to explain continuity: *the choice I just made is shaping the experience I am entering*. It also fits the current implementation, which already renders all onboarding steps inside one route and switches them by `stepIndex`.

The first prototype should use stable Reanimated layout, entering, and exiting animations. It should **not** depend on Reanimated shared-element transitions: the current 4.x documentation still labels that feature experimental and not recommended for production. [Reanimated: shared-element transitions](https://docs.swmansion.com/react-native-reanimated/docs/category/shared-element-transitions/)

The key product constraint is more important than the animation technique: motion must shorten the perceived journey and reinforce cause-and-effect. If it turns the current setup into a longer presentation, it works against the purpose of onboarding.

## What the platform guidance actually supports

### Keep setup brief; teach in context

Apple recommends that onboarding be fast, enjoyable, and optional where possible. It favors learning by performing a task, contextual tips near the relevant interface, sensible defaults, and postponing nonessential setup. That argues against a feature-tour carousel and for letting the user build their real household/profile as the onboarding experience. [Apple HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)

For BumpAtlas, age attestation, legal consent, and the minimum profile needed to determine pregnancy/child stage are genuine prerequisites. Household naming, notification customization, and partner invitation are more plausible candidates for progressive disclosure or “do this later,” subject to product/legal review.

Motion should communicate relationships between states. Android’s transition guidance explicitly describes shared/common-element movement as a way to create a visual connection between states, while Google’s broader motion guidance frames motion as a tool for focus and continuity. [Android: activity transitions](https://developer.android.com/develop/ui/views/animations/transitions/start-activity), [Google Design: Making Motion Meaningful](https://design.google/library/making-motion-meaningful)

### Preserve continuity instead of decorating every element

A useful transition hierarchy for this flow is:

1. **Persistent anchors morph:** progress trail, illustration, selected card, and background atmosphere adjust position, scale, color, or shape.
2. **Question content changes:** outgoing text and fields exit; incoming content enters.
3. **Feedback confirms the action:** the chosen card settles/checks before the screen advances.

This is a design inference from Apple’s context-preservation guidance and Material’s transition patterns, not a claim that either platform mandates this exact choreography. Material names container transform, shared axis, fade-through, and fade as distinct patterns; the relevant idea is to choose a pattern based on the relationship between states rather than use one transition everywhere. [Apple HIG: Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles), [Material 3: Transition patterns](https://m3.material.io/styles/motion/transitions/transition-patterns)

### Accessibility is part of the motion system

Apple says Reduce Motion should reduce automatic and repetitive movement, tighten bouncy springs, avoid depth/blur transitions, and replace x/y/z movement with fades. [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

React Native exposes both live `reduceMotionChanged` updates and `isReduceMotionEnabled()`, plus an iOS `prefersCrossFadeTransitions()` query. [React Native: AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo)

Reanimated 4 supports `ReduceMotion.System` on timing, spring, entering/exiting, and layout animations. With reduced motion enabled, layout/entering animations reach their endpoint immediately while exiting/shared transitions are omitted; `useReducedMotion` can be used to deliberately substitute a restrained crossfade. [Reanimated: Accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)

The reduced-motion version should preserve the same state changes and confirmation, using an immediate swap or short opacity crossfade. It should remove translation, parallax, scale, rotation, blur, and elastic/bouncy springs. No required meaning should exist only in the animation.

## A BumpAtlas-specific concept to prototype

### “The atlas grows with your answers”

Use a persistent, soft illustrated landscape/map as the visual spine. It should feel like a living composition, not a literal map UI:

- **Welcome:** a warm horizon/portrait establishes the emotional tone.
- **Privacy:** the scene gently folds into a protected card/envelope shape; the motion reinforces containment rather than surveillance.
- **Role:** three paths appear. Selecting expecting, parent, or caregiver highlights one path and changes the following scene.
- **Household:** the selected path becomes a home/household marker. The optional name appears on that marker as it is typed.
- **Profile:** the marker evolves into a due-date milestone or child profile—not a new unrelated illustration.
- **Goal:** the same scene reveals four destinations. The chosen goal becomes the first highlighted destination on Today.
- **Notifications:** a small sun/moon or bell state joins the existing scene; avoid a dramatic permission animation before the OS prompt.
- **Invite/completion:** a second path can join the household. The final transition should land on the real Today screen composition so onboarding has an experiential payoff.

This concept deliberately uses morphing as information architecture: one stable world accumulates the user’s choices. It avoids making sensitive family details feel like a quiz and gives the flow a recognizable visual identity.

### Choreography hypothesis

These are prototype starting points, not evidence-backed constants:

- On Next, confirm the current selection first, then transition; do not move before the tap feels acknowledged.
- Keep most state transitions roughly in the 180–320 ms range. Use one restrained spring family and one easing family rather than tuning every step independently.
- Animate the main anchor and at most a few supporting elements. Staggered motion should be subtle; the CTA must remain immediately usable.
- Forward transitions can imply progression; Back should reverse the spatial logic and restore the exact prior values.
- Let typing, date selection, and OS permission dialogs interrupt animation safely. Never delay focus or block input while decorative motion finishes.
- Treat completion as the strongest moment, but keep it brief and route directly into a useful personalized Today state.

### Progressive-disclosure questions worth testing before visual polish

The current flow contains eight stages: welcome, privacy, role, household, profile, goal, notifications, and invite. Before animating all eight, test whether the sequence itself is right:

- Could welcome and age attestation be a compact opening state rather than a full “step 1 of 8”?
- Is optional household naming worth asking before the user has seen value?
- Could notification categories move to settings while onboarding asks for only the one notification with the clearest immediate benefit?
- Could partner invitation appear after a first saved memory, when the benefit of sharing is concrete?
- The caregiver branch says the user is joining an existing household, but the current final step asks them to invite a partner. That branch likely needs a different destination before animation work begins.

These are product hypotheses. Legal consent requirements and the actual invite/account model need confirmation before steps are removed or reordered.

## Implementation feasibility and tradeoffs

BumpAtlas currently uses Expo 57, React Native 0.86, and Reanimated 4.5. The safest production approach is to keep the onboarding in one mounted screen and animate ordinary layout/visual properties with Reanimated:

- Reanimated layout animations support size/position changes plus entering and exiting transitions. Its documentation recommends starting with presets because custom animations are harder to understand and maintain. [Reanimated: Layout animations](https://docs.swmansion.com/react-native-reanimated/docs/category/layout-animations/), [Reanimated: Layout transitions](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions/)
- Prefer transforms, opacity, and background color over repeatedly animating layout-affecting properties. Reanimated specifically calls non-layout properties the more performant path and warns against too many simultaneous animated components. [Reanimated: Performance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- Measure on release builds and low-end Android hardware. Reanimated notes that release-mode compiler optimization can make performance materially better than debug-mode results, while the New Architecture has specific performance caveats. [Reanimated: Performance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/)
- Expo Router’s native Stack provides platform-default route motion, but route-level animation is not needed for each onboarding question. Keeping questions inside one route gives tighter continuity and preserves form state. [Expo Router: Stack](https://docs.expo.dev/router/advanced/stack/)
- Expo’s iOS zoom/shared transition is iOS-version-specific, so it is an optional platform enhancement rather than a cross-platform foundation. [Expo Router: Zoom transition](https://docs.expo.dev/router/advanced/zoom-transition/)

If the illustration needs character-like state machines or designer-owned interactive art, Rive is worth a later spike. It enables fast art iteration, but adds a runtime, asset pipeline, and specialist workflow. Hero’s first-party case study is a useful example of a small team using Rive to iterate on onboarding; it is vendor evidence, not an independent performance study. [Rive: Hero onboarding case study](https://rive.app/blog/hero-builds-first-daily-super-app-with-rive)

For a first prototype, Reanimated plus existing React Native views/SVG is the lower-risk choice. It can prove the interaction concept before introducing a second motion runtime.

## Measurement plan

Do not judge the redesign by whether the animation looks polished or even by onboarding completion alone. A prettier flow can increase completion while delaying meaningful product use.

Define one downstream activation event first. For BumpAtlas, candidates are:

- first real memory saved;
- first Today action completed;
- partner invite successfully redeemed (for multi-caregiver households);
- return on day 1 or day 7 after setup.

Then instrument the funnel:

- `onboarding_started`
- `onboarding_step_viewed` with a non-sensitive step identifier
- `onboarding_step_completed`
- `onboarding_back_used`
- `onboarding_optional_step_skipped`
- `onboarding_validation_error`
- `onboarding_permission_result`
- `onboarding_completed`
- the chosen downstream activation event

GA4 defines `tutorial_begin` and `tutorial_complete` as recommended events. Funnel exploration can expose step drop-off, while path exploration can expose backtracking and loops. [GA4: Recommended events](https://support.google.com/analytics/answer/9267735?hl=en), [GA4: Funnel exploration](https://support.google.com/analytics/answer/9327974?hl=en), [GA4: Path exploration](https://support.google.com/analytics/answer/9317498?hl=en)

**Privacy danger domain:** never attach child name, date of birth, due date, household name, free text, or other family/health information to analytics events. Step IDs, branch IDs, timings, error categories, and experiment assignments should be enough to diagnose the funnel. Confirm consent and retention requirements before adding any event collection.

Compare one behavioral hypothesis at a time, for example:

1. current flow vs. continuous-scene motion, holding content/order constant;
2. continuous scene vs. a shorter progressively disclosed sequence;
3. notification request before vs. after first value moment.

Firebase Remote Config A/B Testing supports persistent variant assignment and business objectives such as retention. Firebase recommends validating on test devices, collecting enough sample, and not changing behavior mid-experiment; its guidance commonly suggests running Remote Config experiments for at least two weeks. [Firebase: Create Remote Config experiments](https://firebase.google.com/docs/ab-testing/abtest-config), [Firebase: Experiment concepts](https://firebase.google.com/docs/ab-testing/ab-concepts)

Use completion rate as the primary flow metric only if downstream activation and retention remain guardrails. Also track median completion time, per-step exits, validation failures, OS notification opt-in, crash-free sessions, and animation/frame performance.

## Concrete visual references

These are inspiration, not proof that the same design will convert for BumpAtlas:

- [Fabulous: Motivating App Engagement](https://design.google/library/engagement-is-fabulous-health-app) — the closest tonal reference: a wellness product using a persistent sun/sky journey, brisk transitions, storytelling, and small commitments. The Google Design case study says the team iterated the onboarding for months.
- [Robinhood: Investing in Material](https://design.google/library/robinhood-investing-material) — an older but canonical example of using streamlined animated transitions and imagery to orient users through a complex product.
- [Google Design: Making Motion Meaningful](https://design.google/library/making-motion-meaningful) — short examples of cards expanding, shared elements moving, and focal points being handed between states.
- [Headspace onboarding flow on Page Flows](https://pageflows.com/post/desktop-web/onboarding/headspace/) — useful for studying calm tone, progressive personalization, and the handoff from questions to first experience. This is a visual archive, not first-party guidance, and much of it is gated.
- [Duolingo success/onboarding screen on Mobbin](https://mobbin.collaboo.co/explore/screens/b2f67911-aff3-46eb-a7b5-e2055efb1772) — useful narrowly for acknowledgement, celebration, and clear completion feedback; BumpAtlas should borrow the clarity, not the high-energy personality.
- [Flo: Getting started for pregnant users](https://help.flo.health/hc/en-us/articles/4407228824340-Getting-started-for-pregnant-users) — first-party reference for pregnancy-stage branching and explaining why due-date information creates immediate personalized value.
- [Rive onboarding use cases](https://rive.app/use-cases) — a gallery of interactive illustration patterns if the concept later needs a designer-authored state machine. Treat as tool inspiration, not product guidance.

## Suggested next design artifact

Before implementation, make a motion storyboard with five frames for every transition:

1. settled current state;
2. tap/selection acknowledgement;
3. outgoing content;
4. anchor morph at midpoint;
5. settled next state with accessibility focus target.

Prototype only three connected steps first: **role → profile → goal**. They provide the strongest semantic continuity and exercise branching, layout changes, forms, Back behavior, keyboard interruption, and reduced motion. If that sequence feels coherent on a physical low-end Android device and an iPhone with Reduce Motion enabled, extend the system to the legal, notification, and invite states.
