"use client";

import { CH, store } from "@/lib/story";
import { CTA, FINAL } from "@/lib/copy";
import { toneVars } from "@/lib/tone";
import { SYSTEMS } from "../ui/systems";
import { SystemChips } from "./SystemChips";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";

/**
 * 09 Decide, inside the story card (D1 Option A): the example transfer's three results, the six systems
 * behind it (pointing lifts each island and brightens its thread to the decision), and the call to action.
 * The headline stands behind the 3D world (Story.tsx).
 */
export function FinalCard() {
  return (
    <div className="final-card">
      <p className="t-body story-body" data-optional>
        {FINAL.sub}
      </p>
      <p className="t-label final-card-title">{FINAL.cardTitle}</p>
      <ul className="final-outcomes">
        {FINAL.outcomes.map((o) => {
          // Each figure comes from one system: pointing at it lifts that island.
          const sys = SYSTEMS.findIndex((s) => s.tone === o.tone);
          return (
            <li
              key={o.label}
              style={toneVars(o.tone)}
              onPointerEnter={() => (store.islandHint = sys)}
              onPointerLeave={() => (store.islandHint = -1)}
            >
              <strong className="t-num-md t-tone">{o.value}</strong>
              <span className="t-small">{o.label}</span>
            </li>
          );
        })}
      </ul>
      <SystemChips className="story-chips" label={FINAL.chipsAria} pin={CH.final} />
      {/* The CTA pair: the audit, and the applications for readers not ready to book. */}
      <div className="story-actions">
        <SectionLink href={CTA.href} className="btn btn-primary">
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
