"use client";

import { store } from "@/lib/story";
import { CTA, FINAL } from "@/lib/copy";
import { toneVars } from "@/lib/tone";
import { SYSTEMS } from "../ui/systems";
import { SystemIcon } from "../ui/SystemIcon";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";

/**
 * 09 Decide, inside the story card, on the night surface of the closing bands: one line on what
 * Decignal does, the example transfer's three results as tiles (pointing at one lifts the island its
 * figure came from), the six systems behind them as a row of discs, and the call to action.
 * The headline stands behind the 3D world (Story.tsx).
 */
export function FinalCard() {
  return (
    <div className="final-card">
      <p className="final-lead" data-optional>
        {FINAL.sub}
      </p>
      <p className="t-label final-card-title">{FINAL.cardTitle}</p>
      <ul className="final-outcomes">
        {FINAL.outcomes.map((o) => {
          const sys = SYSTEMS.findIndex((s) => s.tone === o.tone);
          return (
            <li
              key={o.label}
              style={toneVars(o.tone)}
              onPointerEnter={() => (store.islandHint = sys)}
              onPointerLeave={() => (store.islandHint = -1)}
            >
              <i aria-hidden />
              <strong>{o.value}</strong>
              <span>{o.label}</span>
            </li>
          );
        })}
      </ul>
      <div className="final-systems">
        <span className="t-label">{FINAL.readFrom}</span>
        <ul aria-label={FINAL.chipsAria}>
          {SYSTEMS.map((s, i) => (
            <li
              key={s.id}
              style={{ ...toneVars(s.tone), ["--i" as string]: i }}
              title={`${s.full}: ${s.knows}, ${s.value}`}
              onPointerEnter={() => (store.islandHint = i)}
              onPointerLeave={() => (store.islandHint = -1)}
            >
              <SystemIcon id={s.id} size={13} />
              <span className="sr-only">{s.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="story-actions final-actions">
        <SectionLink href={CTA.href} className="btn final-cta">
          {CTA.primary}
          <Arrow />
        </SectionLink>
        <SectionLink href="#applications" className="story-link t-small">
          {FINAL.secondary}
          <Arrow />
        </SectionLink>
      </div>
      <p className="t-small final-note" data-optional>
        {FINAL.ctaNote}
      </p>
    </div>
  );
}


/**
 * 09 Decide on wide screens: the card steps away (as in the hero) and its content sits on one glass bar
 * at the foot of the centre line: the example's three results, the six systems they were read from,
 * and the call to action. A [data-frame], so the world stays clear of it (Scene measurePage).
 */
export function FinalBar() {
  return (
    <div className="final-bar" data-frame data-lens>
      <p className="t-label final-bar-title">{FINAL.cardTitle}</p>
      <ul className="final-bar-outcomes">
        {FINAL.outcomes.map((o) => {
          const sys = SYSTEMS.findIndex((s) => s.tone === o.tone);
          return (
            <li
              key={o.label}
              style={toneVars(o.tone)}
              onPointerEnter={() => (store.islandHint = sys)}
              onPointerLeave={() => (store.islandHint = -1)}
            >
              <strong className="tabular">{o.value}</strong>
              <span>{o.label}</span>
            </li>
          );
        })}
      </ul>
      <div className="final-bar-systems">
        <ul aria-label={FINAL.chipsAria}>
          {SYSTEMS.map((s, i) => (
            <li
              key={s.id}
              style={{ ...toneVars(s.tone), ["--i" as string]: i }}
              title={`${s.full}: ${s.knows}, ${s.value}`}
              onPointerEnter={() => (store.islandHint = i)}
              onPointerLeave={() => (store.islandHint = -1)}
            >
              <SystemIcon id={s.id} size={12} />
              <span className="sr-only">{s.name}</span>
            </li>
          ))}
        </ul>
        <span className="t-small">{FINAL.readFrom}</span>
      </div>
      <div className="final-bar-actions">
        <SectionLink href={CTA.href} className="btn btn-primary">
          {CTA.primary}
          <Arrow />
        </SectionLink>
        <SectionLink href="#applications" className="story-link t-small">
          {FINAL.secondary}
          <Arrow />
        </SectionLink>
      </div>
    </div>
  );
}
