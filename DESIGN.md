# Decignal design direction

Preserve the neutral isometric operational world, one accent per chapter, the current logo, Bricolage Grotesque (headlines, numbers, labels) and Figtree (body) typography. Improve the existing story in place; do not replace it with a generic SaaS landing page.

The tokens live in `app/styles/tokens.css`; the type roles, layout, card and segmented control live in `app/styles/primitives.css`. Change a value there, not at a call site.

## Colour

- Neutrals are cool (hue about 218). No brown, beige or cream anywhere, in the DOM or in 3D.
  - bg #F6F7F9, surface #FFFFFF (paper is an alias), sunken #EDEFF3 (bg-2 is an alias)
  - ink #0F1217, ink-2 #252A33, ink-soft #555D6B, ink-muted #7A8290 (icons, axes and disabled only, never body text)
  - line rgb(15 18 23 / .10), line-strong /.22, wash /.04 (hover fill), track /.08 (progress tracks), on-ink #FFFFFF
- System colours: cobalt #2E5BFF (ERP), violet #7C5CFF (CRM), emerald #0FA874 (MES; also a valid or approved outcome), saffron #FFB21E (WMS), tangerine #FF7438 (suppliers), pink #FF5FA2 (external). Signal red #F2361F means risk and nothing else.
- Text in a system colour uses its text-safe ink, never a mix with ink: cobalt-ink #2A52F0, violet-ink #5B3BE6, emerald-ink #087A54, pink-ink #C42B70, tangerine-ink #C7440F, signal-ink #C2331B. Saffron is never text (its ink is ink). In TSX set colour with `toneVars(tone)` from `lib/tone.ts` (`--tone` for fills and strokes, `--tone-ink` for text); CSS reads `var(--tone-ink, var(--color-ink))`.
- Colour lives only in dots, numerals, text-ink, drawings and the chapter's 3D object. Area tone colours chapter chrome only (dot, number, the headline's accent line); data uses the colour of the system it came from.
- Surfaces are white or neutral. The one strong surface is ink: the closing audit panel and the active selector pill. No cobalt-filled panels.

## Type

Three roles, nine classes (`.t-*`, in the components layer so a utility can still adjust them):

- Headline: `.t-display` (hero and final statement only, Bricolage 560, clamp(40px, min(6.2vw, 10.5vh), 96px), tracking -.032em), `.t-title` (section heads, 560, clamp(32px, min(3.8vw, 6.4vh), 56px), -.026em), `.t-title-card` (a title inside the StoryCard, up to 40px), `.t-subtitle` (600, 17-20px), `.t-num-lg` (600, 48-80px, tabular), `.t-num-md` (600, 28px, tabular).
- Text: `.t-lede` (Figtree 450, 16-18px, ink-2), `.t-body` (450, 15px; buttons, nav links and CTAs at 600), `.t-small` (500, 13px).
- Label: `.t-label` (Bricolage 600, 11px, .1em, uppercase, 92% width, ink-soft). `.eyebrow` is the same role.
- Two-line headlines use `components/ui/SectionTitle.tsx`: line one in ink, line two in the tone's ink on its own line, an optional label above (16px) and lede below (24px).
- No rendered text under 11px, including SVG labels after viewBox scaling. No em dashes in copy.

## Layout, spacing, radius, elevation

- Grid: `--grid-max` 71rem, `--gutter` clamp(20px, 5vw, 72px), `--edge` = max(gutter, (100% - grid-max) / 2): 152px at 1440, 72 at 1280, 20 at 390. Fixed layers (nav, story card) use `--edge`; flow content uses `.page-wrap` and `.grid-12`. Never 100vw inside calc.
- Spacing: a 4px scale, 4 8 12 16 24 32 48 64 96 128. Every editorial section uses `.section` (`--section-y` clamp(80px, 10vw, 144px)). Header stack: label to title 16, title to lede 24, lede to actions 32, header to content 64.
- Radius: xs 6, sm 10, md 16, lg 24, xl 32, pill. A nested element takes the next step down. (Tailwind `rounded-xs` to `rounded-xl` now map to this scale.)
- One card: `.card` (surface, radius md, hairline edge, `--card-pad`), `.card--panel` (radius lg) for anything holding a graphic or a section's content, `.card-inset` (sunken, radius sm) for rows inside a card. The StoryCard uses `--card-x`, `--card-b`, `--card-w` and radius lg.
- Elevation: hairlines only (`--edge-line`, `--edge-strong` on hover, `--edge-selected` ink ring when selected). The only drop shadow is `--shadow-float`, for layers floating over content. No gradients, glass, backdrop blur, glow or translucent surfaces. Tone appears in an item's dot or numeral, never as a ring or an underline.
- Stacking: canvas 10 < story 20 < island 28/29 < editorial 30 < rail 40 < pill/dock 45 < menu 47 < veil 48 < nav 50 < loader 70 < skip link 80 (`--z-*`).

## Controls and motion

- Tabs that switch content and location links share `components/ui/SegmentedControl.tsx`: selector variant = solid ink pill, white text, tone dot; location variant = sunken pill, ink text. The pill slides; arrow keys move with a roving tabindex.
- Motion uses only `--dur-1..5` (120/200/320/600/900ms) and `--ease`. Animate cause and effect: stock moves, evidence connects, an object resolves. No pops, strobes or visibility toggles of on-screen 3D. Live markers pulse their own opacity, never a spreading ring. Respect reduced motion.

## Product honesty and verification

- Mark examples as illustrative. Never invent clients, quotes, logos or result numbers; never imply a demo sends an order to a live system.
- Verify desktop (1440x900, 1280x680), tablet and phone (390x844) at device scale 2, plus keyboard, reduced motion and `node scripts/rules-check.mjs`.

## Completed precision pass

Applications use the lead story's detailed vehicles and plants, a finned motor with an exploded bearing inspection, roller conveyors with a physical transfer shuttle, a container yard and alternative route, regional distribution, linked service records and three-way document matching. Scroll progress drives the mechanisms; chapter buttons are optional shortcuts.

The inventory forecast, pallet quantities, retained source stock and arrival timing now agree. Outcomes explain observable changes in those illustrative scenarios rather than unverified performance percentages. The original desktop opening composition remains; phones arrange the six system models in two columns for readable scale.

Audit booking has no configured backend. The form prepares a local downloadable brief and explicitly confirms that nothing was sent. Connect an approved booking or CRM destination before treating it as a live lead form.

## Follow-up clarity pass

Applications now have a named chapter rail and three stage controls that follow scrolling automatically. Stable copy, scene and evidence regions align to shared edges. Eight different instruments show forecasts, demand, capacity, vibration, dependency routes, allocation, case relationships and purchase matching; the action stage changes the evidence rather than repeating static metadata.

Sales uses a separate dealer allocation world. Production equipment includes its tooling, transparent safety glass and controls. The supply-risk world includes a vessel, quay, crane cabin, railings and marked lanes. Cameras fit each subject's proportions, and generic whole-scene rotation has been removed. The navigation remains visible during application stories. The existing entry animation, source colour system, material palette and lead-story mechanics remain the foundation.
