"use client";

import { EXAMPLE } from "@/lib/example";
import { useSvgScale } from "../svgScale";

/**
 * The seven trail stations, each a small drawing of its own fact from the running example. They share
 * one 140 x 104 frame so the row reads as one instrument: the floor at y 80, data tops at y 22, labels
 * on the floor row at y 98, one stroke weight per role (data 2, outlines 1.25, axes 1). 01, 06 and 07
 * share the same seven-tick axis. The step's --tone colours the data; risk is always signal red.
 *
 * Every part draws from the station's --q (0 to 1, written by TrailDial.tsx as the hand reaches it):
 * the frame first (--a), then the data (--b), then marks and figures (--c). See decor-trail.css.
 */

const W = 140;
const H = 104;
const FLOOR = 80;
const TOP = 22;
const LABEL = 98;
/** The shared seven-tick axis: days 0 to 6, or ten-minute steps for the approval. */
const tick = (i: number) => 4 + i * 22;
const f = (n: number) => +n.toFixed(2);
const num = (n: number) => n.toLocaleString("en-US");

const P1 = EXAMPLE.plant01;
const P2 = EXAMPLE.plant02;
const T = EXAMPLE.transfer;
const D = EXAMPLE.demand;

/**
 * The empty band above each drawing's content, in drawing units. The row keeps the shared frame so
 * every floor lines up; phones, where each drawing stands alone under its text, trim it away.
 */
const HEADROOM = [18, 6, 18, 17, 42, 30, 42];

export function TrailArt({ index }: { index: number }) {
  const ref = useSvgScale<SVGSVGElement>(W, H);
  const Art = ARTS[index];
  return (
    <svg ref={ref} className="tr-art" viewBox={`0 0 ${W} ${H}`} style={{ ["--headroom" as string]: HEADROOM[index] }} aria-hidden>
      <Art />
    </svg>
  );
}

