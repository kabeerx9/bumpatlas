# Living Memory Album Onboarding Design

**Status:** Proposed for implementation

**Scope:** Redesign the existing native onboarding presentation and transitions. Preserve its server contracts and final-submission semantics.

## Outcome

Onboarding should feel like the user is assembling the first page of their family’s story. Answers do not disappear into a form: they become persistent keepsake objects, gain meaning, and settle into a Today-shaped completion state.

The experience targets adult caregivers. It should feel intimate, calm, tactile, and premium—not like a children’s game. Motion explains causality and continuity rather than adding spectacle.

The physical metaphor changes continuously as the story gains detail. Early steps use a recognizable two-page album spread. After the profile step, the active right-hand page detaches from the binding and becomes a loose editorial sheet for the remaining steps. The detached sheet is the same page, not a new container.

## Success criteria

- A user can identify the same primary object before, during, and after each transition.
- Every onboarding step fits within the available height of the supported phone viewport without page-level scrolling.
- Role, household, profile, goal, and invite choices have visible consequences in the album.
- Forward and Back transitions preserve entered values and reverse coherently.
- The preview flag permits the entire flow, including its completion composition, to be inspected repeatedly with no backend writes or notification prompts.
- The real flow performs household/profile/consent/preference mutations and push registration only from final submission.
- Reduced Motion preserves every state change without translation, scale, parallax, or elastic motion.
- The native typecheck and existing test suite remain green.

## Fixed-screen composition

Each of the eight steps is a deliberate viewport composition rather than a scrollable form. The screen reserves stable regions for the top bar, visual scene, question controls, and footer CTA. Step content may become denser or more compact, but the page itself does not scroll.

The reference constraint is a 360 × 640 logical-pixel phone viewport with safe-area insets and the persistent footer included. Larger phones gain breathing room instead of scaling the artwork or controls beyond their intended size.

- The album scene may change height by stage. It is largest while establishing the family and more compact once the editorial sheet detaches.
- Question copy is limited to one heading and one short support sentence.
- Selection rows use compact label-first treatments; descriptions are shortened or removed when the scene already communicates their meaning.
- Privacy preserves both required legal controls but reduces its explanatory summary to the minimum needed on-screen. Full policies remain links.
- Notifications are grouped into a compact preference treatment rather than six full-height cards.
- The software keyboard may temporarily cover or displace content. Profile fields remain reachable through keyboard avoidance, but the default resting state does not expose page-level scrolling.
- Dynamic Type may reduce or collapse decorative scene height before interactive controls are clipped. Accessibility text is never truncated solely to preserve the illustration.

## Experience structure

The existing onboarding route remains one mounted screen. Question content changes by `stepIndex`; the physical scene remains mounted above it and changes from album spread to editorial sheet without replacement.

### Welcome and privacy

Welcome introduces the two-page album spread with a visible cover, separate left and right page planes, and a center fold. There is no internal binding gutter or rounded dashboard-like container. One restrained baby-related keepsake sits on the active right page. Age attestation remains explicit and readable. It does not morph; it is a legal control.

Privacy keeps the recognizable spread. Its summary is presented as a concise translucent vellum note while Terms and Privacy controls remain stable native controls. They crossfade; they do not fly into the scene.

Accepting the required policies removes the vellum sheet and reveals the artifact choices underneath. This communicates “the album is ready to receive information” without turning consent into decoration.

### Role

Role selects the first persistent artifact:

- Expecting: ultrasound-style keepsake card.
- Parent: adult hand holding a baby’s foot or a restrained footprint keepsake.
- Partner/caregiver: invitation ribbon or caregiver keepsake representing entry into an existing family story.

The chosen artifact settles into focus. Unselected artifacts fade without elaborate exits.

### Household

The gold thread stitches the selected artifact onto the album page. The household name appears as an album title or embossed page label.

The thread’s movement means “this artifact belongs to this household.” It is not a progress indicator and should not move decoratively.

### Profile

The active right page widens while the left page visually recedes. The same artifact expands into the primary focus area. Due date, child name, and birth date appear directly on the artifact as the user supplies them.

The semantic transition is:

> selected keepsake → personalized keepsake

Form fields remain ordinary accessible controls beneath the scene. They are not rendered inside raster artwork.

Completing this step triggers the structural transition. The active right page lifts out of the center fold and becomes a loose editorial sheet. The former cover remains subtly visible beneath it long enough to preserve provenance; the left page and seam recede. This is the boundary between the album-building phase and the editorial phase.

### Goal

The personalized artifact docks to one side of the detached editorial sheet. Chapter tabs emerge from its outer edge: Memories, Care, Guide, and Connect.

