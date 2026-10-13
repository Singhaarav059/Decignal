"use client";

import type { CSSProperties } from "react";
import { APP_FACTS, EXAMPLE } from "@/lib/example";
import { toneVars } from "@/lib/tone";
import { Tick, useServiceArt } from "./ArtKit";

/**
 * "Why Decignal": the three shared points as one chain, a panel above each. 01 the systems the area
 * reads, read-only, feeding one line; 02 the recommendation with its signal, records and policy check;
 * 03 the named approver, their limit and the call they made. The panels share a vertical centre, and
 * on desktop a connector across each column gap (CSS) joins them into one diagram.
 */
type Why = {
  systems: { label: string; tone?: string }[];
  action: string;
  signal: string;
  records: { dots: (string | undefined)[]; text: string };
  policy: string;
  role: string;
  /** A request against its limit (the meter), or a plain rule when the area has no figure for it. */
  limit?: { value: number; max: number; unit: string };
  rule?: string;
  outcome: string;
  hold?: boolean;
};

const SIX = [
  { label: "ERP", tone: "cobalt" },
  { label: "WMS", tone: "saffron" },
  { label: "MES", tone: "emerald" },
  { label: "CRM", tone: "violet" },
  { label: "SUP", tone: "tangerine" },
  { label: "EXT", tone: "pink" },
];

const WHY: Record<string, Why> = {
  "supply-chain": {
    systems: SIX,
    action: `Transfer ${EXAMPLE.transfer.units} units`,
    signal: `${EXAMPLE.plant01.name}, day ${EXAMPLE.plant01.breachDay}`,
    records: { dots: ["cobalt", "saffron", "tangerine"], text: "ERP · WMS · SUP" },
    policy: `Max ${EXAMPLE.policy.maxUnits} units`,
    role: EXAMPLE.policy.approver,
    limit: { value: EXAMPLE.transfer.units, max: EXAMPLE.policy.maxUnits, unit: "units" },
    outcome: `Approved ${EXAMPLE.transfer.approvedAt}`,
  },
  operations: {
    systems: [{ label: "MES", tone: "emerald" }, { label: "ERP", tone: "cobalt" }, { label: "CMMS" }, { label: "SCADA" }],
    action: "Replace bearing, M-041",
    signal: `Vibration ${APP_FACTS.maintenance.peak}`,
    records: { dots: ["emerald", "cobalt", undefined], text: "MES · ERP · CMMS" },
    policy: "Planned window",
    role: "Supervisor",
    rule: "Shift plan first",
    outcome: "Approved for Friday",
  },
  commercial: {
    systems: [{ label: "CRM", tone: "violet" }, { label: "ERP", tone: "cobalt" }, { label: "DMS" }],
    action: "Move 12% to West",
    signal: "Orders above allocation",
    records: { dots: ["violet", "cobalt", undefined], text: "CRM · ERP · DMS" },
    policy: "Stock can ship",
    role: "Sales operations",
    rule: "Allocation policy",
    outcome: "Approved for West",
  },
  customer: {
    systems: [{ label: "CRM", tone: "violet" }, { label: "DESK" }, { label: "OMS" }, { label: "KB" }],
    action: "Escalate to Quality",
    signal: `14 cases, ${EXAMPLE.part}`,
    records: { dots: ["violet", undefined, undefined], text: "CRM · OMS · DESK" },
    policy: "Escalation rule",
    role: "Team lead",
    rule: "Groups and escalations",
    outcome: "Approved",
  },
  "finance-and-risk": {
    systems: [{ label: "ERP", tone: "cobalt" }, { label: "PAYMENTS" }, { label: "DOCS" }, { label: "POLICY" }],
    action: "Hold 3 payments",
    signal: "Receipt missing",
    records: { dots: ["cobalt", undefined, undefined], text: "PO · Receipt · Invoice" },
    policy: "Three-way match",
    role: "Reviewer",
    rule: "Approval limits",
    outcome: "Held until receipt",
    hold: true,
  },
};

const W = 320;
const H = 140;
const C = H / 2;
/** Card insets: text and controls sit 16 in from the card edge, which is the column edge. */
const L = 16;
const R = W - 16;
const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as CSSProperties;
const dot = (tone?: string) => (tone ? toneVars(tone) : undefined);

export function WhyArt({ slug, index }: { slug: string; index: number }) {
  const ref = useServiceArt(W, H);
  const why = WHY[slug] ?? WHY["supply-chain"];
  return (
    <svg ref={ref} className="svc-art wa" viewBox={`0 0 ${W} ${H}`} aria-hidden>
      {index === 0 ? <Systems why={why} /> : index === 1 ? <Evidence why={why} /> : <Approver why={why} />}
    </svg>
  );
}

/**
 * The area's systems, each in its own colour (neutral when it has none), joining one read-only line.
 * On desktop the line carries on across the column gap into the evidence card (CSS, .svc-chain-art).
 */
