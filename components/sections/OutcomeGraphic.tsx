"use client";

import type { CSSProperties } from "react";
import { EXAMPLE, plant01Stock, units } from "@/lib/example";
import { useDrawOn } from "./AreaArt";
import { useSvgScale } from "./svgScale";

/**
 * Each outcome's colour is the system its figure comes from (D6): the transfer's timing rides the
 * route (external feeds, pink), Plant 02's own plan is warehouse stock (WMS, saffron), and the linked
 * service cases come from the CRM (violet). Index-aligned with OUTCOMES. Use with toneVars.
 */
export const OUTCOME_TONE = ["pink", "saffron", "violet"] as const;

const { plant01: P1, plant02: P2, transfer: T } = EXAMPLE;

const LABELS = [
  `Plant 01 stock by day. The ${units(T.units)} transfer lands on day ${T.arrivesDay}, so stock stays above safety stock; without it, stock falls below safety stock on day ${P1.breachDay}.`,
  `Plant 02 holds ${units(P2.stock)}. It keeps ${units(P2.ownPlan)} for its own plan and sends the ${units(P2.transferable)} above it to Plant 01.`,
  "Fourteen service cases share Bearing X90 and reach one owner in Quality as a single escalation.",
];

/** Where an element enters the drawing's build: --t in ms, --i its place in a stagger. */
const at = (t: number, i = 0) => ({ ["--t" as string]: t, ["--i" as string]: i }) as CSSProperties;

/**
 * The picture behind each outcome, on white: the data in the outcome's colour (currentColor, which
 * .outcome-diagram sets from --tone), axes, ticks and labels neutral, risk in signal red. Every figure
 * comes from lib/example.ts. Used by Outcomes and by the nav's glance of it. It builds each time it
 * shows (app/styles/decor-art.css).
 */
export function OutcomeGraphic({ index }: { index: number }) {
  const ref = useSvgScale<SVGSVGElement>(300, 100);
  useDrawOn(ref);
  return (
    <svg ref={ref} className="outcome-diagram" viewBox="0 0 300 100" role="img" aria-label={LABELS[index]}>
      {index === 0 ? <Forecast /> : index === 1 ? <Split /> : <Escalation />}
    </svg>
  );
}

/* ---- Act earlier: Plant 01's stock forecast, with and without the transfer ---- */

const X = (day: number) => 20 + day * 44;
/** Stock 100 to 600 units on y 74 to 14. */
const Y = (v: number) => +(74 - (v - 100) * 0.12).toFixed(1);
const DAYS = Array.from({ length: P1.breachDay + 1 }, (_, d) => d);

function Forecast() {
  const arrive = T.arrivesDay;
  const last = P1.breachDay;
  const before = plant01Stock(arrive);
  const withT = `M${X(0)} ${Y(P1.onHand)}L${X(arrive)} ${Y(before)}V${Y(plant01Stock(arrive, true))}L${X(last)} ${Y(plant01Stock(last, true))}`;
  const without = `M${X(arrive)} ${Y(before)}L${X(last)} ${Y(plant01Stock(last))}`;
  return (
    <>
      <path d={`M${X(0)} 74H${X(last)}`} className="og-hair" />
      {DAYS.map((d) => (
        <path key={d} d={`M${X(d)} 74v4`} className="og-hair" />
      ))}
      <path d={`M${X(0)} ${Y(P1.safety)}H${X(last)}`} className="og-safety og-rise" style={at(0)} />
      <text x={X(0)} y={Y(P1.safety) - 5} className="og-rise" style={at(80)}>
        SAFETY <tspan className="og-strong">{P1.safety}</tspan>
      </text>
      <path d={without} className="og-without og-rise" style={at(560)} />
      <path className="outcome-stroke og-data" pathLength="1" d={withT} style={at(120)} />
      <circle cx={X(arrive)} cy={Y(plant01Stock(arrive, true))} r="4.5" className="og-dot og-rise" style={at(560)} />
      <text x={X(arrive) - 8} y={Y(plant01Stock(arrive, true)) + 12} textAnchor="end" className="og-num og-rise" style={at(640)}>
        +{T.units}
      </text>
      <circle cx={X(last)} cy={Y(plant01Stock(last))} r="4.5" className="og-risk og-rise" style={at(900)} />
      {DAYS.map((d) => (
        <text
          key={d}
          x={X(d)}
          y="94"
          textAnchor="middle"
          className={d === arrive ? "og-num" : d === last ? "og-risk-ink" : undefined}
        >
          {d === 0 ? "NOW" : `D${d}`}
        </text>
      ))}
    </>
  );
}