function Floor({ ticks = false }: { ticks?: boolean }) {
  return (
    <>
      <path d={`M0 ${FLOOR}H${W}`} className="tg-floor" pathLength={1} />
      {ticks && Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${tick(i)} ${FLOOR}v4`} className="tg-tick" />)}
    </>
  );
}

/** 01 Signal: Plant 01 stock steps down 45 a day and crosses safety stock on day 6. */
function Signal() {
  const days = Array.from({ length: P1.breachDay + 1 }, (_, d) => P1.onHand - d * P1.dailyUse);
  const low = days[P1.breachDay];
  const y = (s: number) => f(TOP + ((P1.onHand - s) * (FLOOR - 6 - TOP)) / (P1.onHand - low));
  // Daily points joined by a line; it crosses safety stock between day 5 and day 6.
  const cross = (P1.onHand - P1.safety) / P1.dailyUse;
  const xCross = f(tick(0) + cross * 22);
  const end = tick(P1.breachDay);
  return (
    <>
      <Floor ticks />
      <path d={`M0 ${y(P1.safety)}H${W}`} className="tg-ref" />
      <text x="0" y={y(P1.safety) - 6} className="tg-al">SAFETY</text>
      <path d={`M${tick(0)} ${y(days[0])}L${xCross} ${y(P1.safety)}`} className="tg-line is-ink" pathLength={1} />
      <path d={`M${xCross} ${y(P1.safety)}L${end} ${y(low)}`} className="tg-line is-risk tg-late" pathLength={1} />
      <g className="tg-mark">
        <circle cx={end} cy={y(low)} r="3.5" className="tg-risk-dot tg-pulse" />
      </g>
      <text x="0" y={LABEL} className="tg-al">NOW</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-risk">{`D${P1.breachDay}`}</text>
    </>
  );
}

/** 02 Evidence: open orders by week, 950 three weeks ago to 1,120 now (+18%). */
function Evidence() {
  const vals = Array.from({ length: D.weeks + 1 }, (_, i) => D.before + ((D.now - D.before) * i) / D.weeks);
  const h = (v: number) => (v * (FLOOR - TOP)) / D.now;
  const ref = f(FLOOR - h(D.before));
  return (
    <>
      <Floor />
      <path d={`M0 ${ref}H${W}`} className="tg-ref" />
      {vals.map((v, i) => {
        const last = i === vals.length - 1;
        return last ? (
          <rect key={i} x={i * 40} y={f(FLOOR - h(v))} width="20" height={f(h(v))} rx="2" className="tg-solid tg-bar" style={{ ["--i" as string]: i }} />
        ) : (
          <rect key={i} x={i * 40 + 0.625} y={f(FLOOR - h(v) + 0.625)} width="18.75" height={f(h(v) - 0.625)} rx="1.5" className="tg-hollow tg-bar" style={{ ["--i" as string]: i }} />
        );
      })}
      <text x={W} y={TOP - 7} textAnchor="end" className="tg-key">{`+${D.upPct}%`}</text>
      <text x="0" y={LABEL} className="tg-al">{num(D.before)}</text>
      <text x={W} y={LABEL} textAnchor="end">{num(D.now)}</text>
    </>
  );
}

/** 03 Context: Plant 02 holds 620 against a 380 plan; the 240 above it is free to move. */
function Context() {
  const k = (FLOOR - TOP) / P2.stock;
  const plan = f(FLOOR - P2.ownPlan * k);
  return (
    <>
      <Floor />
      <rect x="0.625" y={TOP + 0.625} width="32.75" height={FLOOR - TOP - 0.625} rx="2" className="tg-hollow tg-grow" />
      <rect x="0" y={TOP} width="34" height={f(plan - TOP)} rx="2" className="tg-solid tg-fill-in" />
      <path d={`M0 ${plan}H${W}`} className="tg-ref" />
      <path d={`M40 ${TOP + 0.5}h3V${plan - 0.5}h-3`} className="tg-dim tg-fade" />
      <text x="49" y={f((TOP + plan) / 2 + 4)} className="tg-key">{num(P2.transferable)}</text>
      <text x={W} y={f(plan + 13)} textAnchor="end" className="tg-al">{`PLAN ${num(P2.ownPlan)}`}</text>
      <text x="0" y={LABEL} className="tg-al">PLANT 02</text>
    </>
  );
}

/** 04 Policy: a 300-unit cap per transfer; the 240-unit move (3 pallets of 80) sits inside it. */
function Policy() {
  const max = EXAMPLE.policy.maxUnits;
  const slot = (FLOOR - TOP) * (T.perPallet / max);
  const fill = f(FLOOR - T.units * ((FLOOR - TOP) / max));
  return (
    <>
      <Floor />
      <rect x="0.625" y={TOP} width="32.75" height={FLOOR - TOP} rx="2" className="tg-hollow tg-grow" />
      {Array.from({ length: T.pallets }, (_, j) => (
        <rect key={j} x="4" y={f(FLOOR - (j + 1) * slot + 2)} width="26" height={f(slot - 2)} rx="1.5" className="tg-solid tg-bar" style={{ ["--i" as string]: j }} />
      ))}
      <path d={`M-3 ${TOP}H37`} className="tg-line tg-late" pathLength={1} />
      <text x="44" y={TOP + 4} className="tg-key">{`MAX ${max}`}</text>
      <path d={`M40 ${fill + 0.5}h3V${FLOOR - 0.5}h-3`} className="tg-dim tg-fade" />
      <text x="49" y={f((fill + FLOOR) / 2 + 4)} className="tg-ink">{num(T.units)}</text>
      <text x="0" y={LABEL} className="tg-al">{`${T.pallets} × ${T.perPallet}`}</text>
    </>
  );
}

/** The plant outline from the areas drawing (AreaArt), at a third of the size, standing on the floor. */
function Plant({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${FLOOR - 68})`} className="tg-glyph">
      <path d="M0 68V51.8l8.1 4.5v-4.5l8.1 4.5v-8.2h11.7V68z" />
      <path d="M19.8 48.1v-7.2h3.6v7.2" />
    </g>
  );
}

