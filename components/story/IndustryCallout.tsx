"use client";

import { CH, INDUSTRIES, INDUSTRY_TONE } from "@/lib/story";
import { FACES, INDUSTRY } from "@/lib/copy";
import { toneVars } from "@/lib/tone";
import { useIndustryAt } from "./IndustryDetail";

/**
 * 08: the recommended action for the industry in front, as page text pinned to its place. The callout
 * keeps one slot: beside the story card on wide screens (the chapter's stage starts at its right edge),
 * under the nav on narrower ones (the stage starts below it; Scene setStage). A leader runs from it to
 * a pin on the place, drawn while the camera holds at the place (IndustriesRoad writes its ends). The
 * text swaps with the title, at the middle of each move. It repeats the card's first recommendation,
 * so it is hidden from assistive tech like the heads.
 */
export function IndustryCallout() {
  const at = useIndustryAt();
  return (
    <div data-ch={CH.industries} data-stage className="ind-callout-stage" aria-hidden>
      <span className="ind-leader" />
      <span className="ind-pin" style={toneVars(INDUSTRY_TONE[at])} />
      <div className="ind-callout">
        {INDUSTRIES.map((ind, k) => (
          <div key={ind.name} className="ind-callout-item" data-at={k < at ? "past" : k > at ? "next" : "on"} style={toneVars(INDUSTRY_TONE[k])}>
            <p className="ind-callout-top">
              <span className="ind-callout-chip">
                <i />
                {ind.name}
              </span>
              <span className="ind-callout-status">
                <i />
                {FACES.ready}
              </span>
            </p>
            <p className="t-label ind-callout-label">{INDUSTRY.action}</p>
            <p className="ind-callout-decision">{ind.decision}</p>
            <p className="t-label ind-callout-foot">{ind.system}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
