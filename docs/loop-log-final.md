# Loop log: 09 Decide (Final) + Footer

## 09 Decide
- Baseline: headline over an empty pale plate with one tilted card; unresolved ending.
- i1: camera returns to the hero angle (lib/scene.ts cameraPose default); islandPose and signalCratePose reuse the fragments pose for CH.final; SystemNetwork threads return at higher opacity (connected); X90 tote lerps to emerald (approved); decision card lies at the hub. Card too small, core poking through; 390 too small.
- i2-i4: tuned camera target (scene clear of headline and body copy at 1440), card lifted above the hub core, MOBILE_FIT[8] 0.74, PORTRAIT_DROP[8] -0.05.
- i5: card scale 1.0 so it no longer overlaps MES/WMS islands in portrait.
- Canvas fade-out at the end of the chapter unchanged. Reduced motion: no new animation (damped camera as before).
- Scores (1440 / 768 / 390): clarity 9/8/8, hierarchy 8/8/8, polish 8/8/8, motion meaning 8, cohesion 9, perf 8 (no new geometry; same islands re-used). CLS < 0.05, no console errors, no horizontal overflow.

## Footer
- Added a small SVG motif above "Bring us one decision": six threads in the system colours converge on one emerald approved node. Draws in once in view (stroke-dashoffset, --dur-5, --stagger per thread, node pops after). Reduced motion: drawn state, no transition. No second canvas.
- Scores: clarity 9, hierarchy 8, polish 8, motion meaning 8, cohesion 9, perf 10 at all widths. CTAs untouched.

Open: the decision card face is small at the hub (readable only as a card, not as text); headline copy unchanged.
