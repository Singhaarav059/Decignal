"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CONNECTS, FAQ_TOPICS } from "@/lib/content";
import { EXAMPLE } from "@/lib/example";
import { toneVars } from "@/lib/tone";
import { useSvgScale } from "./svgScale";

/**
 * Answer figures for the home FAQ: one schematic per question, drawn from what its answer says, in
 * the running example's own figures. Desktop shows the figure beside the list (the open question,
 * or the one under the pointer or keyboard focus); phones show it inside the opened answer.
 * Index-aligned with FAQ and FAQ_TOPICS.
 */

/** The one line under each figure: what the drawing shows, in plain words. */
const LINES = [
  "The dashboard stops at today. Decignal prepares the next action, with its evidence, for approval.",
  "ERP, CRM, MES, WMS, suppliers and external feeds stay where they are. Decignal only reads from them.",
  "One decision needs four fields. The audit flags the one gap that matters and leaves the rest for later.",
  "Access, hosting, storage and model limits are agreed with your security team before anything connects.",
  "The planner sees the evidence and your 300-unit limit, then approves at 09:42.",
  "One decision goes live in weeks, instead of a platform that stays a pilot.",
  "The statement of work names what is yours and who runs what.",
  "The audit places your candidate decisions by how often they come up and how much timing matters.",
];

const W = 360;
const H = 220;
/** Hover intent: sweeping the pointer down the list does not flick through every figure. */
const INTENT_MS = 120;

const T = EXAMPLE.transfer;
const at = (i: number) => ({ ["--i" as string]: i }) as CSSProperties;
const tone = (t: string, i?: number) => ({ ...toneVars(t), ...(i === undefined ? null : at(i)) }) as CSSProperties;
const check = (x: number, y: number) => `M${x - 4.5} ${y}l3.2 3.2 6.3-6.6`;

/** The evidence behind the decision, each fact in the colour of the system it came from. */
const EVIDENCE: [string, string][] = [
  ["cobalt", `Short on day ${EXAMPLE.plant01.breachDay}`],
  ["saffron", `${T.units} units spare`],
  ["pink", `Lane clear, ${EXAMPLE.lane.days} days`],
];

/* ---------------------------------------------------------------- figures */

function Dashboards() {
  return (
    <>
      {/* The dashboard: a record of the past that stops at today. */}
      <rect x="0.5" y="8.5" width="160" height="203" rx="12" className="fa-well" />
      <text x="16" y="32">DASHBOARD</text>
      {[84, 116, 148].map((y) => <path key={y} d={`M16 ${y}H144`} className="fa-grid" />)}
      <path d="M16 176H144" className="fa-axis" />
      <path d="M106 64V176" className="fa-today" />
      <text x="106" y="57" textAnchor="middle">TODAY</text>
      <path d="M16 96 L34 101 L52 99 L70 110 L88 113 L106 124" className="fa-past fa-draw" pathLength={1} />
      <circle cx="106" cy="124" r="4" className="fa-past-dot" />
      <text x="16" y="198">WHAT HAPPENED</text>
      {/* Decignal picks up where the dashboard stops. */}
      <path d="M111 124H177" className="fa-link fa-draw" pathLength={1} style={at(3)} />
      <path d="M172 119.5l5 4.5-5 4.5" className="fa-link fa-rise" style={at(5)} />
      <rect x="180.5" y="8.5" width="179" height="203" rx="12" className="fa-sheet" />
      <text x="196" y="32">NEXT ACTION</text>
      <text x="196" y="54" className="fa-v">{`Transfer ${T.units} units`}</text>
      <text x="196" y="71" className="fa-s">Plant 02 to Plant 01</text>
      <path d="M196 84H344" className="fa-hair" />
      <text x="196" y="102">EVIDENCE</text>
      {EVIDENCE.map(([t, text], i) => (
        <g key={text} className="fa-rise" style={tone(t, 4 + i)}>
          <circle cx="200" cy={117 + i * 18} r="3.5" className="fa-dot" />
          <text x="210" y={121 + i * 18} className="fa-s">{text}</text>
        </g>
      ))}
      <g className="fa-rise" style={at(8)}>
        <rect x="196" y="171" width="78" height="22" rx="11" className="fa-ink" />
        <text x="235" y="186.2" textAnchor="middle" className="fa-v fa-on-ink">Approve</text>
      </g>
    </>
  );
}