function Systems({ why }: { why: Why }) {
  const n = why.systems.length;
  const gap = n > 4 ? 21 : 28;
  const merge = 232;
  return (
    <>
      {why.systems.map((s, i) => {
        const y = C + (i - (n - 1) / 2) * gap;
        return (
          <g key={s.label} style={dot(s.tone)}>
            <path
              d={`M93 ${y}C${(93 + merge) / 2} ${y} ${(93 + merge) / 2 + 10} ${C} ${merge} ${C}`}
              className={s.tone ? "k-sys k-draw" : "k-sys none k-draw"}
              pathLength={1}
              style={d(i * 50)}
            />
            <rect x="1" y={y - 9} width="92" height="18" rx="9" className="k-sheet" />
            <circle cx="13" cy={y} r="3.5" className={s.tone ? "k-fill" : "k-dot"} />
            <text x="22" y={y + 3.8}>{s.label}</text>
          </g>
        );
      })}
      <path d={`M${merge} ${C}H${W}`} className="k-flow k-draw" pathLength={1} style={d(300)} />
      <circle cx={merge} cy={C} r="4.5" className="k-node" />
      <text x={(merge + W) / 2 + 2} y={C - 10} textAnchor="middle" className="k-rise" style={d(400)}>READ-ONLY</text>
    </>
  );
}

/** One card per recommendation: the action, then the signal, the records it read and its policy check. */
function Evidence({ why }: { why: Why }) {
  const rows = [
    { label: "SIGNAL", value: why.signal, y: 54 },
    { label: "RECORDS", value: why.records.text, y: 85 },
    { label: "POLICY", value: why.policy, y: 116 },
  ];
  return (
    <>
      <rect x="0.5" y="8" width={W - 1} height="124" rx="12" className="k-sheet" />
      <text x={L} y="28" className="k-title">{why.action}</text>
      {[38, 69.5, 100.5].map((y) => (
        <path key={y} d={`M0.5 ${y}H${W - 0.5}`} className="k-hair" />
      ))}
      {rows.map((r, i) => (
        <g key={r.label} className="k-rise" style={d(500 + i * 90)}>
          {i === 0 && <circle cx={L + 8} cy={r.y} r="4" className="k-risk" />}
          {i === 1 &&
            why.records.dots.map((t, k) => (
              <circle key={k} cx={L + 1 + k * 7} cy={r.y} r="3" className={t ? "k-fill" : "k-dot"} style={dot(t)} />
            ))}
          {i === 2 && (
            <>
              <circle cx={L + 8} cy={r.y} r="6.5" className="k-fill" />
              <Tick x={L + 8.4} y={r.y} s={0.62} />
            </>
          )}
          <text x={L + 24} y={r.y + 3.8}>{r.label}</text>
          <text x={R} y={r.y + 4.2} textAnchor="end" className="k-txt">{r.value}</text>
        </g>
      ))}
    </>
  );
}

/** The named approver, the limit or rule they work within, and the call they made. */
function Approver({ why }: { why: Why }) {
  const m = why.limit;
  const span = R - L;
  return (
    <>
      <rect x="0.5" y="8" width={W - 1} height="124" rx="12" className="k-sheet" />
      <text x={L} y="27.5">APPROVER</text>
      <text x={R} y="28" textAnchor="end" className="k-title">{why.role}</text>
      <path d={`M0.5 38H${W - 0.5}`} className="k-hair" />
      {m ? (
        <>
          <text x={L} y="58">LIMIT</text>
          <text x={R} y="58.4" textAnchor="end" className="k-txt">
            {m.value} of {m.max} {m.unit}
          </text>
          <rect x={L} y="68" width={span} height="6" rx="3" className="k-track" />
          <rect x={L} y="68" width={(span * m.value) / m.max} height="6" rx="3" className="k-fill k-grow" style={d(1050)} />
          <path d={`M${R} 64V78`} className="k-mark" />
        </>
      ) : (
        <>
          <text x={L} y="58">RULE</text>
          <text x={R} y="58.4" textAnchor="end" className="k-txt">{why.rule}</text>
          <path d={`M${L} 68.5H${R}`} className="k-hair" />
          <text x={L} y="83">REQUIRED</text>
          <text x={R} y="83.4" textAnchor="end" className="k-txt">Always</text>
        </>
      )}
      <g className="k-rise" style={d(1150)}>
        <rect x={L} y="97" width={span} height="24" rx="12" className="k-ink" />
        {why.hold ? <path d={`M${L + 13} 104.5v9M${L + 19} 104.5v9`} className="k-tick" /> : <Tick x={L + 16.5} y={109} s={0.75} />}
        <text x={L + 30} y="113.2" className="k-on k-btn">{why.outcome}</text>
      </g>
    </>
  );
}
