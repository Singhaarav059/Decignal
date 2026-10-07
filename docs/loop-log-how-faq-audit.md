# Loop log: systems marquee, #how, #faq, #audit

Captures: 1440x900, 768x1024, 390x844 via scratchpad `sec5.mjs` (port 3105). The machine was running several
WebGL dev servers at once (load average 50 to 95), so editorial captures hide the story canvas
(`HIDECANVAS=1`); none of these sections depend on it.

## Systems marquee
- Plan: the duplicated second half of the loop was read twice by screen readers, and the row had no
  hover detail beyond pausing.
- Build: duplicate items are `aria-hidden`, the list is labelled, diamonds are decorative. On hover the
  system under the pointer takes its own marker colour (darkened toward ink for contrast) and its
  diamond turns and grows (`--dur-3`, `--ease`). Reduced motion keeps the existing static row.
- Scores: clarity 8, layout 8, polish 8, motion meaning 8, cohesion 9, performance 9.

## #how
- Plan: the track drew on scroll but nothing reacted to it; the route toggle remounted the whole list.
- Build: each step badge stays neutral until the route reaches it, then fills with its tone (desktop: driven by
  the scrubbed track progress; stacked mobile: by each step crossing 70% of the viewport). The toggle now keys
  content by value, so only text that differs between routes re-enters (`--dur-4`, `--stagger`, sliding from
  the side of the chosen route); "Ongoing", which both routes share, stays still. Step eyebrows are darkened toward
  ink so tangerine and emerald meet AA at 11px. Reduced motion: every step lit, route drawn, no swap motion.
- Scores: clarity 9, layout 8, polish 8, motion meaning 9, cohesion 9, performance 9.

## #faq
- Build: height, indicator rotation and answer fade on `--dur-4` / `--ease`; `aria-controls` and a labelled
  `region` per answer; closed answers are `inert` so the keyboard cannot tab into hidden links; reduced motion
  turns the transitions off.
- Scores: clarity 9, layout 8, polish 8, motion meaning 8, cohesion 9, performance 10.

## #audit
- Build: a progress line at the top of the card fills as each required answer is completed (step 1 = first half,
  step 2 = second half), with checkpoints that light once a step is finished. When a step is completed the card
  answers with a white ring that settles (`--dur-5`) and the next step slides in. Success draws a check
  (circle, then tick). Error states use `:user-invalid`, so they appear only after interaction or a submit attempt:
  signal-red underline, darkened label and a "check this" suffix. White copy on the cobalt panel raised to 95-100% white
  (about 4.8:1 to 5.2:1, AA). Placeholders raised for legibility.
- Form check, all three widths: step 1 blocked when empty, then filled with example data (Priya Raman,
  priya@example.com, Example Co); step 2 completed; brief downloaded as `decignal-audit-brief.txt` with the
  expected fields. Zero non-GET requests during the flow. The local-only message is unchanged.
- Scores: clarity 9, layout 8, polish 9, motion meaning 9, cohesion 9, performance 10.
