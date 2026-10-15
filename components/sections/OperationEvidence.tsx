"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { APPLICATION_DEMOS, DEMO_PINS, type DemoKind } from "@/lib/application-demos";
import { EVIDENCE_LABELS } from "@/lib/copy";
import { APP_FACTS, DOC_STATUS, EXAMPLE, inr } from "@/lib/example";
import { toneVars, type Tone } from "@/lib/tone";
import { CountUp } from "../ui/CountUp";

/** The colour of each workflow's function (the same accent as its 3D scene). */
const ACCENT: Record<DemoKind, Tone> = {
  inventory: "saffron",
  production: "emerald",
  maintenance: "pink",
  risk: "cobalt",
  sales: "tangerine",
  finance: "violet",
};

/** Charts are drawn 400 units wide. Text is sized in screen px: 11px / k, where k is the chart's
 *  rendered width over 400, so labels read at 11px at any card width (F-10). */
const W = 400;
const RISK = "var(--color-signal)";
const RISK_INK = "var(--color-signal-ink)";
const OK = "var(--color-emerald)";
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

/* ---- Dispatch: the customer checklist, one row per required document, with its status ---- */
function Dispatch({ step }: { step: number }) {
  const items = EXAMPLE.checklist.items;
  return (
    <>
      <text x={0} y={12}>{`CHECKLIST ${EXAMPLE.checklist.rev.toUpperCase()}`}</text>
      <text x={W} y={12} textAnchor="end">{`LINE ${EXAMPLE.line.n} · ${EXAMPLE.line.heat}`}</text>
      <line x1={0} y1={20} x2={W} y2={20} className="chart-grid" />
      {items.map((it, row) => {
        // The situation shows the line; the source records reveal each document's status.
        const shown = step >= 1 || it.status !== "supported";
        const ok = it.status === "supported";
        return (
          <g key={it.name} transform={`translate(0 ${26 + row * 17})`}>
            <text x={0} y={11} fill={INK}>{it.name.toUpperCase()}</text>
            {shown && <Tick x={262} y={7} ok={ok} />}
            <text x={W} y={11} textAnchor="end" fill={ok ? SOFT : RISK_INK}>
              {shown ? DOC_STATUS[it.status].toUpperCase() : "CHECKING"}
            </text>
          </g>
        );
      })}
      <text x={0} y={142} fill={step === 2 ? INK : SOFT}>{step === 2 ? "2 QUESTIONS FOR THE QUALITY REVIEWER" : `${EXAMPLE.files} FILES SUPPLIED`}</text>
    </>
  );
}

/* ---- Job work: sent, returned, rejected and the pieces still to explain, on one 1,000-piece bar ---- */
function Jobwork({ step }: { step: number }) {
  const j = APP_FACTS.jobwork;
  const x0 = 0;
  const w = W;
  const k = w / j.sent;
  const ret = j.returned * k;
  const rej = j.rejected * k;
  return (
    <>
      <text x={0} y={14} fill={INK}>{`CHALLAN ${j.challan} · ${j.process.toUpperCase()}`}</text>
      <text x={W} y={14} textAnchor="end">{`${j.sent.toLocaleString("en-IN")} SENT`}</text>
      <rect x={x0} y={28} width={w} height={22} rx={4} fill="var(--color-track)" />
      <rect x={x0} y={28} width={ret} height={22} rx={4} fill="var(--tone)" className="evidence-bar" />
      {step >= 1 && <rect x={x0 + ret} y={28} width={rej} height={22} fill={LINE} className="evidence-bar" />}
      <rect x={x0 + ret + (step >= 1 ? rej : 0)} y={25} width={w - ret - (step >= 1 ? rej : 0)} height={28} rx={3} fill={RISK} fillOpacity="0.12" stroke={RISK} strokeWidth="1" strokeDasharray="2 2" />
      <text x={0} y={74} fill={INK}>{`${j.returned} RETURNED`}</text>
      {step >= 1 && <text x={200} y={74} textAnchor="middle">{`${j.rejected} REJECTIONS ON RECORD`}</text>}
      <text x={W} y={74} textAnchor="end" fill={RISK_INK}>{`${step >= 1 ? j.open : j.sent - j.returned} TO EXPLAIN`}</text>
      <text x={0} y={104} fill={step === 2 ? INK : SOFT}>{step === 2 ? `FOLLOW-UP FOR ${j.worker.toUpperCase()} · NOT DECLARED LOST` : "RETURN RECORDS LINKED TO THE CHALLAN"}</text>
    </>
  );
}

