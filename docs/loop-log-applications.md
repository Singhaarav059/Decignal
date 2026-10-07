# Loop log: #applications and #outcomes

## Iteration 1
Plan: make the application UI re-tint per chapter, make the charts draw in again, count up the values, and raise the labels to 11px or more.

Built:
- `--tone` is registered with `@property`, so it can transition (`--dur-3`). The chapter bar numbers, the progress index, the eyebrow diamond, the headline emphasis, a 2px accent rule on the readout and its tinted border/background all follow the tone.
- Bug found: `evidenceDraw` only had a `to` keyframe and the base dash offset was already 0, so the charts never drew. New `evidenceDrawIn` keyframe has explicit from/to values. It plays on chapter mount and when a later stage adds `is-drawn`.
- The readings are linked to the stage: reading i is lifted (tone wash plus a top rule that scales in) when the stage is i (Signal / Evidence / Action). I used this in place of re-ordering, so the data order stays stable.
- `components/ui/CountUp.tsx`: numeric readings count up on chapter change. Values that do not start with a number or contain a time (`14:00`) stay static. The final string always equals the source value, and the screen-reader text is the final value.
- Labels: the evidence heading, state, reading labels, source list, progress line and "Illustrative workflows" are 11px at 1440/768 and 10–10.5px in the 390 portrait layout. Chart text inside the SVGs went from 9 to 10.5 user units.
- Outcomes: the big values count up once the grid is 35% in view. Diagram text went from 8 to 10.5 and the figcaption from 9 to 11px. Values and "Illustrative" copy are unchanged.
- Reduced motion: no tone transition, no draw, no count. Final values are shown.

Open: at 390, the SVG chart text is still drawn at about 0.58 scale because the 540-unit viewBox is limited by width. Fixing that needs a separate portrait chart layout.
