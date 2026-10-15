"use client";

import type { CSSProperties, ReactNode } from "react";
import { APP_FACTS, EXAMPLE } from "@/lib/example";
import { toneVars } from "@/lib/tone";
import { Tick, useServiceArt } from "./ArtKit";

/**
 * "What to expect": one small drawing per expectation, in the area's tone (inherited from main.svc),
 * index-aligned with area.expect. 01 is the decision itself, 02 the evidence or check behind it, 03 the
 * person who approves. Data from a source system keeps that system's colour; risk is signal red.
 */
export function ExpectArt({ slug, index }: { slug: string; index: number }) {
  const ref = useServiceArt(W, H);
  const body = (ART[slug] ?? ART["supply-chain"])[index];
  return (
    <svg ref={ref} className="svc-art xa" viewBox={`0 0 ${W} ${H}`} aria-hidden>
      {body}
    </svg>
  );
}

const W = 240;
const H = 104;
const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as CSSProperties;

/* ---------------------------------------------------------------- shared: the approval control */

const SEG = (W - 16) / 3;

/** Three choices with the chosen one as the solid ink pill, and who made the call underneath. */
function Approval({ options, chosen, stamp, time, hold }: { options: string[]; chosen: number; stamp: string; time?: string; hold?: boolean }) {
  // The pill slides in from a neighbouring choice once, then rests on the decision.
  const from = chosen === 1 ? 0 : 1;
  return (
    <>
      <rect x="8" y="8" width={W - 16} height="32" rx="16" className="k-sheet" />
      <rect
        x={11 + chosen * SEG}
        y="11"
        width={SEG - 6}
        height="26"
        rx="13"
        className="k-ink xa-pill"
        style={{ ["--from" as string]: `${(from - chosen) * SEG}px` }}
      />
      {options.map((o, i) => (
        <text key={o} x={8 + SEG / 2 + i * SEG} y="28" textAnchor="middle" className={i === chosen ? "k-on xa-chosen" : undefined}>
          {o}
        </text>
      ))}
      <path d={`M8 56H${W - 8}`} className="k-hair" />
      <circle cx="19" cy="80" r="10" className="k-fill k-pop" style={d(700)} />
      {hold ? (
        <path d="M16 75.5v9M22 75.5v9" className="k-tick" pathLength={1} style={d(820)} />
      ) : (
        <g style={d(820)}>
          <Tick x={19.5} y={80} />
        </g>
      )}
      <text x="36" y="84" className="k-rise" style={d(760)}>{stamp}</text>
      {time && (
        <text x={W - 8} y="84" textAnchor="end" className="k-val k-rise" style={d(840)}>
          {time}
        </text>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- supply chain */

/** The decision names all four: quantity, source, destination and the deadline it beats. */
function ScDecision() {
  const x = (day: number) => 14 + day * ((W - 28) / 6);
  return (
    <>
      <text x="8" y="14">PLANT 02</text>
      <text x={W - 8} y="14" textAnchor="end">PLANT 01</text>
      <path d={`M24 32H${W - 24}`} className="k-line k-draw" pathLength={1} style={d(100)} />
      <path d={`M${W - 30} 27l6 5-6 5`} className="k-line k-rise" style={d(600)} />
      <circle cx="14" cy="32" r="5.5" className="k-fill" />
      <circle cx={W - 14} cy="32" r="5.5" className="k-ring" />
      <g className="k-rise" style={d(420)}>
        <rect x="76" y="21" width="88" height="22" rx="11" className="k-ink" />
        <text x="120" y="35.5" textAnchor="middle" className="k-on">{EXAMPLE.transfer.units} UNITS</text>
      </g>
      <path d={`M${W - 14} 40V70`} className="k-guide" />
      <path d={`M14 76H${W - 14}`} className="k-axis" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${x(i)} 72v8`} className="k-axis" />
      ))}
      <path d={`M14 76H${x(EXAMPLE.transfer.arrivesDay)}`} className="k-line thick k-draw" pathLength={1} style={d(500)} />
      <circle cx={x(EXAMPLE.transfer.arrivesDay)} cy="76" r="5" className="k-fill k-pop" style={d(900)} />
      <circle cx={x(EXAMPLE.plant01.breachDay)} cy="76" r="5" className="k-risk" />
      <text x="8" y="98">NOW</text>
      <text x={x(EXAMPLE.transfer.arrivesDay)} y="98" textAnchor="middle">ARRIVES D{EXAMPLE.transfer.arrivesDay}</text>
      <text x={W - 8} y="98" textAnchor="end">BREACH D{EXAMPLE.plant01.breachDay}</text>
    </>
  );
}

/** Four sources side by side on one baseline, each in its system's colour. */
function ScEvidence() {
  const base = 72;
  const k = 42 / EXAMPLE.plant02.stock; // the tallest bar, Plant 02's 620 units, is 42 tall
  const cols: { tone: string; label: string; value: string; art: (c: number) => ReactNode }[] = [
    {
      tone: "cobalt",
      label: "ERP",
      value: String(EXAMPLE.plant01.onHand),
      art: (c) => (
        <>
          <rect x={c - 9} y={base - EXAMPLE.plant01.onHand * k} width="18" height={EXAMPLE.plant01.onHand * k} rx="3" className="k-fill k-up" />
          <path d={`M${c - 16} ${base - EXAMPLE.plant01.safety * k}H${c + 16}`} className="k-plan" />
        </>
      ),
    },
    {
      tone: "saffron",
      label: "WMS",
      value: String(EXAMPLE.plant02.stock),
      art: (c) => (
        <>
          <rect x={c - 9} y={base - EXAMPLE.plant02.stock * k} width="18" height={EXAMPLE.plant02.stock * k} rx="3" className="k-fill k-up" />
          <path d={`M${c - 16} ${base - EXAMPLE.plant02.ownPlan * k}H${c + 16}`} className="k-plan" />
        </>
      ),
    },
    {
      tone: "violet",
      label: "CRM",
      value: `+${EXAMPLE.demand.upPct}%`,
      art: (c) => (
        <>
          {[EXAMPLE.demand.before, (EXAMPLE.demand.before + EXAMPLE.demand.now) / 2, EXAMPLE.demand.now].map((v, i) => {
            const h = 42 * (v / EXAMPLE.demand.now) - (2 - i) * 5;
            return <rect key={i} x={c - 13 + i * 9} y={base - h} width="7" height={h} rx="2" className="k-fill k-up" style={d(120 + i * 60)} />;
          })}
        </>
      ),
    },
    {
      tone: "tangerine",
      label: "SUP",
      value: `D${EXAMPLE.supplier.nextDeliveryDay}`,
      // The next delivery against the calendar: day 21, long after Plant 01's day 6 breach.
      art: (c) => {
        const day = (n: number) => c - 18 + (36 * n) / EXAMPLE.supplier.nextDeliveryDay;
        return (
          <>
            <rect x={c - 18} y={base - 22} width="36" height="4" rx="2" className="k-track" />
            <circle cx={day(EXAMPLE.plant01.breachDay)} cy={base - 20} r="3.5" className="k-risk" />
            <circle cx={day(EXAMPLE.supplier.nextDeliveryDay)} cy={base - 20} r="4.5" className="k-fill k-pop" style={d(640)} />
          </>
        );
      },
    },
  ];
  return (
    <>
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="10" className="k-sheet" />
      {cols.map((col, i) => {
        const c = 30 + i * 60;
        return (
          <g key={col.label} style={toneVars(col.tone)}>
            {i > 0 && <path d={`M${i * 60} 12V92`} className="k-hair" />}
            <circle cx={c - 12} cy="18" r="3.5" className="k-fill" />
            <text x={c - 5} y="22">{col.label}</text>
            <g style={d(160 + i * 60)}>{col.art(c)}</g>
            <path d={`M${c - 20} ${base}H${c + 20}`} className="k-axis" />
            <text x={c} y="91" textAnchor="middle" className="k-val">{col.value}</text>
          </g>
        );
      })}
    </>
  );
}

/* ---------------------------------------------------------------- operations */

/** The vibration signal arrives as a proposed slot in Friday's planned window, not as an alert. */
function OpDecision() {
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const cw = (W - 16 - 4 * 4) / 5;
  const trace = [44, 46, 43, 45, 41, 43, 38, 36, 31, 27];
  const pts = trace.map((y, i) => `${8 + i * 21} ${y}`).join(" L");
  const fri = 8 + 4 * (cw + 4);
  return (
    <>
      <text x="8" y="12">M-041 VIBRATION</text>
      <path d={`M8 30H${W - 8}`} className="k-safety" />
      <path d={`M${pts}`} className="k-line k-draw" pathLength={1} style={d(100)} />
      <circle cx={8 + 9 * 21} cy="27" r="4.5" className="k-risk" />
      <path d={`M${8 + 9 * 21} 33V58`} className="k-guide" />
      {days.map((day, i) => {
        const x = 8 + i * (cw + 4);
        return (
          <g key={day}>
            {i < 4 ? (
              <rect x={x} y="62" width={cw} height="20" rx="4" className="k-track" />
            ) : (
              <rect x={x} y="62" width={cw} height="20" rx="4" className="k-fill k-pop" style={d(700)} />
            )}
            <text x={x + cw / 2} y="98" textAnchor="middle" className={i === 4 ? "k-strong" : undefined}>{day}</text>
          </g>
        );
      })}
      <g style={d(860)}>
        <Tick x={fri + cw / 2 + 0.5} y={72} />
      </g>
    </>
  );
}

/** Six lots queue at Line 03 while Line 02 has room: three of them move across before the 14:00 shift. */
function OpBottleneck() {
  const { queued, moved, shift } = APP_FACTS.production;
  const x0 = 64;
  const gap = 4;
  const lw = (W - 8 - x0 - (queued - 1) * gap) / queued;
  const lx = (i: number) => x0 + i * (lw + gap);
  // The lots that move leave from the back of Line 03's queue and land at the front of Line 02's.
  const from = (lx(queued - moved) + lx(queued - 1) + lw) / 2;
  const to = (lx(0) + lx(moved - 1) + lw) / 2;
  return (
    <>
      <text x="8" y="27" className="k-strong">{APP_FACTS.production.queuedAt.toUpperCase()}</text>
      <text x="8" y="69">{APP_FACTS.production.to.toUpperCase()}</text>
      {Array.from({ length: queued }, (_, i) => (
        <rect key={`q${i}`} x={lx(i)} y="14" width={lw} height="18" rx="4" className={i < queued - moved ? "k-fill" : "k-ghost"} />
      ))}
      {Array.from({ length: queued }, (_, i) => (
        <rect
          key={`f${i}`}
          x={lx(i)}
          y="56"
          width={lw}
          height="18"
          rx="4"
          className={i < moved ? "k-fill k-pop" : "k-track"}
          style={i < moved ? d(760 + i * 70) : undefined}
        />
      ))}
      <path d={`M${from} 36C${from} 46 ${to} 42 ${to} 51`} className="k-line k-draw" pathLength={1} style={d(240)} />
      <path d={`M${to - 4} 47l4 4 4-4`} className="k-line k-rise" style={d(640)} />
      <text x={x0} y="98">{moved} LOTS MOVE</text>
      <text x={W - 8} y="98" textAnchor="end" className="k-val">BEFORE {shift}</text>
    </>
  );
}

/* ---------------------------------------------------------------- commercial */

/** Allocated stock against validated orders by region: West is where they drift apart. */
function CoDrift() {
  const rows = [
    { name: "NORTH", alloc: 128, orders: 120 },
    { name: "EAST", alloc: 112, orders: 106 },
    { name: "WEST", alloc: 92, orders: 148 },
  ];
  const x0 = 64;
  return (
    <>
      <text x="8" y="12">REGION</text>
      <text x={W - 8} y="12" textAnchor="end">ALLOCATED · ORDERS</text>
      {rows.map((r, i) => {
        const y = 34 + i * 26;
        const drift = r.orders > r.alloc;
        return (
          <g key={r.name}>
            <text x="8" y={y + 4} className={drift ? "k-strong" : undefined}>{r.name}</text>
            <rect x={x0} y={y - 5} width={W - 8 - x0} height="10" rx="5" className="k-track" />
            <rect x={x0} y={y - 5} width={r.alloc} height="10" rx="5" className="k-fill k-grow" style={d(120 + i * 60)} />
            {drift && <path d={`M${x0 + r.alloc + 3} ${y}H${x0 + r.orders - 3}`} className="k-risk-line k-draw" pathLength={1} style={d(640)} />}
            <path d={`M${x0 + r.orders} ${y - 9}v18`} className="k-mark" />
          </g>
        );
      })}
    </>
  );
}

/** The move to West is sized inside the stock that can actually ship. */
function CoSized() {
  const cur = 120;
  const add = 36;
  const avail = 188;
  return (
    <>
      <text x="8" y="14">WEST DEALERS</text>
      <text x={8 + cur + add / 2} y="34" textAnchor="middle" className="k-val k-rise" style={d(700)}>+12%</text>
      <rect x="8" y="42" width={W - 16} height="16" rx="8" className="k-track" />
      <rect x={8 + cur - 8} y="42" width={add + 8} height="16" rx="8" className="k-soft k-grow" style={d(420)} />
      <rect x="8" y="42" width={cur} height="16" rx="8" className="k-fill" />
      <path d={`M${8 + avail} 38V72`} className="k-guide" />
      <text x="8" y="94">ALLOCATED</text>
      <text x={8 + avail} y="94" textAnchor="middle">CAN SHIP</text>
      <circle cx={8 + avail} cy="28" r="7" className="k-fill k-pop" style={d(960)} />
      <g style={d(1040)}>
        <Tick x={8 + avail + 0.4} y={28} s={0.75} />
      </g>
    </>
  );
}

/* ---------------------------------------------------------------- customer */

/** Fourteen cases share one part; the four that do not stay out of the group. */
function CuGrouped() {
  const others = new Set([3, 8, 13, 16]);
  const tiles = Array.from({ length: 18 }, (_, i) => ({ x: 8 + (i % 6) * 18, y: 12 + Math.floor(i / 6) * 28, linked: !others.has(i) }));
  return (
    <>
      {tiles.map((t, i) =>
        t.linked ? (
          <path key={`l${i}`} d={`M${t.x + 12} ${t.y + 9}C${t.x + 60} ${t.y + 9} 110 52 136 52`} className="k-link k-draw" pathLength={1} style={d(200 + i * 20)} />
        ) : null,
      )}
      {tiles.map((t, i) => (
        <rect key={i} x={t.x} y={t.y} width="12" height="18" rx="2.5" className={t.linked ? "k-fill" : "k-sheet"} />
      ))}
      <text x="184" y="32" textAnchor="middle">SHARED PART</text>
      <g className="k-rise" style={d(600)}>
        <rect x="136" y="40" width="96" height="24" rx="12" className="k-ink" />
        <text x="184" y="56" textAnchor="middle" className="k-on">{EXAMPLE.part.toUpperCase()}</text>
      </g>
      <text x="184" y="84" textAnchor="middle" className="k-val k-rise" style={d(760)}>14 cases</text>
    </>
  );
}

/** Escalation risk climbs; the case is flagged while there is still time before the SLA. */
function CuEarly() {
  const flag = 132;
  return (
    <>
      <text x="8" y="12">ESCALATION RISK</text>
      <path d={`M8 44H${W - 8}`} className="k-safety" />
      <path d={`M8 72C70 70 110 58 ${flag} 44S200 16 ${W - 8} 12`} className="k-line k-draw" pathLength={1} style={d(100)} />
      <path d={`M${flag} 50V76`} className="k-guide" />
      <circle cx={flag} cy="44" r="5" className="k-fill k-pop" style={d(700)} />
      <path d={`M8 80H${W - 8}`} className="k-axis" />
      <path d={`M${flag} 80H${W - 14}`} className="k-line thick k-draw" pathLength={1} style={d(820)} />
      <circle cx={W - 8} cy="80" r="5" className="k-risk" />
      <text x="8" y="98">NOW</text>
      <text x={flag} y="98" textAnchor="middle">FLAGGED</text>
      <text x={W - 8} y="98" textAnchor="end">SLA</text>
    </>
  );
}

/* ---------------------------------------------------------------- finance and risk */

/** Exceptions sorted by risk and value; they slide from arrival order into rank once. */
function FrRanked() {
  // Values in rank order; `arrived` is each one's place in the inbox before ranking.
  const rows = [
    { v: 158, risk: true, arrived: 3 },
    { v: 134, risk: true, arrived: 0 },
    { v: 110, risk: true, arrived: 4 },
    { v: 76, risk: false, arrived: 1 },
    { v: 48, risk: false, arrived: 2 },
  ];
  const step = 17;
  return (
    <>
      <text x="8" y="12">RISK</text>
      <text x="44" y="12">VALUE</text>
      {rows.map((_, i) => (
        <text key={i} x={W - 8} y={32 + i * step + 4} textAnchor="end" className="k-val">{i + 1}</text>
      ))}
      {rows.map((r, i) => (
        <g key={`r${i}`} className="xa-row" style={{ ["--from" as string]: `${(r.arrived - i) * step}px`, ...d(200 + i * 40) }}>
          <circle cx="16" cy={32 + i * step} r="4" className={r.risk ? "k-risk" : "k-dot"} />
          <rect x="44" y={32 + i * step - 4} width={r.v} height="8" rx="4" className={r.risk ? "k-fill" : "k-soft-fill"} />
        </g>
      ))}
    </>
  );
}

/** Three-way match: purchase order and invoice agree, the goods receipt is missing, so payment holds. */
function FrEvidence() {
  const docs = [
    { name: "PO", ok: true },
    { name: "RECEIPT", ok: false },
    { name: "INVOICE", ok: true },
  ];
  return (
    <>
      <path d="M38 72H202" className="k-axis" />
      {docs.map((doc, i) => {
        const x = 12 + i * 80;
        return (
          <g key={doc.name}>
            <path d={`M${x + 26} 64V72`} className="k-axis" />
            <rect x={x} y="10" width="52" height="54" rx="6" className={doc.ok ? "k-sheet" : "k-missing"} />
            {[0, 1, 2].map((l) => (
              <rect key={l} x={x + 9} y={22 + l * 9} width={l === 2 ? 20 : 34} height="4" rx="2" className={doc.ok ? "k-track" : "k-track faint"} />
            ))}
            {doc.ok ? (
              <>
                <circle cx={x + 52} cy="12" r="8" className="k-fill k-pop" style={d(300 + i * 160)} />
                <g style={d(380 + i * 160)}>
                  <Tick x={x + 52.4} y={12} s={0.8} />
                </g>
              </>
            ) : (
              <circle cx={x + 52} cy="12" r="6" className="k-risk" />
            )}
            <text x={x + 26} y="92" textAnchor="middle" className={doc.ok ? undefined : "k-risk-ink"}>{doc.name}</text>
          </g>
        );
      })}
    </>
  );
}

const ART: Record<string, ReactNode[]> = {
  "supply-chain": [
    <ScDecision key="0" />,
    <ScEvidence key="1" />,
    <Approval key="2" options={["APPROVE", "ADJUST", "REJECT"]} chosen={0} stamp="APPROVED BY PLANNER" time={EXAMPLE.transfer.approvedAt} />,
  ],
  operations: [
    <OpDecision key="0" />,
    <OpBottleneck key="1" />,
    <Approval key="2" options={["APPROVE", "ADJUST", "REJECT"]} chosen={0} stamp="APPROVED BY SUPERVISOR" />,
  ],
  commercial: [
    <CoDrift key="0" />,
    <CoSized key="1" />,
    <Approval key="2" options={["APPROVE", "ADJUST", "REJECT"]} chosen={0} stamp="APPROVED BY SALES OPS" />,
  ],
  customer: [
    <CuGrouped key="0" />,
    <CuEarly key="1" />,
    <Approval key="2" options={["APPROVE", "ADJUST", "REJECT"]} chosen={0} stamp="APPROVED BY TEAM LEAD" />,
  ],
  "finance-and-risk": [
    <FrRanked key="0" />,
    <FrEvidence key="1" />,
    <Approval key="2" options={["APPROVE", "HOLD", "REJECT"]} chosen={1} stamp="HELD BY REVIEWER" hold />,
  ],
};
