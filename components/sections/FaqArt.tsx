"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CONNECTS, FAQ_TOPICS } from "@/lib/content";
import { APP_FACTS } from "@/lib/example";
import { ORDER_COUNTS } from "@/lib/demonstrations";
import { toneVars } from "@/lib/tone";
import { useSvgScale } from "./svgScale";

/**
 * Answer figures for the home FAQ: one schematic per question, drawn from what its answer says, in
 * the order-intake example's own figures. Desktop shows the figure beside the list (the open
 * question, or the one under the pointer or keyboard focus); phones show it inside the opened answer.
 * Index-aligned with FAQ and FAQ_TOPICS (lib/content.ts).
 */

/** The one line under each figure: what the drawing shows, in plain words. */
const LINES = [
  "Each application is scoped to your process, your data and your approval rules.",
  "Our examples span four industries. The process you want to improve comes first.",
  "Your systems keep their records. Access and integration are agreed during discovery.",
  "Routine lines go through; uncertain ones go to the person who approves them.",
  "Channels, languages and documents are tested on authorised samples first.",
  "Access, providers, hosting and retention are agreed before systems are connected.",
  "The first conversation is free. Assessment, build and support are scoped separately.",
  "Every example on this site is illustrative. Customer results will be identified separately.",
];

const W = 360;
const H = 220;
/** Hover intent: sweeping the pointer down the list does not flick through every figure. */
const INTENT_MS = 120;

const O = APP_FACTS.order;
const at = (i: number) => ({ ["--i" as string]: i }) as CSSProperties;
const tone = (t: string, i?: number) => ({ ...toneVars(t), ...(i === undefined ? null : at(i)) }) as CSSProperties;
const check = (x: number, y: number) => `M${x - 4.5} ${y}l3.2 3.2 6.3-6.6`;

/** The records behind the order example, each in the colour of the source it came from. */
const EVIDENCE: [string, string][] = [
  ["cobalt", `Customer order · ${O.lines} lines`],
  ["violet", "Approved item mappings"],
  ["saffron", "Pack-unit rules"],
];

/* ---------------------------------------------------------------- figures */

const SYSTEMS = CONNECTS.map((c) => ({ name: c.name, tone: c.tone }));

function Systems() {
  return (
    <>
      <text x="0" y="16">YOUR RECORDS, IN PLACE</text>
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
      <text x="311" y="106" textAnchor="middle" className="fa-v fa-on-ink">Discovery</text>
      <text x="311" y="126" textAnchor="middle" className="fa-on-ink">ACCESS AGREED</text>
    </>
  );
}

const FIELDS = [
  { sys: "Line 1", tone: "cobalt", field: "Switch 16A · matched", state: "ok" },
  { sys: "Line 7", tone: "violet", field: "Old item code", state: "conflict" },
  { sys: "Line 9", tone: "emerald", field: "Price list · current", state: "ok" },
  { sys: "Line 12", tone: "saffron", field: "Box or piece?", state: "missing" },
  { sys: "Terms", tone: "tangerine", field: "Unchanged", state: "ok" },
] as const;

function Exceptions() {
  return (
    <>
      <rect x="0" y="0" width="196" height="32" rx="16" className="fa-ink" />
      <text x="16" y="21" className="fa-v fa-on-ink">{`Order ${O.po}`}</text>
      <text x="208" y="20.5">ROUTINE OR REVIEW</text>
      <path d="M12 32V164" className="fa-link fa-draw" pathLength={1} />
      {FIELDS.map((f, i) => {
        const y = 48 + i * 34;
        const cy = y + 14;
        const open = f.state !== "ok";
        return (
          <g key={f.field} style={tone(f.tone, i)}>
            <path d={`M12 ${cy}H24`} className="fa-link fa-draw" pathLength={1} style={at(2 + i)} />
            <rect x="24.5" y={y + 0.5} width="335" height="27" rx="8" className={f.state === "missing" ? "fa-sheet fa-dashed" : "fa-sheet"} />
            <circle cx="39" cy={cy} r="4" className="fa-dot" />
            <text x="50" y={cy + 4}>{f.sys.toUpperCase()}</text>
            <text x="128" y={cy + 4.2} className="fa-v">{f.field}</text>
            <g className="fa-rise" style={at(3 + i)}>
              {!open && <path d={check(340, cy)} className="fa-check" />}
              {open && (
                <>
                  <circle cx="262" cy={cy} r="3.5" className="fa-risk" />
                  <text x="346" y={cy + 4} textAnchor="end" className="fa-risk-text">{f.state === "missing" ? "CLARIFY" : "CONFIRM"}</text>
                </>
              )}
            </g>
          </g>
        );
      })}
    </>
  );
}