The selected tab becomes visually primary. This is the object that will later become the first emphasized Today card.

### Notifications

Notification preferences use a compact bookmark/index treatment on the editorial sheet. Preference rows and switches remain stable controls; all choices fit without scrolling.

Preference choices remain local on this step. The current OS permission request and push registration are deferred to final submission so advancing through onboarding has no write side effects. Denying permission never blocks completion. Preview mode must not request OS permission or register a push token.

### Invite

The gold thread extends across the editorial sheet toward one empty contributor frame. This movement means “another caregiver joins this same household.”

The existing partner/caregiver business-flow inconsistency is not silently redesigned by this visual work. The current role says the caregiver is joining an existing household while the final step asks them to invite someone. That product branch must be resolved separately before a production onboarding release; the motion layer must not create a new contract or fake invite acceptance.

### Completion

The detached active page reorganizes into a Today-shaped composition:

- The personalized keepsake becomes compact stage/profile context.
- The selected chapter tab expands into the first emphasized Today card.
- The active editorial page becomes the background and layout scaffold.

The implementation uses a match-cut completion state inside the onboarding route. It must not depend on cross-route shared-element transitions. After real submission succeeds, routing replaces the onboarding screen with Today once the compositions visually align.

In preview mode, completion remains on-screen with explicit `Restart preview` and `Back` actions. It does not automatically reset before the completion state can be inspected.

## Persistent object model

Only three object families carry continuity:

1. **Keepsake artifact** — identity/stage: role choice → personalized profile → Today context.
2. **Gold thread** — relationship: loose artifact → household binding → caregiver invitation.
3. **Active page** — structure: right album page → detached editorial sheet → Today scaffold.
4. **Chapter tab** — intent: primary goal → album organization → emphasized Today action.

The active page is the persistent container and becomes the completion scaffold. The book cover, left page, and seam are supporting objects that recede after profile completion.

Everything else crossfades or remains stable. Legal controls, text inputs, notification switches, navigation buttons, and every option card must not morph.

## Motion grammar

- One primary transformation and at most one supporting transformation per step.
- The album-to-editorial transition occurs once, after profile completion. Back navigation reattaches the page coherently.
- Selection feedback finishes before step navigation starts.
- Forward transitions communicate accumulation; Back reverses the same spatial relationship.
- No bounce presets, icon explosions, parallax, floating particles, or confetti.
- Use one restrained timing curve for paper movement and one heavily damped spring, if a spring is needed at all.
- The CTA remains usable as soon as the new state settles; animation never delays input for decorative reasons.
- Keyboard appearance and date pickers may interrupt animation without corrupting state.

Prototype timings are implementation starting points, not immutable product requirements:

- Selection acknowledgement: 100–160 ms.
- Primary shared-object transition: 260–380 ms.
- Supporting reveal/crossfade: 160–240 ms.
- Completion reflow: at most 500 ms.

## Technical design

BumpAtlas already uses React Native 0.86, Expo 57, Reanimated 4.5, and React Native Worklets. No animation dependency is added for this work.

### Scene boundary

Create one `OnboardingAlbumScene` mounted by `OnboardingScreen`. It consumes a serializable presentation model derived from the onboarding answers and active step. It does not own form state, call APIs, navigate, or decide whether onboarding is complete. Its stable tree contains the cover, left page, active page, seam, keepsake, gold thread, and chapter tabs so the structural transition does not require swapping scene components.

Suggested interface:

```ts
type AlbumStage =
  | "welcome"
  | "privacy"
  | "role"
  | "household"
  | "profile"
  | "goal"
  | "notifications"
  | "invite"
  | "complete";

type AlbumSceneModel = {
  stage: AlbumStage;
  direction: "forward" | "back";
  role: OnboardingRole | null;
  householdName: string;
  childName: string;
  childDob: string;
  dueDate: string;
  goal: OnboardingGoal | null;
};
```

The model intentionally excludes notification preference values, legal acceptance values, network state, and API concerns.

### Shared-object implementation

The scene keeps one artifact wrapper mounted. Role changes may crossfade the image inside that wrapper; step changes move and resize the wrapper itself.

Use Reanimated shared values and animated styles for art-directed transforms. Where ordinary state-driven layout changes are sufficient, use a memoized `LinearTransition` or `CurvedTransition`. Do not use Reanimated Shared Element Transitions because that feature remains experimental and is unnecessary inside a single mounted route.

For movement between source and destination frames, use a FLIP-style transition:

1. Resolve the source and destination frames.
2. Keep the artifact in an absolute scene coordinate space.
3. Animate translation, scale/size, rotation, and border radius on the UI thread.
4. Settle into the destination frame without remounting the artifact.