/** 05 Decision: the 240-unit load leaves Plant 02 for Plant 01. */
function Decision() {
  return (
    <>
      <Floor />
      <Plant x={0} />
      <Plant x={112} />
      <path d={`M32 ${FLOOR}H106`} className="tg-line" pathLength={1} />
      <path d={`M101.5 ${FLOOR - 4}L106 ${FLOOR}l-4.5 4`} className="tg-line tg-fade" />
      <g transform={`translate(51 ${FLOOR - 68})`}>
        <g className="tg-load">
          {Array.from({ length: T.pallets }, (_, j) => (
            <rect key={j} x={1 + j * 10} y="49" width="8" height="8" rx="1.5" className="tg-solid" />
          ))}
          <rect x="0" y="58" width="32" height="2" rx="1" className="tg-chassis" />
          <path d="M32.6 60V51.6h4.8l3 3.8V60z" className="tg-cab" />
          <circle cx="7" cy="64" r="2.6" className="tg-wheel" />
          <circle cx="26" cy="64" r="2.6" className="tg-wheel" />
          <circle cx="36" cy="64" r="2.6" className="tg-wheel" />
        </g>
      </g>
      <text x="71" y={FLOOR - 28} textAnchor="middle" className="tg-key">{num(T.units)}</text>
      <text x="0" y={LABEL} className="tg-al">PLANT 02</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-al">PLANT 01</text>
    </>
  );
}

/** 06 Approval: the planner signs off TRF-0240 at 09:42, on a 09:00 to 10:00 axis. */
function Approval() {
  const [hh, mm] = T.approvedAt.split(":").map(Number);
  const x = f(tick(0) + (mm / 60) * (tick(6) - tick(0)));
  return (
    <>
      <Floor ticks />
      <path d={`M${x} ${FLOOR}V53`} className="tg-stem" pathLength={1} />
      <g className="tg-mark">
        <circle cx={x} cy="42" r="10" className="tg-solid" />
        <path d={`M${x - 4.6} 42.2l3.2 3.2 6-6.4`} className="tg-check" />
      </g>
      <text x={x - 16} y="40" textAnchor="end" className="tg-ink">{T.approvedBy.toUpperCase()}</text>
      <text x={x - 16} y="53" textAnchor="end">{T.id}</text>
      <text x="0" y={LABEL} className="tg-al">{`${String(hh).padStart(2, "0")}:00`}</text>
      <text x={x} y={LABEL} textAnchor="middle" className="tg-key">{T.approvedAt}</text>
    </>
  );
}

/** 07 Result: the load lands on day 2, four days ahead of the day 6 breach it prevents. */
function Result() {
  const arrive = tick(T.arrivesDay);
  const breach = tick(P1.breachDay);
  const lane = FLOOR - 22;
  return (
    <>
      <Floor ticks />
      <path d={`M${tick(0)} ${lane}H${arrive}`} className="tg-line" pathLength={1} />
      <circle cx={tick(0)} cy={lane} r="2.5" className="tg-hollow tg-fade" />
      <g className="tg-mark">
        <circle cx={arrive} cy={lane} r="4" className="tg-solid tg-ring" />
      </g>
      <path d={`M${arrive + 8} ${lane}H${breach - 8}M${arrive + 8} ${lane - 3.5}v7M${breach - 8} ${lane - 3.5}v7`} className="tg-dim tg-fade" />
      <text x={(arrive + breach) / 2} y={lane - 7} textAnchor="middle" className="tg-ink">{`${P1.breachDay - T.arrivesDay} DAYS`}</text>
      <g className="tg-mark">
        <circle cx={breach} cy={lane} r="4" className="tg-risk-ring" />
      </g>
      <text x="0" y={LABEL} className="tg-al">NOW</text>
      <text x={arrive} y={LABEL} textAnchor="middle" className="tg-key">{`D${T.arrivesDay}`}</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-risk">{`D${P1.breachDay}`}</text>
    </>
  );
}

const ARTS = [Signal, Evidence, Context, Policy, Decision, Approval, Result];
