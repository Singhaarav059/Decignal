"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CONNECTS, FAQ_TOPICS } from "@/lib/content";
import { EXAMPLE } from "@/lib/example";
import { toneVars } from "@/lib/tone";
import { useSvgScale } from "./svgScale";

/**
 * Answer figures for the home FAQ: one schematic per question, drawn from what its answer says, in
 * the worked dispatch example's own figures. Desktop shows the figure beside the list (the open
 * question, or the one under the pointer or keyboard focus); phones show it inside the opened answer.
 * Index-aligned with FAQ and FAQ_TOPICS (lib/content.ts).
 */

/** The one line under each figure: what the drawing shows, in plain words. */
const LINES = [
  "Your ERP keeps the transaction. What remains is the evidence work around it, prepared for review.",
  "Manufacturers, distributors and service businesses each start with the workflow that fits them.",
  "A proposed workflow: source records, explicit checks and a named reviewer who decides.",
  "Your systems stay responsible for their records. The application prepares work for your team.",
  "Configuration, a specialist product or a custom build: compared on your own records first.",
  "We start from approved exports and sample files, and confirm any live connection before proposing it.",
  "Every item is supported, missing or conflicting, with its source. Your reviewer resolves the rest.",
  "Sources and languages are tested on real samples. Private chats and portals are never assumed.",
  "Access, storage, model providers and retention are agreed before any project data is shared.",
  "The first call is free. Assessment, build and support are each scoped in a written proposal.",
  "The project agreement names what is yours, what is licensed and who maintains it.",
  "Every example on this site is illustrative. Customer results will be identified separately.",
];

const W = 360;
const H = 220;
/** Hover intent: sweeping the pointer down the list does not flick through every figure. */
const INTENT_MS = 120;

const L = EXAMPLE.line;
const C = EXAMPLE.cert;
const at = (i: number) => ({ ["--i" as string]: i }) as CSSProperties;
const tone = (t: string, i?: number) => ({ ...toneVars(t), ...(i === undefined ? null : at(i)) }) as CSSProperties;
const check = (x: number, y: number) => `M${x - 4.5} ${y}l3.2 3.2 6.3-6.6`;

/** The source records behind the review, each in the colour of the source it came from. */
const EVIDENCE: [string, string][] = [
  ["cobalt", `Line ${L.n} · heat ${L.heat}`],
  ["tangerine", `Certificate · heat ${C.heat}`],
  ["saffron", "No process certificate"],
];

/* ---------------------------------------------------------------- figures */

function ExistingSoftware() {
  return (
    <>
      {/* Your ERP: the transaction is recorded and stops there. */}
      <rect x="0.5" y="8.5" width="160" height="203" rx="12" className="fa-well" />
      <text x="16" y="32">YOUR ERP</text>
      {[84, 116, 148].map((y) => <path key={y} d={`M16 ${y}H144`} className="fa-grid" />)}
      <path d="M16 176H144" className="fa-axis" />
      {[64, 96, 128].map((y, i) => (
        <g key={y}>
          <rect x="16" y={y} width="96" height="14" rx="4" className="fa-past-dot" opacity={0.5 - i * 0.12} />
          <path d={check(130, y + 7)} className="fa-check" />
        </g>
      ))}
      <text x="16" y="198">RECORDED</text>
      {/* The work that remains, prepared for a person. */}
      <path d="M111 124H177" className="fa-link fa-draw" pathLength={1} style={at(3)} />
      <path d="M172 119.5l5 4.5-5 4.5" className="fa-link fa-rise" style={at(5)} />
      <rect x="180.5" y="8.5" width="179" height="203" rx="12" className="fa-sheet" />
      <text x="196" y="32">WHAT REMAINS</text>
      <text x="196" y="54" className="fa-v">{`Line ${L.n} to check`}</text>
      <text x="196" y="71" className="fa-s">{`Shipment ${EXAMPLE.shipment.id}`}</text>
      <path d="M196 84H344" className="fa-hair" />
      <text x="196" y="102">SOURCE RECORDS</text>
      {EVIDENCE.map(([t, text], i) => (
        <g key={text} className="fa-rise" style={tone(t, 4 + i)}>
          <circle cx="200" cy={117 + i * 18} r="3.5" className="fa-dot" />
          <text x="210" y={121 + i * 18} className="fa-s">{text}</text>
        </g>
      ))}
      <g className="fa-rise" style={at(8)}>
        <rect x="196" y="171" width="92" height="22" rx="11" className="fa-ink" />
        <text x="242" y="186.2" textAnchor="middle" className="fa-v fa-on-ink">For review</text>
      </g>
    </>
  );
}

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
      <text x="311" y="106" textAnchor="middle" className="fa-v fa-on-ink">Review</text>
      <text x="311" y="126" textAnchor="middle" className="fa-on-ink">EXPORTS FIRST</text>
    </>
  );
}

const FIELDS = [
  { sys: "ERP", tone: "cobalt", field: `Line ${L.n} · ${L.heat}`, state: "ok" },
  { sys: "Supplier", tone: "tangerine", field: `Certificate · ${C.heat}`, state: "conflict" },
  { sys: "Quality", tone: "emerald", field: "Dimensional report", state: "ok" },
  { sys: "Job work", tone: "saffron", field: "Heat treatment", state: "missing" },
  { sys: "Customer", tone: "violet", field: `Checklist ${EXAMPLE.checklist.rev}`, state: "ok" },
] as const;

