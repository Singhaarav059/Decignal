"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { APPLICATION_DEMOS, DEMO_PINS, type DemoKind } from "@/lib/application-demos";
import { EVIDENCE_LABELS } from "@/lib/copy";
import { APP_FACTS, inr } from "@/lib/example";
import { toneVars, type Tone } from "@/lib/tone";
import { CountUp } from "../ui/CountUp";

/** The colour of each application's function (the same accent as its 3D scene). */
const ACCENT: Record<DemoKind, Tone> = {
  inventory: "cobalt",
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

/* ---- Daily brief: this week's orders and the three open questions, each with its owner ---- */
function Brief({ step }: { step: number }) {
  const b = APP_FACTS.brief;
  const rows: [string, string, string, boolean][] = [
    ["ORDER BOOK", "THIS WEEK", "LINKED", true],
    ["SUPPLIER DELAY", b.order, "BUYER", false],
    ["STOCK ALLOCATION", "NOT CONFIRMED", "STORES", false],
    ["DELIVERY HOLD", b.hold, "DISPATCH", false],
  ];
  return (
    <>
      <text x={0} y={12}>ISSUE</text>
      <text x={W} y={12} textAnchor="end">OWNER</text>
      <line x1={0} y1={20} x2={W} y2={20} className="chart-grid" />
      {rows.map(([k, ref, owner, ok], row) => (
        <g key={k} transform={`translate(0 ${26 + row * 22})`}>
          <text x={0} y={13} fill={INK}>{k}</text>
          <text x={190} y={13} fill={SOFT}>{step >= 1 || ok ? ref : "·"}</text>
          {step >= 1 && <Tick x={300} y={9} ok={ok} />}
          <text x={W} y={13} textAnchor="end" fill={step >= 1 && !ok ? RISK_INK : SOFT}>{step >= 1 ? owner : "·"}</text>
        </g>
      ))}
      <text x={0} y={128} fill={step === 2 ? INK : SOFT}>{step === 2 ? `BRIEF · ${b.open} OPEN QUESTIONS WITH OWNERS` : "ORDERS DUE THIS WEEK"}</text>
    </>
  );
}

/* ---- Quotations: three suppliers' terms side by side, put on one basis ---- */
function Quotes({ step }: { step: number }) {
  const q = APP_FACTS.quote;
  const rows: [string, string, string, string, boolean][] = [
    [q.a, "PER BOX", "PER PIECE", "UNIT CONVERTED", true],
    [q.b, "NO FREIGHT", "FREIGHT ASKED", "TO CONFIRM", false],
    [q.c, "LATER DATE", "DATE KEPT", "VISIBLE", false],
  ];
  return (
    <>
      <text x={0} y={14} fill={INK}>{`${q.pr} · ${q.suppliers} QUOTATIONS`}</text>
      <text x={W} y={14} textAnchor="end">{step >= 1 ? "ONE BASIS" : "AS RECEIVED"}</text>
      <line x1={0} y1={22} x2={W} y2={22} className="chart-grid" />
      {rows.map(([name, raw, basis, state, ok], row) => (
        <g key={name} transform={`translate(0 ${30 + row * 24})`}>
          <text x={0} y={14} fill={INK}>{name.toUpperCase()}</text>
          <text x={170} y={14} fill={step >= 1 ? INK : SOFT}>{step >= 1 ? basis : raw}</text>
          {step >= 1 && <Tick x={300} y={9} ok={ok} />}
          <text x={W} y={14} textAnchor="end" fill={step >= 1 && !ok ? RISK_INK : SOFT}>{step >= 1 ? state : "·"}</text>
        </g>
      ))}
      <text x={0} y={118} fill={step === 2 ? INK : SOFT}>{step === 2 ? "COMPARISON SHEET FOR THE BUYER" : "SAME PURCHASE REQUEST"}</text>
    </>
  );
}

/* ---- Order intake: the order's lines on one bar, matched and open ---- */
function Order({ step }: { step: number }) {
  const o = APP_FACTS.order;
  const k = W / o.lines;
  const m = o.matched * k;
  const it = o.item * k;
  return (
    <>
      <text x={0} y={14} fill={INK}>{`CUSTOMER ORDER ${o.po}`}</text>
      <text x={W} y={14} textAnchor="end">{`${o.lines} LINES`}</text>
      <rect x={0} y={28} width={W} height={22} rx={4} fill="var(--color-track)" />
      {step >= 1 && <rect x={0} y={28} width={m} height={22} rx={4} fill="var(--tone)" className="evidence-bar" />}
      {step >= 1 && <rect x={m} y={28} width={it} height={22} fill={LINE} className="evidence-bar" />}
      {step >= 1 && <rect x={m + it} y={25} width={W - m - it} height={28} rx={3} fill={RISK} fillOpacity="0.12" stroke={RISK} strokeWidth="1" strokeDasharray="2 2" />}
      <text x={0} y={74} fill={INK}>{step >= 1 ? `${o.matched} MATCHED` : o.alias.toUpperCase()}</text>
      {step >= 1 && <text x={250} y={74} textAnchor="middle">{`${o.item} ITEMS TO CONFIRM`}</text>}
      <text x={W} y={74} textAnchor="end" fill={RISK_INK}>{step >= 1 ? `${o.unit} UNITS TO CLARIFY` : o.pack.toUpperCase()}</text>
      <text x={0} y={104} fill={step === 2 ? INK : SOFT}>{step === 2 ? "DRAFT FOR THE ORDER DESK TO APPROVE" : "APPROVED ITEM MAPPINGS AND UNIT RULES"}</text>
    </>
  );
}

/* ---- Service: the report's recommendation and the equipment records it could belong to ---- */
function Service({ step }: { step: number }) {
  const sv = APP_FACTS.service;
  const found: [string, string][] = [
    [sv.equipment.toUpperCase(), "FOUND"],
    ["OPEN QUOTE", "NONE"],
  ];
  return (
    <>
      <rect x={0} y={4} width={170} height={74} rx={6} fill="var(--color-surface)" stroke={LINE} />
      <text x={12} y={22} fill={INK}>{sv.report}</text>
      <line x1={12} y1={34} x2={150} y2={34} className="chart-grid" />
      <line x1={12} y1={46} x2={158} y2={46} stroke="var(--tone)" strokeWidth="2.2" className="evidence-draw" />
      <line x1={12} y1={58} x2={128} y2={58} className="chart-grid" />
      <text x={12} y={72} fill={SOFT}>RECOMMENDATION</text>
      {step >= 1 &&
        found.map(([c, v], i) => (
          <g key={c} transform={`translate(214 ${8 + i * 34})`}>
            <path d={`M-40 ${30 - i * 34} C -20 ${30 - i * 34}, -20 14, 0 14`} stroke="var(--tone)" strokeOpacity="0.5" strokeDasharray="2 3" fill="none" />
            <rect width={170} height={28} rx={5} fill="var(--color-surface)" stroke={LINE} />
            <text x={10} y={18} fill={INK}>{c}</text>
            <text x={160} y={18} textAnchor="end" fill={SOFT}>{v}</text>
          </g>
        ))}
      <text x={0} y={100} fill={INK}>{`${sv.part.toUpperCase()} · ${sv.when.toUpperCase()}`}</text>
      <text x={W} y={100} textAnchor="end" fill={step === 2 ? INK : SOFT}>{step === 2 ? "ASSIGNED TO THE SERVICE OWNER" : "NO OWNER YET"}</text>
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
    ["RECEIVER NOTE", "UNCLEAR", false],
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
  production: { h: 134, draw: Brief },
  inventory: { h: 124, draw: Quotes },
  sales: { h: 110, draw: Order },
  maintenance: { h: 106, draw: Service },
  risk: { h: 130, draw: Supplier },
  finance: { h: 124, draw: Deduction },
};

/**
 * The records behind an application's example, shown in the explorer card's drawer: one chart,
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