/** "Agreed first": a checklist that must be complete before anything is shared or connected. */
function Agreed({ title, rows, who }: { title: string; rows: [string, string][]; who: string }) {
  return (
    <>
      <rect x="0.5" y="0.5" width="209" height="219" rx="14" className="fa-sheet" />
      <text x="16" y="28">{title}</text>
      {rows.map(([k, v], i) => {
        const cy = 56 + i * 32;
        return (
          <g key={k}>
            {i > 0 && <path d={`M16 ${cy - 16}H194`} className="fa-hair" />}
            <text x="16" y={cy + 4.2} className="fa-v">{k}</text>
            <text x="172" y={cy + 4} textAnchor="end" className="fa-s">{v}</text>
            <path d={check(188, cy)} className="fa-check fa-draw" pathLength={1} style={at(i)} />
          </g>
        );
      })}
      <path d="M16 172H194" className="fa-hair" />
      <text x="16" y="198" className="fa-s">{who}</text>
      <g className="fa-rise" style={at(4)}>
        <circle cx="186" cy="194" r="9" className="fa-ok" />
        <path d={check(186, 194)} className="fa-check fa-on-ok" />
      </g>
      {/* Then, and only then, the records move: as approved files first. */}
      <text x="232" y="16">YOUR RECORDS</text>
      <rect x="232.5" y="26.5" width="127" height="31" rx="10" className="fa-sheet" />
      {CONNECTS.map((c, i) => <circle key={c.id} cx={252 + i * 17.6} cy="42" r="4" className="fa-dot" style={toneVars(c.tone)} />)}
      <path d="M296 58V170" className="fa-link fa-draw" pathLength={1} style={at(5)} />
      <path d="M291 165l5 5.5 5-5.5" className="fa-link fa-rise" style={at(7)} />
      <g className="fa-rise" style={at(6)}>
        <rect x="236.5" y="104.5" width="119" height="20" rx="10" className="fa-sheet" />
        <text x="296" y="118.5" textAnchor="middle">APPROVED FILES</text>
      </g>
      <rect x="232" y="176" width="128" height="44" rx="12" className="fa-ink" />
      <text x="296" y="202.5" textAnchor="middle" className="fa-v fa-on-ink">Assessment</text>
    </>
  );
}

const Sources = () => (
  <Agreed
    title="CHECKED FIRST"
    who="Your process owner"
    rows={[
      ["Sources", "Authorised"],
      ["Languages", "Tested"],
      ["Scans", "Sampled"],
      ["Private chats", "Not assumed"],
    ]}
  />
);
const DataHandling = () => (
  <Agreed
    title="AGREED FIRST"
    who="Your IT owner"
    rows={[
      ["Access", "Agreed"],
      ["Storage", "Agreed"],
      ["Model providers", "Agreed"],
      ["Retention", "Agreed"],
    ]}
  />
);

/** An application as a card: its records, its checks and the person who approves its work. */
function Workflow({ stamp }: { stamp: string }) {
  const { matched, total, item, unit } = ORDER_COUNTS;
  const fill = 164 * (matched / total);
  return (
    <>
      <text x="0" y="18" className="fa-v">Customer order intake</text>
      <text x="0" y="37" className="fa-s">{`Order ${O.po}`}</text>
      <text x="360" y="18" textAnchor="end">{stamp}</text>
      <path d="M0 54H360" className="fa-hair" />
      <text x="0" y="80">SOURCE RECORDS</text>
      {EVIDENCE.map(([t, text], i) => (
        <g key={text} className="fa-rise" style={tone(t, i)}>
          <circle cx="4" cy={104 + i * 22} r="3.5" className="fa-dot" />
          <text x="14" y={108 + i * 22} className="fa-s">{text}</text>
        </g>
      ))}
      <text x="196" y="80">ORDER LINES</text>
      <rect x="196" y="100" width="164" height="8" rx="4" className="fa-track" />
      <rect x="196" y="100" width={fill} height="8" rx="4" className="fa-ok fa-grow" style={at(3)} />
      <text x="196" y="130" className="fa-s">{`${matched} of ${total} matched`}</text>
      <g className="fa-rise" style={at(5)}>
        <circle cx="201" cy="148" r="3.5" className="fa-risk" />
        <text x="214" y="152" className="fa-s">{`${item + unit} for the order desk`}</text>
      </g>
      <path d="M0 168H360" className="fa-hair" />
      <text x="0" y="190">APPROVED BY</text>
      <text x="0" y="209" className="fa-v">Order desk</text>
      <g className="fa-rise" style={at(7)}>
        <rect x="270" y="188" width="90" height="22" rx="11" className="fa-sheet" />
        <text x="315" y="203" textAnchor="middle" className="fa-v">Draft</text>
      </g>
    </>
  );
}
const Building = () => <Workflow stamp="SCOPED FOR YOU" />;
const Examples = () => <Workflow stamp="ILLUSTRATIVE EXAMPLE" />;