Avoid scaling text with the image. The outer artifact frame moves; textual metadata fades/reflows independently so glyphs do not stretch.

### Reduced Motion

Use the system preference through Reanimated. Reduced Motion uses an immediate state swap or restrained opacity crossfade. No meaning may depend on watching a path draw or an object travel.

### Completion handoff

The completion composition lives inside onboarding. Real submission still occurs through the existing `applyOnboardingProfile()` and `completeOnboarding()` path. Push permission/registration runs from this final action and remains non-blocking. On success, the match-cut state settles and then routes to Today. On failure, the user stays in onboarding with their values preserved and receives the existing retryable error.

Preview completion performs no API call, secure-store completion write, push permission request, or navigation. It exposes `Restart preview` explicitly.

## Asset plan

### Raster assets

Create a coherent prototype set with matched lighting, crop, paper treatment, and palette:

- Expecting keepsake.
- Parent/baby keepsake.
- Partner/caregiver keepsake.
- One subtle seamless paper or linen texture, only if native gradients and surfaces are insufficient.

The prototype may use generated artwork. Production replacement—licensed, commissioned, or approved generated artwork—is a later release decision.

No identifiable baby face is required. Favor hands, feet, blankets, keepsake objects, and restrained crops. The experience must work without user-uploaded photos because photo storage is outside the current product scope.

### Native UI, not images

Build album sheets, frames, shadows, chapter tabs, invitation ribbon, titles, dates, progress, form controls, and Today-shaped cards as native views and text. This keeps dynamic content accessible and avoids blurry scaling.

The gold thread should begin as the simplest native/vector implementation that supports the required path. Do not introduce Skia or Rive solely for it. A later spike may justify animated SVG/Skia only if the first implementation cannot express the binding/invite paths cleanly.

## Data and side effects

The motion scene is presentation-only.

- No API call occurs because an animation starts or finishes.
- Preview mode suppresses the current-family gate query, mutations, notification permission, and push registration.
- Real onboarding keeps mutations and push registration in final submission. The startup current-family read remains the route gate when preview mode is disabled.
- Local form values remain the source of truth until final submission.
- Animation callbacks never determine whether data is saved.

## Accessibility

- Preserve accessible labels, roles, states, and minimum touch targets on all existing controls.
- Keep question text and controls outside raster assets.
- Do not move accessibility focus until the next question has settled.
- Announce the new step/question, not the decorative transformation.
- Support Dynamic Type without overlapping the album scene; the scene may shrink or yield vertical space.
- Reduced Motion follows the behavior described above.

## Performance constraints

- Validate on a release build, not only Expo development mode.
- Test on an iPhone and a lower-end Android device.
- Keep the three persistent object families mounted; avoid simultaneous animation across every option row.
- Prefer opacity and transforms. Animate dimensions only for the primary artifact/container morph where the semantic value justifies it.
- Bundle and resize local raster assets to their actual display needs; do not ship camera-resolution sources.

## Editorial scene proportion

Steps 6–8 use the detached editorial page rather than the opening album spread. Its fixed height is 156 points: taller than the current compressed treatment, but still subordinate to the 184-point bound album used for steps 1–5. The internal page and keepsake remain vertically centered within that frame.

This is a phase-level layout rule, not a per-step exception. Goal, notifications, invite, and completion therefore keep one stable scene height and preserve the continuous-page illusion. The form area remains fixed and non-scrolling; Simulator verification must confirm that the taller scene does not clip options or collide with the footer on steps 6–8.

## Testing and verification

Automated coverage should focus on behavior rather than frame-by-frame visual snapshots:

- Pure derivation from onboarding state to `AlbumSceneModel`.
- Forward and Back direction resolution.
- Preview completion produces a local completion state without submission.
- Real completion retains the existing submission path.
- Role selection resolves the correct artifact key.
- Goal selection resolves the correct chapter key.
- Reduced Motion selects the non-spatial transition strategy.

Manual verification:

- Tap forward and backward through every branch with values preserved.
- Interrupt profile animation with keyboard and date picker interactions.
- Inspect every step with Reduce Motion enabled.
- Inspect preview completion and restart.
- Run one real fresh-user completion after preview mode is disabled.
- Check frame pacing in a release build on iOS and Android.

## Deliberate exclusions

- No new backend contracts or database changes.
- No user photo upload or object-storage work.
- No Rive, Lottie, Skia, or experimental shared-element dependency.
- No redesign of the partner/caregiver invite contract in this implementation.
- No analytics instrumentation until the product decides what privacy-safe activation event to measure.