const SYSTEMS = CONNECTS.map((c) => ({ name: c.id === "ext" ? "External" : c.name, tone: c.tone }));

function Integration() {
  return (
    <>
      <text x="0" y="16">YOUR SYSTEMS, IN PLACE</text>
      {SYSTEMS.map((s, i) => {
        const y = 30 + i * 31;
        const cy = y + 13;
        const ey = 83 + i * 11;
        return (
          <g key={s.name} style={tone(s.tone, i)}>
            <path d={`M132 ${cy} C 196 ${cy}, 196 ${ey}, 254 ${ey}`} className="fa-line fa-draw" pathLength={1} />
            <path d={`M250 ${ey - 4}l4.5 4-4.5 4`} className="fa-line fa-rise" />
            <rect x="0.5" y={y + 0.5} width="131" height="25" rx="8" className="fa-sheet" />
            <circle cx="15" cy={cy} r="4" className="fa-dot" />
            <text x="27" y={cy + 4.2} className="fa-v">{s.name}</text>
          </g>
        );
      })}
      <rect x="262" y="66" width="98" height="88" rx="14" className="fa-ink" />
      <text x="311" y="106" textAnchor="middle" className="fa-v fa-on-ink">Decignal</text>
      <text x="311" y="126" textAnchor="middle" className="fa-on-ink">READ-ONLY</text>
    </>
  );
}

const FIELDS = [
  { sys: "ERP", tone: "cobalt", field: "On-hand stock", state: "ok" },
  { sys: "ERP", tone: "cobalt", field: "Safety stock", state: "gap" },
  { sys: "MES", tone: "emerald", field: "Daily use", state: "ok" },
  { sys: "WMS", tone: "saffron", field: "Stock by site", state: "ok" },
  { sys: "CRM", tone: "violet", field: "Pipeline", state: "later" },
] as const;

function Data() {
  return (
    <>
      <rect x="0" y="0" width="196" height="32" rx="16" className="fa-ink" />
      <text x="16" y="21" className="fa-v fa-on-ink">{`Transfer ${T.units} units`}</text>
      <text x="208" y="20.5">ONE DECISION</text>
      {/* The bracket: the minimum data this one decision needs. */}
      <path d="M12 32V164" className="fa-link fa-draw" pathLength={1} />
      {FIELDS.map((f, i) => {
        const y = 48 + i * 34;
        const cy = y + 14;
        return (
          <g key={f.field} className={f.state === "later" ? "fa-faded" : undefined} style={tone(f.tone, i)}>
            {f.state !== "later" && <path d={`M12 ${cy}H24`} className="fa-link fa-draw" pathLength={1} style={at(2 + i)} />}
            <rect x="24.5" y={y + 0.5} width="335" height="27" rx="8" className={f.state === "later" ? "fa-sheet fa-dashed" : "fa-sheet"} />
            <circle cx="39" cy={cy} r="4" className="fa-dot" />
            <text x="50" y={cy + 4}>{f.sys}</text>
            <text x="92" y={cy + 4.2} className="fa-v">{f.field}</text>
            <g className="fa-rise" style={at(3 + i)}>
              {f.state === "ok" && <path d={check(340, cy)} className="fa-check" />}
              {f.state === "gap" && (
                <>
                  <circle cx="275" cy={cy} r="3.5" className="fa-risk" />
                  <text x="346" y={cy + 4} textAnchor="end" className="fa-risk-text">MATTERS</text>
                </>
              )}
              {f.state === "later" && <text x="346" y={cy + 4} textAnchor="end">CAN WAIT</text>}
            </g>
          </g>
        );
      })}
    </>
  );
}

const AGREED: [string, string][] = [
  ["Access", "Read-only"],
  ["Hosting", "Agreed"],
  ["Storage", "Agreed"],
  ["Model limits", "Agreed"],
];