/** A written agreement: who owns or runs each part. */
function Agreement({ title, rows }: { title: string; rows: { name: string; owner: string; detail: string }[] }) {
  return (
    <>
      <rect x="0.5" y="0.5" width="359" height="219" rx="14" className="fa-sheet" />
      <text x="18" y="28">{title}</text>
      <path d="M18 42H342" className="fa-hair strong" />
      {rows.map((r, i) => {
        const cy = 62 + i * 40;
        const yours = r.owner === "Yours" || r.owner === "Free";
        return (
          <g key={r.name}>
            {i > 0 && <path d={`M18 ${cy - 20}H342`} className="fa-hair" />}
            <text x="18" y={cy + 4.2} className="fa-v">{r.name}</text>
            <text x="136" y={cy + 4} className="fa-s">{r.detail}</text>
            <g className="fa-rise" style={at(3 + i)}>
              <rect x="276.5" y={cy - 10.5} width="65" height="21" rx="10.5" className={yours ? "fa-ink" : "fa-sheet"} />
              <text x="309" y={cy + 4.2} textAnchor="middle" className={yours ? "fa-v fa-on-ink" : "fa-v"}>{r.owner}</text>
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
const Cost = () => (
  <Agreement
    title="WRITTEN PROPOSAL"
    rows={[
      { name: "First call", detail: "30 minutes", owner: "Free" },
      { name: "Assessment", detail: "Scoped separately", owner: "Scoped" },
      { name: "Build, support", detail: "Scope and timing", owner: "Proposal" },
    ]}
  />
);
/** The four industries in our examples, each placed by how much of its work crosses systems and how often. */
const CANDIDATES = [
  { rank: 1, name: "Distribution", tone: "violet", x: 326, y: 60, end: true },
  { rank: 2, name: "Manufacturing", tone: "emerald", x: 300, y: 92, end: true },
  { rank: 3, name: "Logistics", tone: "tangerine", x: 336, y: 140, end: true },
  { rank: 4, name: "B2B services", tone: "pink", x: 60, y: 160, end: false },
];

function Segments() {
  return (
    <>
      <rect x="188" y="22" width="162" height="81" className="fa-well fa-rise" />
      <path d="M188 22V184M24 103H350" className="fa-hair fa-dashed" />
      <path d="M24 184V22" className="fa-axis" />
      <path d="M24 184H350" className="fa-axis" />
      <path d="M19.5 26l4.5-5 4.5 5M346 179.5l5 4.5-5 4.5" className="fa-axis" />
      <text x="34" y="26">ACROSS SYSTEMS</text>
      <text x="352" y="208" textAnchor="end">HOW OFTEN</text>
      <text x="340" y="42" textAnchor="end" className="fa-rise" style={at(1)}>GOOD STARTS</text>
      {CANDIDATES.map((c) => (
        <g key={c.name} className="fa-rise" style={tone(c.tone, c.rank * 2 - 1)}>
          <circle cx={c.x} cy={c.y} r={5} className="fa-dot" />
          <text x={c.end ? c.x - 14 : c.x + 12} y={c.y + 4} textAnchor={c.end ? "end" : "start"} className="fa-s">
            {c.name}
          </text>
        </g>
      ))}
    </>
  );
}

const FIGURES = [Building, Segments, Systems, Exceptions, Sources, DataHandling, Cost, Examples];

/* ---------------------------------------------------------------- pieces */

/** One answer's drawing. `on` draws it in (strokes, then the result); off, it waits undrawn. */
function FaqArt({ index, on }: { index: number; on: boolean }) {
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
        <span className="faq-fig-ex t-label">Illustrative example</span>
        <span className="faq-fig-lines">
          {LINES.map((line, i) => (
            <span key={i} className="faq-fig-line" data-on={i === index || undefined} aria-hidden={i !== index}>
              <span className="faq-fig-topic t-label">
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
