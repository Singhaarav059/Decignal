# Baseline (captured 2026-10-07, commit b0558d2)

Captured from `next dev` on localhost:3000 with headless Chromium (playwright-core), one screenshot per viewport height at 1440×900, 768×1024 and 390×844. That gave 40, 39 and 43 frames. **There were no console errors at any width.** At every width, document width equals viewport width, so nothing scrolls horizontally.

## Actual structure (differs from the brief's "sections 01–08")

The page has two parts:

1. **Story** (`components/story/Story.tsx`, `lib/story.ts`). A fixed R3F canvas sits behind a fixed DOM overlay, and a single scroll value `g` drives both. There are 9 chapters, ~18.8 viewport heights in total:
   `01 Fragmented (hero) · 02 Signal · 03 Problem · 04 Context · 05 Decision (Plant 02 → Plant 01 truck) · 06 Human control (approve/adjust/reject) · 07 Scale · 08 Industries (5 sub-steps) · 09 Decide`.
2. **Editorial** (`components/sections/Editorial.tsx`). Normal flow on a paper sheet with a rounded top: logo marquee, Applications (8 sticky scroll chapters with 3D scenes and evidence charts), Outcomes (3 tinted cards), How it works, FAQ, Audit form, Footer (giant wordmark).

The signature scene already exists in procedural 3D. It covers the plants, truck, forklift, pallets and Bearing X90 crate (`components/three/*`). No external model files are used.

## Colour tokens (`app/globals.css @theme`)

| Token | Value | Role |
| --- | --- | --- |
| bg / bg-2 / paper | #FBF6EF / #F4ECE1 / #FFFDF9 | cream ground, paper sheet |
| ink / ink-2 / ink-soft | #14130F / #24221C / #524D44 | text |
| line / line-strong | ink at 13% / 25% | hairlines |
| cobalt | #2E5BFF | ERP, demand, primary accent |
| violet | #7C5CFF | CRM, context |
| emerald | #0FA874 | MES, approved / valid |
| saffron | #FFB21E | WMS, decision |
| tangerine | #FF7438 | suppliers, scale |
| pink | #FF5FA2 | external, industries |
| signal | #F2361F | risk only |

These are already tokens, so no extraction is needed. Each chapter tints the backdrop toward its accent (`TONE[]` in Story.tsx). The nav progress bar uses `--spectrum`.

## Type

- Inter variable (opsz) via `next/font` is used for everything. `.display` is set at 650 weight with −0.04em tracking and 1.02 leading. Story headlines use `clamp(36px, 6.2vw, 100px)`; chapter titles use `clamp(36px, 3.8vw, 60px)`.
- Geist Mono is used for labels. `.eyebrow` is 11px, 600 weight, +0.13em tracking, uppercase.
- The `@fontsource/*` packages in package.json (Bodoni, Manrope, JetBrains, Instrument Serif, Inter) are not imported anywhere. They are unused dependencies but don't affect the bundle.

## Spacing / layout

DESIGN.md sets a 4/8/12/16/24/32/48 scale, a max width of 1152px, and 24px (mobile) / 40px (desktop) gutters. The story overlay pins copy to the top-left and facts to the bottom-left, with the stepper at bottom centre.

## Current motion

- **Easing:** three curves exist as tokens (`--ease-out-quint`, `--ease-out-expo`, `--ease-in-out-quart`). Two raw `ease` uses appear in 400ms transitions.
- **Durations in use:** 200, 300, 380, 400, 420, 450, 500, 600, 700, 800, 900 and 1000ms. That is 12 distinct values with no scale.
- **Story:** chapters crossfade with opacity, an 18px rise, up to 6px of blur and an RGB-split on headings. Ghost words drift behind. Plant 02's stock counts down as pallets load. The truck drive and camera are scroll-scrubbed with damping.
- **Loader:** dot-in. There is also a scroll cue loop, a logo marquee, `applicationResolve` and `evidenceDraw` (charts draw in), and an outcome stroke.
- **Nav:** a 2px spectrum progress bar. The nav turns solid past the story and hides when scrolling down. It does not show chapter progress. Instead, a separate bottom chapter counter of ticks ("02 SIGNAL") does.
- **Reduced motion:** 14 `prefers-reduced-motion` references. The story disables the split and the ghost drift.

## Observed weaknesses (from the screenshots)

1. **Hero → Signal hand-off (1440 frame 01, 390 frame 01):** for about half a viewport the screen shows a fully blurred "One signal matters." over islands flying apart. That is the weakest frame on the page and reads as a loading glitch.
2. **Signal:** the Bearing X90 crate is strong, but its three 3D callouts are about 8px text and can't be read at 1440 or 390. The concentric rings are decorative and carry no data. Nothing is quantified: "6 days to safety stock" appears only in an unreadable label.
3. **The bottom tick counter and the top progress bar duplicate each other.** The nav never names the chapter.
4. **Transitions mid-scroll often show two half-blurred states at once:** Decision → Control, Industries and Final. "Turn information into decisions" sits over a mostly empty plate.
5. **Applications:** the evidence panel is dense, with 9–10px mono labels in the bottom half at 1440.
6. **Footer:** a wordmark only. It has no callback to the hero scene.
7. **Dev only:** the Next "N" indicator overlaps the hero system chips at the bottom left. It isn't present in production.
