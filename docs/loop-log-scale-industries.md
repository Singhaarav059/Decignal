# Loop log: 07 Scale and 08 Industries

## 07 Scale (2 iterations)

- **Baseline:** 1440 lists were 11-12.5px plain text under a hairline; 390 truncated every function's applications to one line ("Demand & R..."); 768 squeezed five columns.
- **Built:**
  - Each function is its own tinted card (`color-mix` of its existing category token, 7%, 13% when its 3D card is hovered/focused), with a tinted top bar that grows on focus. Larger type (14/13.5/12px).
  - Below 1024px the list stacks as tinted rows with a left accent bar, an app count, and every application name wrapped (no truncation).
  - Desktop list moved to `bottom: 4vh` so the cards no longer overlap the 3D cards; portrait camera lifts the Scale cards (`PORTRAIT_DROP[6]` 0.1 -> -0.1) so the stacked list does not cover them.
- **Iteration 1 problem:** padded cards covered the 3D cards at 1440 and five columns clipped "Supply Chain" at 768. Fixed with the lg breakpoint and lower placement.
- **Evidence:** 0 console errors at all widths; CLS 0.021 / 0.020 / 0.004 (unchanged from baseline 0.022 / 0.029 / 0.003); scrollWidth == viewport.
- **Scores:** clarity 9 · layout 8 · polish 8 · motion 8 · cohesion 9 · performance 9.
- **Open:** on 390 the 3D cards are small (they sit between copy and list); the DOM list carries the content.

## 08 Industries (4 iterations, cap reached)

- **Baseline:** headlines blurred up to 12px mid-turn; the plinth read as a flat purple disc for all six industries; the index bar and checks were fixed ink and emerald; at 768 the left copy column sat on top of the plinth.
- **Built:**
  - Headline crossfade: `smoothstep(0.35, 1, …)` ramp, blur capped at 2px (none under reduced motion). Neighbouring names never overlap (their windows are disjoint).
  - Each headline is set in its industry's accent (the same tone as its 3D card badge, mixed 58% with ink for contrast). New shared `INDUSTRY_TONE` in lib/story.ts.
  - Detail copy: tinted dot on the "01 / 06" eyebrow, checkmarks in the industry tone, index bar and current number take the active industry's tone.
  - Plinth glaze blends between industries as the rim turns (accent deepened 42% toward ink).
  - Below 1024px the detail block docks at the bottom (max 560px wide) and the portrait camera lifts the plinth (`PORTRAIT_DROP[7]` -0.14), so copy and plinth no longer overlap at 768.
- **Evidence:** 0 console errors; CLS 0.021 / 0.019 / 0.003; scrollWidth == viewport; reduced-motion runs clean.
- **Scores:** clarity 8 · layout 8 · polish 8 · motion 8 · cohesion 9 · performance 9.
- **Not done:** count-up. No numeric value changes in place here (weeks are ranges per industry in separate blocks), so a count-up would not show a real state change.
- **Open:** saffron (Energy) glaze gives the white rim engraving lower contrast than the other industries; judge at DPR 2. Rim lettering on phones is small (pre-existing).