/* ---- RFQ: the customer requirement against the supplier offer, line by line ---- */
function Rfq({ step }: { step: number }) {
  const r = APP_FACTS.rfq;
  const rows: [string, string, string, boolean][] = [
    ["WETTED PARTS", r.required, r.offered, false],
    ["SIZE", "DN50", "DN50", true],
    ["PRESSURE CLASS", "PN40", "PN40", true],
    ["END CONNECTION", "FLANGED", "FLANGED", true],
  ];
  return (
    <>
      <text x={0} y={14}>{r.line.toUpperCase()}</text>
      <text x={210} y={14} textAnchor="middle">ENQUIRY</text>
      <text x={300} y={14} textAnchor="middle">OFFER</text>
      <line x1={0} y1={22} x2={W} y2={22} className="chart-grid" />
      {rows.map(([k, need, offer, ok], row) => (
        <g key={k} transform={`translate(0 ${30 + row * 22})`}>
          <text x={0} y={13} fill={INK}>{k}</text>
          <text x={210} y={13} textAnchor="middle" fill={INK}>{need}</text>
          <text x={300} y={13} textAnchor="middle" fill={step >= 1 && !ok ? RISK_INK : INK}>{step >= 1 ? offer : "·"}</text>
          {step >= 1 && <Tick x={378} y={9} ok={ok} />}
        </g>
      ))}
      <text x={0} y={128} fill={step === 2 ? INK : SOFT}>{step === 2 ? "CLARIFICATION DRAFTED · NO SUBSTITUTE CHOSEN" : r.item.toUpperCase()}</text>
    </>
  );
}

/* ---- Service: the report's recommendation and the equipment records it could belong to ---- */
function Service({ step }: { step: number }) {
  const sv = APP_FACTS.service;
  const candidates = ["PX-4107", "PX-4117"];
  return (
    <>
      <rect x={0} y={4} width={170} height={74} rx={6} fill="var(--color-surface)" stroke={LINE} />
      <text x={12} y={22} fill={INK}>{sv.report}</text>
      <line x1={12} y1={34} x2={150} y2={34} className="chart-grid" />
      <line x1={12} y1={46} x2={158} y2={46} stroke="var(--tone)" strokeWidth="2.2" className="evidence-draw" />
      <line x1={12} y1={58} x2={128} y2={58} className="chart-grid" />
      <text x={12} y={72} fill={RISK_INK}>{`SERIAL ${sv.serial}`}</text>
      {step >= 1 &&
        candidates.map((c, i) => (
          <g key={c} transform={`translate(214 ${8 + i * 34})`}>
            <path d={`M-40 ${30 - i * 34} C -20 ${30 - i * 34}, -20 14, 0 14`} stroke="var(--tone)" strokeOpacity="0.5" strokeDasharray="2 3" fill="none" />
            <rect width={120} height={28} rx={5} fill="var(--color-surface)" stroke={LINE} />
            <text x={10} y={18} fill={INK}>{c}</text>
            <text x={110} y={18} textAnchor="end" fill={SOFT}>MATCH?</text>
          </g>
        ))}
      <text x={0} y={100} fill={INK}>{`${sv.part.toUpperCase()} · ${sv.when.toUpperCase()}`}</text>
      <text x={W} y={100} textAnchor="end" fill={step === 2 ? INK : SOFT}>{step === 2 ? "FOLLOW-UP FOR THE OWNER" : "NO OWNER YET"}</text>
    </>
  );
}

