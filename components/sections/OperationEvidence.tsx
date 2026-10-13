"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { APPLICATION_DEMOS, DEMO_PINS, type DemoKind } from "@/lib/application-demos";
import { EVIDENCE_LABELS } from "@/lib/copy";
import { APP_FACTS, EXAMPLE, plant01Stock } from "@/lib/example";
import { toneVars, type Tone } from "@/lib/tone";
import { CountUp } from "../ui/CountUp";

/** The system colour of the data each decision moves (the same accent as its 3D scene). */
const ACCENT: Record<DemoKind, Tone> = {
  inventory: "saffron",
  demand: "cobalt",
  production: "emerald",
  maintenance: "emerald",
  risk: "tangerine",
  sales: "violet",
  customer: "violet",
  finance: "cobalt",
};

/** Charts are drawn 400 units wide. Text is sized in screen px: 11px / k, where k is the chart's
 *  rendered width over 400, so labels read at 11px at any card width (F-10). */
const W = 400;
const RISK = "var(--color-signal)";
const RISK_INK = "var(--color-signal-ink)";
const OK = "var(--color-emerald)";
const OK_INK = "var(--color-emerald-ink)";
const SOFT = "var(--color-ink-soft)";
const INK = "var(--color-ink)";
const LINE = "var(--color-line-strong)";

function Chart({ h, label, children }: { h: number; label: string; children: ReactNode }) {
  const svg = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const fit = () => el.style.setProperty("--k", String(Math.max(0.2, el.clientWidth / W)));
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <svg ref={svg} className="evidence-chart" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
      {children}
    </svg>
  );
}

function Tick({ x, y, ok }: { x: number; y: number; ok: boolean }) {
  const c = ok ? OK : RISK;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="7" fill="var(--color-surface)" stroke={c} strokeWidth="1.4" />
      <path d={ok ? "M-3 0l2 2 4-5" : "M-3 0h6"} stroke={c} fill="none" strokeWidth="1.6" />
    </g>
  );
}

