# Loop log: camera choreography (Conbini reference)

## Change
- `components/three/Scene.tsx` Rig: transitions Hero→Signal→Problem→Context→Decision (i < 4) now blend the camera
  in spherical coordinates around the eased look target (azimuth, elevation, log-distance each eased by the
  smootherstep `e`), so every move is a tilt/orbit that decelerates into its hold instead of a straight-line slide.
  Later chapters keep the linear blend (Control/Scale/Industries/Final untouched).
- Damping lengthened slightly (0.12→0.16 at rest) so the orbit lands softly.
- Reduced motion: new `prefers-reduced-motion` listener; the pose switches at the transition midpoint and the
  camera is placed directly (a cut, no orbit, no damping drift).
- `lib/scene.ts`: Signal is a low, close three-quarter (camera swung right, y 1.7); portrait version also off-axis.
  Context swings to a higher oblique from the left so the move Signal→Context is a rising orbit revealing the ring.
  Fit/drop arrays untouched.

## Verification (dev :3106, DPR 1; machine load avg ~80, so one frame per run)
Frames in scratchpad/cam: 1440 g 1.3/1.75/2.3/2.75/3.3, 768 and 390 g 1.3/2.75/3.3, reduced-motion 1440 g 2.75.
Console errors: none. scrollWidth == viewport at all widths. CLS 0.005–0.032 (unchanged from baseline range).
Copy, Signal readout card and Context evidence list all unobstructed.

## Scores (iteration 1)
clarity 8, layout 8, polish 8, motion meaning 8 (orbit reads as a swing around the crate, then a rise), cohesion 8,
performance 9 (a few trig ops per frame, DPR untouched).
Open: frame sequences limited by host load; a real-time 60fps recording on a GPU would confirm feel.