function Exceptions() {
  return (
    <>
      <rect x="0" y="0" width="196" height="32" rx="16" className="fa-ink" />
      <text x="16" y="21" className="fa-v fa-on-ink">{`Pack ${EXAMPLE.shipment.id}`}</text>
      <text x="208" y="20.5">EVERY ITEM, A STATUS</text>
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
                  <text x="346" y={cy + 4} textAnchor="end" className="fa-risk-text">{f.state === "missing" ? "MISSING" : "CONFLICT"}</text>
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

/** A proposed workflow as a card: its records, its checks and the person who reviews it. */
function Workflow({ stamp }: { stamp: string }) {
  const counts = EXAMPLE.checklist.items.filter((i) => i.status === "supported").length;
  const total = EXAMPLE.checklist.items.length;
  const fill = 164 * (counts / total);
  return (
    <>
      <text x="0" y="18" className="fa-v">Dispatch document pack review</text>
      <text x="0" y="37" className="fa-s">{`Shipment ${EXAMPLE.shipment.id}`}</text>
      <text x="360" y="18" textAnchor="end">{stamp}</text>
      <path d="M0 54H360" className="fa-hair" />
      <text x="0" y="80">SOURCE RECORDS</text>
      {EVIDENCE.map(([t, text], i) => (
        <g key={text} className="fa-rise" style={tone(t, i)}>
          <circle cx="4" cy={104 + i * 22} r="3.5" className="fa-dot" />
          <text x="14" y={108 + i * 22} className="fa-s">{text}</text>
        </g>
      ))}
      <text x="196" y="80">CHECKLIST</text>
      <rect x="196" y="100" width="164" height="8" rx="4" className="fa-track" />
      <rect x="196" y="100" width={fill} height="8" rx="4" className="fa-ok fa-grow" style={at(3)} />
      <text x="196" y="130" className="fa-s">{`${counts} of ${total} supported`}</text>
      <g className="fa-rise" style={at(5)}>
        <circle cx="201" cy="148" r="3.5" className="fa-risk" />
        <text x="214" y="152" className="fa-s">2 left for review</text>
      </g>
      <path d="M0 168H360" className="fa-hair" />
      <text x="0" y="190">REVIEWED BY</text>
      <text x="0" y="209" className="fa-v">{EXAMPLE.reviewer}</text>
      <g className="fa-rise" style={at(7)}>
        <rect x="270" y="188" width="90" height="22" rx="11" className="fa-sheet" />
        <text x="315" y="203" textAnchor="middle" className="fa-v">Draft</text>
      </g>
    </>
  );
}
const Building = () => <Workflow stamp="PROPOSED WORKFLOW" />;
const Examples = () => <Workflow stamp="ILLUSTRATIVE EXAMPLE" />;

/** Three routes compared on the same records: configure, buy, or build only for a gap. */
function Routes() {
  const rows = [
    { label: "CONFIGURE YOUR SOFTWARE", value: "Check first", w: 0.42 },
    { label: "SPECIALIST PRODUCT", value: "Compare", w: 0.64 },
    { label: "CUSTOM APPLICATION", value: "Only for a gap", w: 0.86 },
  ];
  return (
    <>
      {rows.map((r, i) => {
        const y = 22 + i * 58;
        const cy = y + 22;
        return (
          <g key={r.label}>
            <text x="8" y={y}>{r.label}</text>
            <text x="352" y={y} textAnchor="end" className="fa-v">{r.value}</text>
            <path d={`M8 ${cy}H352`} className="fa-hair" />
            <circle cx="8" cy={cy} r="3" className="fa-ink" />
            <rect x="8" y={cy - 6} width={344 * r.w} height="12" rx="6" className={i === 2 ? "fa-ok fa-grow" : "fa-track fa-grow"} style={at(1 + i * 2)} />
          </g>
        );
      })}
      <path d="M8 194H352" className="fa-axis" />
      {["COST", "SUPPORT", "RESULTS ON YOUR RECORDS"].map((k, i) => (
        <text key={k} x={i === 0 ? 8 : i === 1 ? 120 : 352} y="214" textAnchor={i === 2 ? "end" : "start"} className="fa-num">
          {k}
        </text>
      ))}
    </>
  );
}

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
      { name: "Build, support", detail: "Fees and timing", owner: "Proposal" },
    ]}
  />
);
const Ownership = () => (
  <Agreement
    title="PROJECT AGREEMENT"
    rows={[
      { name: "Custom work", detail: "Ownership or licence", owner: "Agreed" },
      { name: "Your data", detail: "Access and deletion", owner: "Yours" },
      { name: "Maintenance", detail: "Handover and support", owner: "Agreed" },
    ]}
  />
);

/** Customer segments, each placed by how document-heavy and how frequent its first workflow is. */
const CANDIDATES = [
  { rank: 1, name: "Dispatch packs", tone: "emerald", x: 326, y: 68, end: true },
  { rank: 2, name: "RFQ clarification", tone: "tangerine", x: 336, y: 134, end: true },
  { rank: 3, name: "Service follow-ups", tone: "pink", x: 60, y: 160, end: false },
];

function Segments() {
  return (
    <>
      <rect x="188" y="22" width="162" height="81" className="fa-well fa-rise" />
      <path d="M188 22V184M24 103H350" className="fa-hair fa-dashed" />
      <path d="M24 184V22" className="fa-axis" />
      <path d="M24 184H350" className="fa-axis" />
      <path d="M19.5 26l4.5-5 4.5 5M346 179.5l5 4.5-5 4.5" className="fa-axis" />
      <text x="34" y="26">DOCUMENT-HEAVY</text>
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

const FIGURES = [ExistingSoftware, Segments, Building, Systems, Routes, Systems, Exceptions, Sources, DataHandling, Cost, Ownership, Examples];

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
        <span className="faq-fig-ex t-label">{EXAMPLE.label}</span>
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
