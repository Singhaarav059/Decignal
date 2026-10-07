# Motion notes from references

Source files live in `references/`. They were copied from ~/Downloads and renamed by content:

- `______…Co_0Q2XIT.mp4` → `conbini-diorama.mp4` (2204×1238, 60fps, 13.2s)
- `AQOdCW…` → `fig-ae-hoop.mp4` (720×1280, 25fps, 18.5s)
- `AQPAAp…` → `femly-dashboard.mp4` (720×1280, 30fps, 29.6s)
- `AQPi30…` → `braam-mango-site.mp4` (720×1280, 30fps, 27.3s)

Each video was sampled at 1fps for an overview. Dense sampling was then done at 10fps around transitions (5fps for Conbini). Timings below come from frame counts, so they are ±100ms (±200ms for Conbini). The Mango and Femly clips are screen recordings with jump cuts, so a cross-cut timing is a lower bound.

## Fig → AE hoop (micro-interaction tied to a task)

- A file card waits at bottom-left while a dotted arc previews its path (~1.0s of idle anticipation).
- **Throw:** the card flies the arc into the dropzone in **~400ms**, easing out. The card rotates about 20–30° in flight and lands with an overshoot.
- **Dropzone reacts on contact:** it tints to a pale accent and its border turns dashed (~100ms). It stays tinted while the card passes through the net (**~700ms**).
- **Success:** a "+1" pops beside the hoop as the card exits the net. The upload row slides up from the bottom (~200ms). The progress bar fills in **~1.0s**, then a check appears (~150ms pop). The tint fades out over ~300ms.
- **Lesson:** one object physically carries the task through every state (drop → progress → success). The container responds before the result arrives.
- **For Decignal:** the approval widget. When someone presses Approve, the decision card should travel into the plan, followed by the stepper progressing and a check. Do not use a basketball or any other playful metaphor.

## Femly dashboard (data UI motion)

- **Focus moment:** the time-tracker card scales to fill the frame, then zooms back out into its grid slot in **~600ms**, easing out with no bounce. The surrounding dashboard is already rendered.
- **Count-up and digit roll:** each timer digit rolls vertically, one digit at a time, in **~150ms**. KPI numbers count up on change.
- **Charts draw in:** bars grow from the baseline with a left-to-right stagger. The donut gauge (40%) sweeps.
- **Page change:** the old view fades to white (~150ms). Cards then stagger in at **~60ms intervals** over ~600ms total.
- **Drag/re-order:** the dragged card lifts with shadow and tilt, and neighbours slide aside (~250ms) to make room.
- **Accent re-tint:** changing a single accent in Settings re-tints every chart and badge in one pass (~300ms colour transition).
- **Lesson:** motion always marks a data change. Numbers that change roll; numbers that don't change never animate.

## BR-AAM mango site (scroll-driven object transformation)

- **One object transforms between sections as you scroll:** whole mango → split into three slices (~300ms of scroll) → cheeks → cubed "hedgehog" → cubes explode into a ring → ring pours into a bottle that fills.
- **Each state holds** while the headline sits beside it. The transformation happens only between headlines, so motion and reading never compete.
- **Big counter:** "Tree to bottle in six hours" counts 125 → 250 in **~700ms**, easing out and synchronised with the bottle filling.
- **Per-item tinted cards:** "Four ways" sets four bottles on cards, each tinted to its own fruit colour.
- **Contrast section:** a dark green section with line art breaks the cream rhythm once.
- **Closing callback:** the page ends on the hero mango composition.
- **Lesson:** one object, one continuous story, and a resolved ending. Decignal's equivalent object is the Bearing X90 signal crate and the 240-unit transfer. This adapts the technique only, not the consumer look.

## Conbini diorama (one lit scene, camera choreography)

- The diorama is a single scene with no cuts. In order, the camera:
  1. Holds at the hero ¾ angle for ~1s.
  2. Swings to a low side angle (~1.5s).
  3. Rises to a top-down/oblique view (~1.5s).
  4. Orbits around the back (~2s).
  5. Returns to the front.
  6. Settles on the exact hero angle over the last ~1.5s, easing out.
- Total ~13s. All moves use ease-in-out with no linear segments, so the camera always decelerates into a hold.
- Realism comes from light. Warm interior glow spills onto the plinth, there are wet-floor reflections, rim light separates the roof edge, and soft contact shadows ground the model. Geometry detail is modest.
- **For Decignal:** use warm daylight instead of night neon. A soft key light, a sky fill and contact shadows on cream. Tilt the camera between Signal → Context → Approval and return to the hero angle for the footer.

## Proposed motion system (to be added as tokens)

- **One curve:** `--ease: cubic-bezier(0.22, 1, 0.36, 1)` (the existing ease-out-quint, already the most used). Scroll-scrubbed 3D keeps its damping because it is driven by position, not time.
- **Duration scale (5 steps):** `--dur-1: 120ms` (press, check pop) · `--dur-2: 200ms` (hover, tint) · `--dur-3: 320ms` (cards, panels) · `--dur-4: 600ms` (focus moments, re-order) · `--dur-5: 900ms` (count-ups, chart draw).
- **Stagger:** 60ms.
- **Reduced motion:** count-ups jump straight to the final value, charts appear fully drawn, the camera cuts instead of moving, and crossfades stay at `--dur-2` or less.
