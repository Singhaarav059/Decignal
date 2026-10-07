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
