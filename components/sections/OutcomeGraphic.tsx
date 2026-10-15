"use client";

import type { CSSProperties } from "react";
import { APP_FACTS, EXAMPLE } from "@/lib/example";
import { useDrawOn } from "./AreaArt";
import { useSvgScale } from "./svgScale";

/**
 * Each audience card's colour is the function its main example sits in: dispatch documentation for
 * manufacturers (emerald), RFQ review for distributors (tangerine), service follow-up for service
 * businesses (pink). Index-aligned with AUDIENCE (lib/content.ts). Use with toneVars.
 */
export const OUTCOME_TONE = ["emerald", "tangerine", "pink"] as const;

const L = EXAMPLE.line;
const C = EXAMPLE.cert;
const R = APP_FACTS.rfq;
const S = APP_FACTS.service;

const LABELS = [
  `Delivery line ${L.n}, heat ${L.heat}, linked to its documents: the dimensional report matches, the certificate says ${C.heat} and is flagged, the process certificate is missing.`,
  `An enquiry line asks for ${R.required}; the supplier offer lists ${R.offered}. The difference is flagged and a clarification question drafted.`,
  `A service report recommends a ${S.part.toLowerCase()} at the ${S.when.toLowerCase()}. An internal follow-up is prepared with the incomplete serial left open.`,
];

/** Where an element enters the drawing's build: --t in ms, --i its place in a stagger. */
const at = (t: number, i = 0) => ({ ["--t" as string]: t, ["--i" as string]: i }) as CSSProperties;

/**
 * The picture beside each audience card, on white: the record in the card's colour (currentColor, which
 * .outcome-diagram sets from --tone), hairlines and labels neutral, a conflict in signal red. Every
 * figure comes from lib/example.ts. Used by the audience cards and the nav's glance of them. It builds
 * each time it shows (app/styles/decor-art.css).
 */
export function OutcomeGraphic({ index }: { index: number }) {
  const ref = useSvgScale<SVGSVGElement>(300, 100);
  useDrawOn(ref);
  return (
    <svg ref={ref} className="outcome-diagram" viewBox="0 0 300 100" role="img" aria-label={LABELS[index]}>
      {index === 0 ? <Pack /> : index === 1 ? <Compare /> : <Handover />}
    </svg>
  );
}

/* ---- Manufacturers: one delivery line, three documents, each with its status ---- */

const DOCS = [
  { y: 8, name: "DIMENSIONAL", state: "ok" },
  { y: 38, name: `CERT · ${C.heat}`, state: "risk" },
  { y: 68, name: "HEAT TREAT", state: "missing" },
] as const;

function Pack() {
  return (
    <>
      <rect x="0" y="34" width="86" height="30" rx="7" fill="currentColor" className="og-rise" style={at(0)} />
      <text x="43" y="53" textAnchor="middle" className="og-on og-rise" style={at(60)}>{`L${L.n} · ${L.heat}`}</text>
      {DOCS.map((d, i) => (
        <g key={d.name}>
          <path
            d={`M86 49C120 49 120 ${d.y + 11} 150 ${d.y + 11}`}
            className={`${d.state === "missing" ? "og-without" : "og-link"} og-draw`}
            pathLength={1}
            style={at(220, i)}
          />
          <rect
            x="150"
            y={d.y}
            width="128"
            height="22"
            rx="5"
            className={`${d.state === "missing" ? "og-sent" : "og-ring"} og-rise`}
            style={at(420, i)}
          />
          <text x="160" y={d.y + 15} className={d.state === "risk" ? "og-risk-ink og-rise" : "og-rise"} style={at(480, i)}>
            {d.name}
          </text>
          {d.state === "ok" && (
            <g className="og-rise" style={at(760)}>
              <circle cx="291" cy={d.y + 11} r="7" fill="currentColor" />
              <path d={`M287.6 ${d.y + 11}l2.3 2.3 4.3-4.6`} className="og-check" />
            </g>
          )}
          {d.state === "risk" && <circle cx="291" cy={d.y + 11} r="7" className="og-risk og-rise" style={at(820)} />}
          {d.state === "missing" && <path d={`M286.5 ${d.y + 6.5}l9 9m0-9-9 9`} className="og-safety og-rise" style={at(880)} />}
        </g>
      ))}
    </>
  );
}

/* ---- Distributors: the requirement and the offer, side by side, one difference flagged ---- */

function Compare() {
  return (
    <>
      <text x="0" y="12">ENQUIRY</text>
      <text x="300" y="12" textAnchor="end">OFFER</text>
      <rect x="0" y="22" width="118" height="34" rx="7" fill="currentColor" className="og-rise" style={at(0)} />
      <text x="59" y="44" textAnchor="middle" className="og-on og-rise" style={at(60)}>{R.required}</text>
      <rect x="182" y="22" width="118" height="34" rx="7" className="og-ring og-rise" style={at(160)} />
      <text x="241" y="44" textAnchor="middle" className="og-strong og-rise" style={at(200)}>{R.offered}</text>
      <path className="outcome-stroke og-safety" pathLength="1" d="M122 39H178" style={at(360)} />
      <circle cx="150" cy="39" r="9" className="og-risk og-rise" style={at(620)} />
      <path d="M146 36.5h8m-8 5h8" className="og-check og-rise" style={at(660)} />
      <rect x="62" y="70" width="176" height="22" rx="11" className="og-sent og-rise" style={at(820)} />
      <text x="150" y="85" textAnchor="middle" className="og-num og-rise" style={at(880)}>CLARIFY FIRST</text>
    </>
  );
}

/* ---- Service businesses: a report's recommendation becomes an internal follow-up ---- */

function Handover() {
  return (
    <>
      <rect x="0" y="10" width="92" height="76" rx="7" className="og-ring og-rise" style={at(0)} />
      <text x="12" y="28" className="og-strong og-rise" style={at(60)}>{S.report}</text>
      {[40, 52, 64].map((y, i) => (
        <path key={y} d={`M12 ${y}H${i === 1 ? 80 : 68}`} className={i === 1 ? "og-data og-draw" : "og-hair og-draw"} pathLength={1} style={at(160, i)} />
      ))}
      <path className="outcome-stroke og-data" pathLength="1" d="M96 48H176" style={at(420)} />
      <path d="M170 43l6 5-6 5" className="og-data og-rise" style={at(700)} />
      <rect x="184" y="20" width="116" height="56" rx="8" fill="currentColor" className="og-rise" style={at(760)} />
      <text x="196" y="40" className="og-on og-rise" style={at(820)}>FOLLOW-UP</text>
      <text x="196" y="56" className="og-on-soft og-rise" style={at(860)}>SEAL</text>
      <rect x="196" y="61" width="72" height="11" rx="5.5" className="og-flag og-rise" style={at(960)} />
      <text x="0" y="98">{S.equipment.toUpperCase()}</text>
      <text x="300" y="98" textAnchor="end" className="og-risk-ink">SERIAL INCOMPLETE</text>
    </>
  );
}
