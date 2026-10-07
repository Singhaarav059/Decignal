# Loop log

Scores (0–10): clarity · hierarchy/layout · polish/realism · motion meaning · cohesion · performance.
Verified with headless Chromium at DPR 2, at 1440×900, 768×1024 and 390×844, including a reduced-motion run.

## 1. Hero (01 Fragmented) and its hand-off to Signal (4 iterations)

- **Built:**
  - Motion tokens (`--ease`, `--dur-1…5`, `--stagger`).
  - The islands now converge into the Bearing X90 crate instead of shrinking in place (`exit` on `Actor`).
  - Island labels leave first.
  - Copy crossfade tightened: outgoing text clears before incoming text arrives, blur is capped at 2px, and the RGB split is capped at 8px.
  - Nav compresses on scroll (56 → 48px, more blur), shows a chapter readout with a rolling number, and carries a clickable 9-segment rail tinted per chapter. It replaces the top progress bar and the bottom tick counter.
- **Iterations:**
  1. Labels piled up during convergence. Fixed with `IslandTag`.
  2. through 4. These concerned Signal framing (see below).
- **Evidence:** console errors 0 at all widths. CLS 0.008 / 0.006 / 0.001. No horizontal overflow.
- **Scores:** clarity 8 · layout 8 · polish 8 · motion 8 · cohesion 8 · performance 8.
- **Known gap:** on the 768 portrait, the convergence happens partly out of frame while the camera moves (g≈0.72). This is a candidate for the consistency pass.

## 2. Signal (02)

- **Built:**
  - The three ~8px 3D callouts and the decorative radar rings are replaced by a readable readout card (Bearing X90 · Plant 01: on hand 410 counting up, safety 175, breach Day 6).
  - A six-day strip draws in with a 60ms stagger, mirrored by a six-segment ring drawn around the crate (day 6 in signal red).
  - Hovering or focusing the card lifts and brightens the crate.
  - The ring follows the crate's pose on any screen shape.
  - The portrait camera comes in closer and is centred.
- **Iterations:**
  1. The ring was misaligned on portrait.
  2. The ring was hidden under the ground plane.
  3. The crate was off-centre and clipped on phones because of a stale `PORTRAIT_X` offset.
  4. "Safety stock" wrapped at 390, so the label became "Safety".
- **Scores:** clarity 9 · layout 8 · polish 8 · motion 8 · cohesion 8 · performance 9.
- **Copy note:** "Safety stock" → "Safety" is a label in the new card, not existing copy.

## 3. Problem (03) (4 iterations, cap reached)

- **Baseline:**
  - Desktop was strong.
  - On 768 and 390 the chart was tiny, with ~6px labels.
  - The "DAY 21 · SUPPLIER" marker sat outside the frame at every width, hiding the fact that rules out waiting.
- **Built:**
  - Portrait camera framing for Problem (`MOBILE_FIT`, `PORTRAIT_FIT`, `PORTRAIT_X`, `PORTRAIT_DROP`).
  - Chart labels grow 1.9× on phones with short forms: NOW / D1…D6, +18%, SAFETY 175.
  - The supplier marker moves in frame under Day 6 ("NEXT SUPPLY · DAY 21 →").
  - The safety label sits on the line on narrow screens.
- **Tooling note:** headless WebGL at DPR 2 is software-rendered and intermittently timed out or captured empty scenes. Captures now run at DPR 1 and wait for two matching frames. A final DPR 2 pass is still due.
- **Evidence:** console errors 0. CLS 0.008 / 0.005 / 0.001. Reduced-motion run clean.
- **Scores:** clarity 8 (desktop 9, phone 7) · layout 8 · polish 8 · motion 8 · cohesion 8 · performance 8.
- **Open:** on 768 and 390 the "SAFETY 175" label overlaps the first column. It needs a clear slot, or a DOM label in the consistency pass.