function Security() {
  return (
    <>
      <rect x="0.5" y="0.5" width="209" height="219" rx="14" className="fa-sheet" />
      <text x="16" y="28">AGREED FIRST</text>
      {AGREED.map(([k, v], i) => {
        const cy = 56 + i * 32;
        return (
          <g key={k}>
            {i > 0 && <path d={`M16 ${cy - 16}H194`} className="fa-hair" />}
            <text x="16" y={cy + 4.2} className="fa-v">{k}</text>
            <text x="172" y={cy + 4} textAnchor="end" className={i === 0 ? "fa-v" : "fa-s"}>{v}</text>
            <path d={check(188, cy)} className="fa-check fa-draw" pathLength={1} style={at(i)} />
          </g>
        );
      })}
      <path d="M16 172H194" className="fa-hair" />
      <text x="16" y="198" className="fa-s">Your security team</text>
      <g className="fa-rise" style={at(4)}>
        <circle cx="186" cy="194" r="9" className="fa-ok" />
        <path d={check(186, 194)} className="fa-check fa-on-ok" />
      </g>
      {/* Then, and only then, a read-only connection. */}
      <text x="232" y="16">YOUR SYSTEMS</text>
      <rect x="232.5" y="26.5" width="127" height="31" rx="10" className="fa-sheet" />
      {CONNECTS.map((c, i) => <circle key={c.id} cx={252 + i * 17.6} cy="42" r="4" className="fa-dot" style={toneVars(c.tone)} />)}
      <path d="M296 58V170" className="fa-link fa-draw" pathLength={1} style={at(5)} />
      <path d="M291 165l5 5.5 5-5.5" className="fa-link fa-rise" style={at(7)} />
      <g className="fa-rise" style={at(6)}>
        <rect x="246.5" y="104.5" width="99" height="20" rx="10" className="fa-sheet" />
        <text x="296" y="118.5" textAnchor="middle">READ-ONLY</text>
      </g>
      {/* Bottom edge level with the agreement sheet's. */}
      <rect x="232" y="176" width="128" height="44" rx="12" className="fa-ink" />
      <text x="296" y="202.5" textAnchor="middle" className="fa-v fa-on-ink">Decignal</text>
    </>
  );
}

function Control() {
  const lim = EXAMPLE.policy.maxUnits;
  const fill = 164 * (T.units / lim);
  return (
    <>
      <text x="0" y="18" className="fa-v">{`Transfer ${T.units} units`}</text>
      <text x="0" y="37" className="fa-s">Plant 02 to Plant 01</text>
      <text x="360" y="18" textAnchor="end">{T.id}</text>
      <path d="M0 54H360" className="fa-hair" />
      <text x="0" y="80">EVIDENCE</text>
      {EVIDENCE.map(([t, text], i) => (
        <g key={text} className="fa-rise" style={tone(t, i)}>
          <circle cx="4" cy={104 + i * 22} r="3.5" className="fa-dot" />
          <text x="14" y={108 + i * 22} className="fa-s">{text}</text>
        </g>
      ))}
      <text x="196" y="80">POLICY CHECK</text>
      <rect x="196" y="100" width="164" height="8" rx="4" className="fa-track" />
      <rect x="196" y="100" width={fill} height="8" rx="4" className="fa-ok fa-grow" style={at(3)} />
      <path d="M359.5 94V114" className="fa-limit" />
      <text x="196" y="130" className="fa-s">{`${T.units} of max ${lim} units`}</text>
      <g className="fa-rise" style={at(5)}>
        <path d={check(201, 148)} className="fa-check" />
        <text x="214" y="152" className="fa-s">Within your limit</text>
      </g>
      <path d="M0 168H360" className="fa-hair" />
      <text x="0" y="190">APPROVED BY</text>
      <text x="0" y="209" className="fa-v">{T.approvedBy}</text>
      <g className="fa-rise" style={at(7)}>
        <circle cx="306" cy="198" r="10" className="fa-ok" />
        <path d={check(306, 198)} className="fa-check fa-on-ok" />
        <text x="360" y="202.5" textAnchor="end" className="fa-v">{T.approvedAt}</text>
      </g>
    </>
  );
}

/** Weeks 0 to 12 across the drawing. */
const wk = (w: number) => 8 + w * (344 / 12);