/* ---- Plant 01 stock over the next six days, with and without the transfer ---- */
function Inventory({ step }: { step: number }) {
  const done = step === 2;
  const x = (d: number) => 12 + d * (376 / 6);
  const y = (v: number) => 108 - ((v - 100) / 500) * 80;
  const days = Array.from({ length: 7 }, (_, d) => d);
  const line = (vals: number[]) => vals.map((v, d) => `${d ? "L" : "M"}${x(d).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const without = days.map((d) => plant01Stock(d));
  const withT = days.map((d) => plant01Stock(d, true));
  const arrive = EXAMPLE.transfer.arrivesDay;
  const safe = EXAMPLE.plant01.safety;
  // Where the stock line crosses safety stock: the start of the shortfall.
  const cross = (EXAMPLE.plant01.onHand - safe) / EXAMPLE.plant01.dailyUse;
  return (
    <>
      {[300, 500].map((v) => <line key={v} x1={12} x2={388} y1={y(v)} y2={y(v)} className="chart-grid" />)}
      <line x1={12} x2={388} y1={y(safe)} y2={y(safe)} stroke={RISK} strokeDasharray="3 4" strokeWidth="1.2" />
      <text x={12} y={y(safe) + 17} fill={RISK_INK}>{EVIDENCE_LABELS.safety}</text>
      {!done && <path d={`M${x(cross)} ${y(safe)} L${x(6)} ${y(safe)} L${x(6)} ${y(without[6])} Z`} fill={RISK} fillOpacity="0.16" />}
      <path d={line(without)} stroke={RISK} strokeWidth="2" fill="none" opacity={done ? 0.3 : 1} className="evidence-draw" />
      {step >= 1 && (
        <g>
          <line x1={x(arrive)} x2={x(arrive)} y1={y(without[arrive])} y2={y(withT[arrive])} stroke={OK} strokeWidth="1.5" strokeDasharray="2 3" />
          <circle cx={x(arrive)} cy={y(withT[arrive])} r="3.5" fill={OK} />
          <text x={x(arrive) + 8} y={26} fill={OK_INK}>+{EXAMPLE.transfer.units} · DAY {arrive}</text>
        </g>
      )}
      {done && <path d={days.slice(arrive).map((d) => `${d === arrive ? "M" : "L"}${x(d).toFixed(1)} ${y(withT[d]).toFixed(1)}`).join(" ")} stroke={OK} strokeWidth="2.2" fill="none" className="evidence-draw" />}
      <circle cx={x(6)} cy={y(done ? withT[6] : without[6])} r="4" fill={done ? OK : RISK} />
      <text x={12} y={140}>{EVIDENCE_LABELS.today}</text>
      <text x={388} y={140} textAnchor="end" fill={done ? OK_INK : RISK_INK}>{done ? EVIDENCE_LABELS.day6With : EVIDENCE_LABELS.day6Without}</text>
    </>
  );
}

/* ---- Two bars per row (a plan and what is happening), with the gap drawn where it is ---- */
type Row = {
  label: string;
  /** Upper bar (neutral) and lower bar (the data's tone), in units of the 180-wide track. */
  a: number;
  b: number;
  /** Draw the difference between the bars as a risk. */
  gap?: boolean;
  /** The action's change, from `from` to the bar's end, in emerald. */
  change?: { bar: "a" | "b"; from: number };
  note: string;
  tone?: "risk" | "ok";
};

function Rows({ rows, legend }: { rows: Row[]; legend: [string, string] }) {
  const x0 = 92;
  return (
    <>
      {rows.map((r, i) => {
        const top = 8 + i * 36;
        return (
          <g key={r.label} transform={`translate(0 ${top})`}>
            <text x={0} y={22} fill={INK}>{r.label}</text>
            <rect x={x0} y={6} width={180} height={8} rx={2} fill="var(--color-track)" />
            <rect x={x0} y={6} width={r.a} height={8} rx={2} fill={LINE} className="evidence-bar" />
            <rect x={x0} y={17} width={r.b} height={8} rx={2} fill="var(--tone)" className="evidence-bar" />
            {r.change && <rect x={x0 + r.change.from} y={r.change.bar === "a" ? 6 : 17} width={(r.change.bar === "a" ? r.a : r.b) - r.change.from} height={8} rx={2} fill={OK} className="evidence-bar" />}
            {r.gap && <rect x={x0 + Math.min(r.a, r.b)} y={3} width={Math.abs(r.b - r.a)} height={25} rx={3} fill={RISK} fillOpacity="0.12" stroke={RISK} strokeWidth="1" strokeDasharray="2 2" />}
            <text x={W} y={22} textAnchor="end" fill={r.tone === "risk" ? RISK_INK : r.tone === "ok" ? OK_INK : SOFT}>{r.note}</text>
          </g>
        );
      })}
      <rect x={x0} y={121} width={10} height={6} rx={1.5} fill={LINE} />
      <text x={x0 + 15} y={128}>{legend[0]}</text>
      <rect x={x0 + 96} y={121} width={10} height={6} rx={1.5} fill="var(--tone)" />
      <text x={x0 + 111} y={128}>{legend[1]}</text>
    </>
  );
}

function Demand({ step }: { step: number }) {
  const done = step === 2;
  const raise = `+${APP_FACTS.demand.raiseUnits.toLocaleString("en-US")}`;
  return (
    <Rows
      legend={["PLAN", "ORDERS"]}
      rows={[
        { label: "NORTH", a: 150, b: 142, note: "ON PLAN" },
        { label: "CENTRAL", a: 168, b: 160, note: "ON PLAN" },
        { label: "WEST", a: done ? 178 : 118, b: 178, gap: !done, change: done ? { bar: "a", from: 118 } : undefined, note: done ? `${raise} UNITS` : `GAP ${raise}`, tone: done ? "ok" : "risk" },
      ]}
    />
  );
}

function Sales({ step }: { step: number }) {
  const done = step === 2;
  return (
    <Rows
      legend={["ORDERS", "ALLOCATION"]}
      rows={[
        { label: "EAST", a: 128, b: done ? 150 : 172, note: done ? "SURPLUS MOVED" : "SURPLUS" },
        { label: "CENTRAL", a: 150, b: 150, note: "BALANCED" },
        { label: "WEST", a: 178, b: done ? 178 : 132, gap: !done, change: done ? { bar: "b", from: 132 } : undefined, note: done ? `+${APP_FACTS.sales.shiftPct}% ALLOCATED` : "ORDERS > STOCK", tone: done ? "ok" : "risk" },
      ]}
    />
  );
}

/* ---- Lots per line before the shift ---- */
function Production({ step }: { step: number }) {
  const done = step === 2;
  const f = APP_FACTS.production;
  return (
    <>
      {[f.queuedAt, f.to].map((label, row) => {
        const top = 8 + row * 40;
        const queue = row === 0;
        return (
          <g key={label} transform={`translate(0 ${top})`}>
            <text x={0} y={17} fill={INK}>{label.toUpperCase()}</text>
            {Array.from({ length: 6 }, (_, i) => {
              const full = queue ? (done ? i < 3 : true) : done && i < 3;
              const over = queue && i >= 3 && !done;
              return (
                <rect key={i} x={92 + i * 32} y={2} width={26} height={20} rx={4}
                  fill={full ? (over ? RISK : OK) : "none"} fillOpacity={full ? (over ? 0.18 : 0.85) : 0}
                  stroke={full ? (over ? RISK : OK) : LINE} strokeWidth={1.2} strokeDasharray={full ? undefined : "3 3"} className="evidence-bar" />
              );
            })}
            <text x={W} y={17} textAnchor="end" fill={queue ? (done ? OK_INK : RISK_INK) : done ? OK_INK : SOFT}>
              {queue ? (done ? `${f.moved} LOTS` : `${f.queued} QUEUED`) : done ? `${f.moved} LOTS` : "FREE"}
            </text>
          </g>
        );
      })}
      {step >= 1 && <path d="M 233 32 C 233 42, 140 40, 140 50" stroke={OK} strokeWidth="1.6" strokeDasharray="3 3" fill="none" />}
      <text x={0} y={100}>{step === 1 ? EVIDENCE_LABELS.tooling : EVIDENCE_LABELS.productionOrder}</text>
      {step !== 1 && <text x={W} y={100} textAnchor="end">SHIFT {f.shift}</text>}
    </>
  );
}

/* ---- Vibration trace and the service window ---- */
function Maintenance({ step }: { step: number }) {
  const done = step === 2;
  const m = APP_FACTS.maintenance;
  return (
    <>
      <line x1={0} y1={70} x2={220} y2={70} className="chart-grid" strokeDasharray="3 3" />
      <path d="M0 70 L17 68 L34 72 L51 66 L68 70 L85 62 L102 74 L119 56 L136 66 L152 42 L165 26 L178 40 L195 60 L212 68 L220 70" fill="none" stroke={RISK} strokeWidth="1.8" className="evidence-draw" />
      <circle cx={165} cy={26} r="3.5" fill={RISK} />
      <text x={165} y={15} textAnchor="middle" fill={RISK_INK}>{m.sensor} · {m.peak}</text>
      <text x={0} y={96}>DRIVE-END BEARING</text>
      <line x1={232} y1={4} x2={232} y2={78} className="chart-grid" />
      {["THU", "FRI", "SAT"].map((d, i) => {
        const fri = i === 1;
        const on = fri && step >= 1;
        return (
          <g key={d} transform={`translate(${244 + i * 52} 18)`}>
            <rect width={44} height={44} rx={6} fill={on ? OK : "none"} fillOpacity={on ? (done ? 0.2 : 0.1) : 0} stroke={on ? OK : LINE} strokeWidth={on ? 1.6 : 1} className="evidence-bar" />
            <text x={22} y={19} textAnchor="middle" fill={on ? OK_INK : INK}>{d}</text>
            <text x={22} y={36} textAnchor="middle" fill={on ? OK_INK : SOFT}>{fri ? "OPEN" : "FULL"}</text>
          </g>
        );
      })}
      <text x={W} y={96} textAnchor="end" fill={done ? OK_INK : SOFT}>{done ? EVIDENCE_LABELS.workOrder : `${m.window.toUpperCase()} OPEN`}</text>
    </>
  );
}

/* ---- The late primary lane and the second supplier ---- */
function Risk({ step }: { step: number }) {
  const done = step === 2;
  const r = APP_FACTS.risk;
  const alt = step >= 1;
  return (
    <>
      <path d="M24 70 L196 30 L376 70" fill="none" stroke={RISK} strokeWidth="1.6" strokeDasharray="4 4" opacity={done ? 0.3 : 0.75} />
      {alt && <path d="M196 104 L376 70" stroke={done ? OK : "var(--tone)"} strokeWidth="2.2" fill="none" className="evidence-draw" />}
      {[
        [24, 70, "var(--color-ink-muted)"],
        [196, 30, RISK],
        [196, 104, alt ? (done ? OK : "var(--tone)") : "var(--color-ink-muted)"],
        [376, 70, "var(--color-ink-muted)"],
      ].map(([cx, cy, c]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="7" fill={String(c)} fillOpacity="0.18" />
          <circle cx={cx} cy={cy} r="3.5" fill={String(c)} />
        </g>
      ))}
      <text x={0} y={94} fill={INK}>SUPPLIER 01</text>
      <text x={196} y={16} textAnchor="middle" fill={RISK_INK}>PORT · +{r.laneDelayDays} DAYS</text>
      <text x={196} y={130} textAnchor="middle" fill={alt ? (done ? OK_INK : "var(--tone-ink)") : INK}>{r.alternative.toUpperCase()} · {r.alternativeDays} DAYS</text>
      <text x={W} y={94} textAnchor="end" fill={INK}>{EXAMPLE.plant01.name.toUpperCase()}</text>
    </>
  );
}

/* ---- Fourteen cases, one part, one escalation ---- */
function Customer({ step }: { step: number }) {
  const done = step === 2;
  const hub = step >= 1 ? (done ? OK : RISK) : LINE;
  return (
    <>
      {Array.from({ length: APP_FACTS.customer.cases }, (_, i) => {
        const x = (i % 7) * 26;
        const y = 22 + Math.floor(i / 7) * 34;
        return (
          <g key={i}>
            {step >= 1 && <line x1={x + 10} y1={y + 13} x2={250} y2={50} stroke="var(--tone)" strokeOpacity="0.3" strokeDasharray="2 2" />}
            <rect x={x} y={y} width={20} height={26} rx={3} fill="var(--color-surface)" stroke="var(--tone)" strokeOpacity="0.7" />
            <line x1={x + 4} y1={y + 8} x2={x + 15} y2={y + 8} stroke="var(--tone)" strokeOpacity="0.7" />
            <line x1={x + 4} y1={y + 14} x2={x + 11} y2={y + 14} stroke="var(--tone)" strokeOpacity="0.7" />
          </g>
        );
      })}
      <g transform="translate(250 50)">
        <circle r="18" fill="none" stroke={hub} strokeWidth="1.5" strokeDasharray={step >= 1 ? undefined : "3 3"} />
        <circle r="9" fill="var(--color-surface)" stroke={hub} strokeWidth="1.5" />
        <circle r="2.5" fill={hub} />
      </g>
      <text x={250} y={22} textAnchor="middle" fill={step >= 1 ? (done ? OK_INK : RISK_INK) : SOFT}>{APP_FACTS.customer.part.toUpperCase()}</text>
      {done && (
        <>
          <path d="M 270 50 H 352" stroke={OK} strokeWidth="2" fill="none" className="evidence-draw" />
          <g transform="translate(366 50)">
            <circle r="13" fill="var(--color-surface)" stroke={OK} strokeWidth="1.5" />
            <path d="M -4 0 L -1 3 L 5 -3" fill="none" stroke={OK} strokeWidth="1.8" />
          </g>
        </>
      )}
      <text x={0} y={108}>{EVIDENCE_LABELS.cases}</text>
      {done && <text x={W} y={108} textAnchor="end" fill={OK_INK}>ONE ESCALATION</text>}
    </>
  );
}

/* ---- Purchase order, goods receipt and invoice, row by row ---- */
function Finance({ step }: { step: number }) {
  const done = step === 2;
  const f = APP_FACTS.finance;
  return (
    <>
      <text x={0} y={14}>INVOICE</text>
      <text x={196} y={14} textAnchor="middle">PO</text>
      <text x={262} y={14} textAnchor="middle">RECEIPT</text>
      <text x={W} y={14} textAnchor="end">AMOUNT</text>
      <line x1={0} y1={22} x2={W} y2={22} className="chart-grid" />
      {EVIDENCE_LABELS.ledger.map(([inv, amount], row) => (
        <g key={inv} transform={`translate(0 ${30 + row * 24})`}>
          <text x={0} y={14} fill={INK}>{inv.split(" · ")[0]}</text>
          <Tick x={196} y={9} ok />
          <Tick x={262} y={9} ok={false} />
          <text x={W} y={14} textAnchor="end" fill={INK}>{amount}</text>
          <line x1={0} y1={22} x2={W} y2={22} className="chart-grid" strokeDasharray="2 3" />
        </g>
      ))}
      <text x={0} y={122} fill={done ? OK_INK : RISK_INK}>{done ? EVIDENCE_LABELS.heldTotal : `${f.receipt} MISSING`}</text>
    </>
  );
}

const CHARTS: Record<DemoKind, { h: number; draw: (p: { step: number }) => ReactNode }> = {
  inventory: { h: 148, draw: Inventory },
  demand: { h: 134, draw: Demand },
  production: { h: 106, draw: Production },
  maintenance: { h: 104, draw: Maintenance },
  risk: { h: 138, draw: Risk },
  sales: { h: 134, draw: Sales },
  customer: { h: 114, draw: Customer },
  finance: { h: 128, draw: Finance },
};

/**
 * The evidence behind an application's decision, shown in the explorer card's drawer: one chart,
 * three readings and the stage's conclusion. Flat fills only. Pointing at a reading opens the pin
 * of its object in the 3D scene (onPin).
 */
export function OperationEvidence({ kind, step, onPin }: { kind: DemoKind; step: number; onPin?: (pin: string | null) => void }) {
  const demo = APPLICATION_DEMOS.find((d) => d.kind === kind)!;
  const chart = CHARTS[kind];
  const Draw = chart.draw;
  const pins = DEMO_PINS[kind].readings;
  return (
    <div className="operation-evidence" data-kind={kind} data-step={step} style={toneVars(ACCENT[kind])}>
      <div className="evidence-heading">
        <span className="evidence-title">{demo.evidenceTitle}</span>
        <span className="evidence-state" data-step={step}>
          <i aria-hidden />
          {EVIDENCE_LABELS.stages[step]}
        </span>
      </div>
      <Chart key={kind} h={chart.h} label={demo.status[step]}>
        <Draw step={step} />
      </Chart>
      <dl className="evidence-metrics">
        {demo.readings.map(([k, v], i) => {
          const show = pins[i] && onPin ? () => onPin(pins[i]) : undefined;
          const hide = show && onPin ? () => onPin(null) : undefined;
          // Focus reads the same as pointing, so the keyboard also opens the reading's pin in the scene.
          return (
            <div
              key={k}
              className="evidence-reading"
              data-active={i === step || undefined}
              tabIndex={show ? 0 : undefined}
              onPointerEnter={show}
              onPointerLeave={hide}
              onFocus={show}
              onBlur={hide}
            >
              <dt className="t-label">{k}</dt>
              <dd className="evidence-value">{/^\+?\d/.test(v) && !v.includes(":") ? <CountUp value={v} duration={700} /> : v}</dd>
            </div>
          );
        })}
      </dl>
      <p className="evidence-conclusion" key={step}>
        <i aria-hidden data-done={step === 2 || undefined} />
        {demo.status[step]}
      </p>
    </div>
  );
}