/* ---- Supplier update: the confirmed line against the changed promise, on one week ---- */
function Supplier({ step }: { step: number }) {
  const u = APP_FACTS.supplier;
  const days = ["MON", "TUE", "WED", "THU", "FRI", "MON", "TUE", "WED"];
  const x = (i: number) => 24 + i * 50;
  return (
    <>
      {days.map((d, i) => (
        <text key={i} x={x(i)} y={124} textAnchor="middle">{d}</text>
      ))}
      <line x1={0} y1={110} x2={W} y2={110} className="chart-grid" />
      <text x={0} y={14} fill={INK}>CONFIRMED ON THE PO</text>
      <rect x={x(4) - 18} y={24} width={36} height={u.qty * 0.5} rx={4} fill={LINE} className="evidence-bar" opacity={step >= 1 ? 0.5 : 1} />
      <text x={x(4)} y={20 + u.qty * 0.5 + 18} textAnchor="middle" fill={INK}>{u.qty}</text>
      {step >= 1 && (
        <>
          <rect x={x(4) + 22} y={24 + (u.qty - u.first) * 0.5} width={36} height={u.first * 0.5} rx={4} fill="var(--tone)" className="evidence-bar" />
          <rect x={x(7) - 18} y={24 + (u.qty - u.rest) * 0.5} width={36} height={u.rest * 0.5} rx={4} fill="var(--tone)" className="evidence-bar" />
          <text x={x(4) + 40} y={20 + (u.qty - u.first) * 0.5} textAnchor="middle" fill="var(--tone-ink)">{u.first}</text>
          <text x={x(7)} y={20 + (u.qty - u.rest) * 0.5} textAnchor="middle" fill={RISK_INK}>{u.rest}</text>
        </>
      )}
      <text x={W} y={14} textAnchor="end" fill={step === 2 ? INK : SOFT}>{step === 2 ? `ORDER ${u.order} TO CHECK` : u.po}</text>
    </>
  );
}

/* ---- Deduction: the debit note and the records behind it, row by row ---- */
function Deduction({ step }: { step: number }) {
  const d = APP_FACTS.deduction;
  const rows: [string, string, boolean][] = [
    ["INVOICE", d.invoice, true],
    ["DELIVERY ACKNOWLEDGEMENT", d.ack, true],
    ["RECEIVER NOTE", "AMBIGUOUS", false],
  ];
  return (
    <>
      <text x={0} y={14}>{`DEBIT NOTE ${d.debit}`}</text>
      <text x={W} y={14} textAnchor="end" fill={INK}>{inr(d.amount)}</text>
      <line x1={0} y1={22} x2={W} y2={22} className="chart-grid" />
      {rows.map(([k, v, ok], row) => (
        <g key={k} transform={`translate(0 ${30 + row * 24})`}>
          <text x={0} y={14} fill={INK}>{k}</text>
          {step >= 1 && <Tick x={262} y={9} ok={ok} />}
          <text x={W} y={14} textAnchor="end" fill={step >= 1 && !ok ? RISK_INK : SOFT}>{step >= 1 ? v : "·"}</text>
          <line x1={0} y1={22} x2={W} y2={22} className="chart-grid" strokeDasharray="2 3" />
        </g>
      ))}
      <text x={0} y={118} fill={step === 2 ? INK : SOFT}>{step === 2 ? EVIDENCE_LABELS.heldTotal : d.reason.toUpperCase()}</text>
    </>
  );
}

const CHARTS: Record<DemoKind, { h: number; draw: (p: { step: number }) => ReactNode }> = {
  production: { h: 148, draw: Dispatch },
  inventory: { h: 110, draw: Jobwork },
  sales: { h: 134, draw: Rfq },
  maintenance: { h: 106, draw: Service },
  risk: { h: 130, draw: Supplier },
  finance: { h: 124, draw: Deduction },
};

/**
 * The source records behind a workflow's review, shown in the explorer card's drawer: one chart,
 * three readings and the tab's conclusion. Flat fills only. Pointing at a reading opens the pin
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