function Delivery() {
  const rows = [
    { label: "CATALOGUE APPLICATION", value: "4 to 8 weeks", from: 4, to: 8 },
    { label: "CUSTOM APPLICATION", value: "6 to 12 weeks", from: 6, to: 12 },
  ];
  return (
    <>
      {rows.map((r, i) => {
        const y = 22 + i * 62;
        const cy = y + 22;
        return (
          <g key={r.label}>
            <text x="8" y={y}>{r.label}</text>
            <text x="352" y={y} textAnchor="end" className="fa-v">{r.value}</text>
            {/* A ruler under each bar, every two weeks, so its ends read against the axis. */}
            {[2, 4, 6, 8, 10].map((w) => <path key={w} d={`M${wk(w)} ${cy - 11}V${cy + 11}`} className="fa-grid" />)}
            <path d={`M${wk(0)} ${cy}H${wk(r.from)}`} className="fa-hair strong" />
            <circle cx={wk(0)} cy={cy} r="3" className="fa-ink" />
            <rect x={wk(r.from)} y={cy - 6} width={wk(r.to) - wk(r.from)} height="12" rx="6" className="fa-ok fa-grow" style={at(1 + i * 2)} />
          </g>
        );
      })}
      {/* The contrast: a platform first, with no release in view. */}
      <g className="fa-faded">
        <text x="8" y="146">PLATFORM FIRST</text>
        <text x="352" y="146" textAnchor="end" className="fa-v">Still a pilot</text>
        <path d="M8 168H344" className="fa-hair strong fa-dashed" />
        <circle cx={wk(0)} cy="168" r="3" className="fa-ink" />
        <path d="M341 163.5l5 4.5-5 4.5" className="fa-hair strong" />
      </g>
      <path d="M8 194H352" className="fa-axis" />
      {[0, 2, 4, 6, 8, 10, 12].map((w) => (
        <g key={w}>
          <path d={`M${wk(w)} 194v4`} className="fa-axis" />
          <text x={wk(w)} y="214" textAnchor="middle" className="fa-num">{w}</text>
        </g>
      ))}
    </>
  );
}

function Ownership() {
  const rows = [
    { name: "Data", owner: "Yours" },
    { name: "Definitions", owner: "Yours", detail: `Safety stock ${EXAMPLE.plant01.safety} units` },
    { name: "Running it", owner: "Agreed", detail: "Who does what" },
  ];
  return (
    <>
      <rect x="0.5" y="0.5" width="359" height="219" rx="14" className="fa-sheet" />
      <text x="18" y="28">STATEMENT OF WORK</text>
      <path d="M18 42H342" className="fa-hair strong" />
      {rows.map((r, i) => {
        const cy = 62 + i * 40;
        return (
          <g key={r.name}>
            {i > 0 && <path d={`M18 ${cy - 20}H342`} className="fa-hair" />}
            <text x="18" y={cy + 4.2} className="fa-v">{r.name}</text>
            {r.detail ? (
              <text x="112" y={cy + 4} className="fa-s">{r.detail}</text>
            ) : (
              CONNECTS.map((c, j) => <circle key={c.id} cx={116 + j * 13} cy={cy} r="4" className="fa-dot fa-rise" style={tone(c.tone, j)} />)
            )}
            <g className="fa-rise" style={at(3 + i)}>
              <rect x="282.5" y={cy - 10.5} width="59" height="21" rx="10.5" className={r.owner === "Yours" ? "fa-ink" : "fa-sheet"} />
              <text x="312" y={cy + 4.2} textAnchor="middle" className={r.owner === "Yours" ? "fa-v fa-on-ink" : "fa-v"}>{r.owner}</text>
            </g>
          </g>
        );
      })}
      {/* Both sides sign the same page. */}
      <path d="M18 182H160" className="fa-hair strong fa-draw" pathLength={1} style={at(6)} />
      <path d="M200 182H342" className="fa-hair strong fa-draw" pathLength={1} style={at(7)} />
      <text x="18" y="202">YOU</text>
      <text x="200" y="202">DECIGNAL</text>
    </>
  );
}

/** Candidate decisions, from three areas, each in its area's colour; placed by how often and how timing-bound. */
/* Each label sits wholly inside its own quadrant at every drawing scale (no label crosses a divider). */
const CANDIDATES = [
  { rank: 1, name: "Stock transfers", tone: "cobalt", x: 326, y: 68, end: true },
  { rank: 2, name: "Line resequencing", tone: "emerald", x: 336, y: 134, end: true },
  { rank: 3, name: "Invoice holds", tone: "violet", x: 60, y: 160, end: false },
];