/* ---- Protect both plants: Plant 02's stock, split at its own plan ---- */

function Split() {
  const kept = +((300 * P2.ownPlan) / P2.stock).toFixed(1);
  return (
    <>
      <text x="0" y="12">PLANT 02 STOCK</text>
      <text x="300" y="12" textAnchor="end" className="og-strong">{P2.stock}</text>
      <rect className="outcome-bar" x="0" y="22" width={kept} height="22" rx="4" fill="currentColor" style={at(0)} />
      <rect x={kept + 2.5} y="22.5" width={300 - kept - 3} height="21" rx="3.5" className="og-sent og-rise" style={at(520)} />
      <path d={`M${kept + 1.25} 16V50`} className="og-mark" />
      <path d={`M0.5 54v5H${kept - 2}v-5`} className="og-hair og-rise" style={at(600)} />
      <path d={`M${kept + 4} 54v5H299.5v-5`} className="og-hair og-rise" style={at(680)} />
      <text x={kept / 2} y="76" textAnchor="middle" className="og-rise" style={at(640)}>
        <tspan className="og-strong">{P2.ownPlan}</tspan> OWN PLAN
      </text>
      <text x={(kept + 300) / 2 + 2} y="76" textAnchor="middle" className="og-rise" style={at(720)}>
        <tspan className="og-strong">{P2.transferable}</tspan> TO PLANT 01
      </text>
    </>
  );
}

/* ---- Fix the cause once: fourteen cases, one shared part, one owner ---- */

const TILES = Array.from({ length: 14 }, (_, i) => ({ x: (i % 7) * 19, y: i < 7 ? 20 : 46 }));
const HUB = { x: 196, y: 40 };
const OWNER = 268;

function Escalation() {
  return (
    <>
      {TILES.map((t, i) => (
        <path
          key={`l${i}`}
          d={`M${t.x + 12} ${t.y + 8}C${t.x + 50} ${t.y + 8} 160 ${HUB.y} ${HUB.x - 18} ${HUB.y}`}
          className="og-link og-draw"
          pathLength={1}
          style={at(260, i)}
        />
      ))}
      {TILES.map((t, i) => (
        <rect key={`t${i}`} x={t.x} y={t.y} width="12" height="16" rx="2.5" fill="currentColor" className="og-rise" style={at(0, i)} />
      ))}
      <g className="og-rise" style={at(560)}>
        <g transform={`translate(${HUB.x} ${HUB.y})`}>
          <circle r="17" className="og-ring" />
          <circle r="6.5" className="og-ring" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <circle key={i} cx={(11.75 * Math.cos(a)).toFixed(2)} cy={(11.75 * Math.sin(a)).toFixed(2)} r="2.6" fill="currentColor" />;
          })}
        </g>
      </g>
      <path className="outcome-stroke og-data" pathLength="1" d={`M${HUB.x + 18} ${HUB.y}H${OWNER - 16}`} style={at(720)} />
      <g className="og-rise" style={at(1000)}>
        <circle cx={OWNER} cy={HUB.y} r="15" fill="currentColor" />
        <path d={`M${OWNER - 6.5} ${HUB.y}l4.5 4.5 8.5-9`} className="og-check" />
      </g>
      <text x="0" y="94">
        <tspan className="og-strong">14</tspan> CASES
      </text>
      <text x={HUB.x} y="94" textAnchor="middle">X90</text>
      <text x={OWNER} y="94" textAnchor="middle" className="og-strong">QUALITY</text>
    </>
  );
}