function GettingStarted() {
  return (
    <>
      {/* The quadrant the audit starts in: frequent, and timing changes the result. */}
      <rect x="188" y="22" width="162" height="81" className="fa-well fa-rise" />
      <path d="M188 22V184M24 103H350" className="fa-hair fa-dashed" />
      <path d="M24 184V22" className="fa-axis" />
      <path d="M24 184H350" className="fa-axis" />
      <path d="M19.5 26l4.5-5 4.5 5M346 179.5l5 4.5-5 4.5" className="fa-axis" />
      <text x="34" y="26">TIMING MATTERS</text>
      <text x="352" y="208" textAnchor="end">HOW OFTEN</text>
      <text x="340" y="42" textAnchor="end" className="fa-rise" style={at(1)}>START HERE</text>
      {CANDIDATES.map((c) => (
        <g key={c.name} className="fa-rise" style={tone(c.tone, c.rank * 2 - 1)}>
          <circle cx={c.x} cy={c.y} r={c.rank === 1 ? 7 : 5} className="fa-dot" />
          <text x={c.end ? c.x - 14 : c.x + 12} y={c.y + 4} textAnchor={c.end ? "end" : "start"} className="fa-s">
            <tspan className="fa-rank">{c.rank}</tspan>
            {`  ${c.name}`}
          </text>
        </g>
      ))}
    </>
  );
}

const FIGURES = [Dashboards, Integration, Data, Security, Control, Delivery, Ownership, GettingStarted];

/* ---------------------------------------------------------------- pieces */

/** One answer's drawing. `on` draws it in (strokes, then the result); off, it waits undrawn. */
export function FaqArt({ index, on }: { index: number; on: boolean }) {
  const ref = useSvgScale(W, H);
  const Figure = FIGURES[index];
  if (!Figure) return null;
  return (
    <svg ref={ref} className="faq-art" viewBox={`0 0 ${W} ${H}`} data-on={on || undefined} aria-hidden>
      <Figure />
    </svg>
  );
}

/** Phones and tablets: the drawing sits inside the opened answer, under its text. */
function answerExtra(i: number, open: boolean): ReactNode {
  if (!FIGURES[i]) return null;
  return (
    <div className="faq-a-fig">
      <FaqArt index={i} on={open} />
    </div>
  );
}

/**
 * The state that joins the list and the figure: what is open, and what the pointer or keyboard is on.
 * Spread `list` onto FaqList and pass `index` to FaqFigure.
 */
export function useFaqFigure(fallback = 0) {
  const [open, setOpen] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const onPreview = useCallback((i: number | null, via: "pointer" | "focus") => {
    window.clearTimeout(timer.current);
    if (via === "focus" && i !== null) setPreview(i);
    else timer.current = window.setTimeout(() => setPreview(i), INTENT_MS);
  }, []);
  const index = preview ?? open ?? fallback;
  return { index, list: { shown: index, onOpenChange: setOpen, onPreview, answerExtra } };
}

/** Desktop: the figure under the help line, crossfading between answers. */
export function FaqFigure({ index }: { index: number }) {
  const ref = useRef<HTMLElement>(null);
  // Draw the first figure in when the panel arrives, not while it is off screen.
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <figure ref={ref} data-reveal className="faq-fig">
      <div className="faq-fig-stage">
        {FIGURES.map((_, i) => <FaqArt key={i} index={i} on={seen && i === index} />)}
      </div>
      <figcaption className="faq-fig-cap">
        <span className="faq-fig-ex t-label">{EXAMPLE.label}</span>
        <span className="faq-fig-lines">
          {LINES.map((line, i) => (
            <span key={i} className="faq-fig-line" data-on={i === index || undefined} aria-hidden={i !== index}>
              <span className="faq-fig-topic t-label">
                <span className="faq-fig-n tabular">{String(i + 1).padStart(2, "0")}</span>
                {FAQ_TOPICS[i]}
              </span>
              <span className="faq-fig-text t-small">{line}</span>
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
