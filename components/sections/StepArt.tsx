"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { toneVars } from "@/lib/tone";
import { CONNECTS } from "@/lib/content";
import { useSvgScale } from "./svgScale";

/**
 * The How we work drawings, one picture per step on the order-intake example (a 40-line customer
 * order, 27 lines matched). 01 maps the record sources onto one task and checks the existing software,
 * 02 is the agreed scope of that application as an annotated wireframe, 03 is the same screen tested
 * with the team, 04 is the owners who keep it running and improving after launch. 02 and 03 share
 * one frame, so the step change reads as the wireframe becoming the tested review. The caller sets `--tone` (the step colour, used
 * for annotations and progress); systems and areas draw in their own colours. Labels stay 11px on
 * screen via useSvgScale and drop on thumbnails (the nav's glance). Entrance motion lives in
 * app/styles/decor-steps.css and only runs where the drawing is shown large.
 */
export function StepArt({ index }: { index: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useSvgScale(320, 240);
  return (
    <svg ref={ref} className="step-art" data-step={index + 1} viewBox="0 0 320 240" aria-hidden>
      {index === 0 ? <MapArt /> : index === 1 ? <BlueprintArt grid={`sx-grid-${uid}`} /> : index === 2 ? <LaunchArt /> : <ExpandArt />}
    </svg>
  );
}

/** Stagger index for the entrance (delay = d x --stagger). */
const d = (n: number, more?: CSSProperties) => ({ ["--d" as string]: n, ...more }) as CSSProperties;

const SYS = Object.fromEntries(CONNECTS.map((c) => [c.id, c.tone]));

/** A person: the users and approvers the decision belongs to. */
function Person({ x, y }: { x: number; y: number }) {
  return (
    <g className="sx-person">
      <circle cx={x} cy={y - 3} r="2.6" />
      <path d={`M${x - 4.8} ${y + 5.2}a4.8 4.8 0 0 1 9.6 0z`} />
    </g>
  );
}

/** A tick inside a filled circle (signed off, approved). */
function Tick({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g className="sx-in" style={d(n)}>
      <circle cx={x} cy={y} r="7" className="sx-ok" />
      <path d={`M${x - 3} ${y + 0.2}l2 2.2 4-4.6`} className="sx-check sx-draw" pathLength={1} style={d(n + 1)} />
    </g>
  );
}

/** A system chip: its colour dot and name. */
function SysChip({ x, y, w, id, label, n }: { x: number; y: number; w: number; id: string; label: string; n: number }) {
  return (
    <g className="sx-in" style={d(n, toneVars(SYS[id]))}>
      <rect x={x} y={y} width={w} height="24" rx="6" className="sx-chip" />
      <circle cx={x + 11} cy={y + 12} r="3.5" className="sx-dot" />
      <text x={x + 19} y={y + 12.5}>{label}</text>
    </g>
  );
}

/* ---- 01 Review the task: six record sources, one task, its people and the existing software ---- */
function MapArt() {
  return (
    <>
      <text x="12" y="14" className="sx-k sx-in" style={d(0)}>RECORDS</text>
      {CONNECTS.map((c, i) => {
        const cy = 38 + i * 34;
        const ey = 98 + i * 6.4;
        return (
          <g key={c.id} className="sx-sys">
            <path d={`M98 ${cy}C124 ${cy} 124 ${ey} 150 ${ey}`} className="sx-link sx-draw" pathLength={1} style={d(i + 1, toneVars(c.tone))} />
            <SysChip x={12} y={cy - 12} w={86} id={c.id} label={c.name.split(" ")[0]} n={i} />
          </g>
        );
      })}

      {/* Users sit on the decision card's left edge (x 150), like the systems on theirs (x 12). */}
      <text x="150" y="14" className="sx-k sx-in" style={d(5)}>PEOPLE</text>
      <path d="M187 50V80M270 50V80" className="sx-hair sx-draw" pathLength={1} style={d(6)} />
      {[
        { x: 150, w: 74, label: "Sales" },
        { x: 230, w: 80, label: "Order desk" },
      ].map((u, i) => (
        <g key={u.label} className="sx-in" style={d(6 + i)}>
          <rect x={u.x} y="26" width={u.w} height="24" rx="6" className="sx-chip" />
          <Person x={u.x + 13} y={38} />
          <text x={u.x + 24} y="38.5">{u.label}</text>
        </g>
      ))}

      <g className="sx-in" style={d(4)}>
        <rect x="150" y="80" width="160" height="64" rx="10" className="sx-card" />
        <text x="164" y="97" className="sx-k">TASK</text>
        <text x="164" y="116" className="sx-h">Turn an order into</text>
        <text x="164" y="132" className="sx-h">a draft order</text>
      </g>

      <path d="M158 144V209M158 183H166M158 209H166" className="sx-hair sx-draw" pathLength={1} style={d(7)} />
      <text x="166" y="161" className="sx-k sx-in" style={d(7)}>EXISTING SOFTWARE</text>
      {["Order import: checked", "Gap: aliases, units"].map((t, i) => (
        <g key={t} className="sx-in" style={d(8 + i)}>
          <rect x="166" y={172 + i * 26} width="144" height="22" rx="6" className="sx-chip" />
          <text x="176" y={183.5 + i * 26} className="sx-num">{t}</text>
        </g>
      ))}
    </>
  );
}

/* The review's screen, shared by 02 (wireframe) and 03 (tested). Frame 18..190 x 18..222. */
const SOURCES = [
  { id: "erp", label: "ERP", x: 30, w: 45 },
  { id: "crm", label: "Items", x: 79, w: 47 },
  { id: "sup", label: "PO", x: 130, w: 50 },
];

function ScreenHeader({ n, children }: { n: number; children?: ReactNode }) {
  return (
    <g className="sx-in" style={d(n)}>
      <text x="30" y="35" className="sx-k">ORDER INTAKE</text>
      {children}
    </g>
  );
}

/* ---- 02 Agree the scope: the review's screen as an agreed, annotated wireframe ---- */
function BlueprintArt({ grid }: { grid: string }) {
  const notes = [
    { y: 78, label: "Output" },
    { y: 112, label: "Inputs" },
    { y: 148, label: "Checks" },
    { y: 190, label: "Approver" },
  ];
  return (
    <>
      <defs>
        <pattern id={grid} width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="0.75" className="sx-grid-dot" />
        </pattern>
      </defs>
      {/* The well itself is the blueprint sheet: the dot grid runs past the 4:3 box to its edges, so
          the sheet never sits as a framed card inside a letterboxed well. */}
      <rect x="-320" y="-240" width="960" height="720" fill={`url(#${grid})`} className="sx-in" style={d(0)} />

      <g className="sx-in" style={d(1)}>
        <rect x="18" y="18" width="172" height="204" rx="10" className="sx-wire sx-paper" />
        <path d="M18 50H190" className="sx-wire" />
      </g>
      <ScreenHeader n={2} />
      <g className="sx-in" style={d(3)}>
        <text x="30" y="70" className="sx-h">Draft order lines</text>
        <text x="30" y="86" className="sx-h">with their sources</text>
      </g>
      {SOURCES.map((s, i) => (
        <g key={s.id} className="sx-in" style={d(4 + i * 0.5, toneVars(SYS[s.id]))}>
          <rect x={s.x} y="100" width={s.w} height="24" rx="6" className="sx-wire" />
          <circle cx={s.x + 11} cy="112" r="3.5" className="sx-dot" />
          <text x={s.x + 19} y="112.5">{s.label}</text>
        </g>
      ))}
      <g className="sx-in" style={d(5)}>
        <text x="30" y="141" className="sx-soft">Order lines</text>
        <text x="178" y="141" textAnchor="end" className="sx-num">40 lines</text>
        <rect x="30" y="152" width="148" height="8" rx="4" className="sx-wire" />
      </g>
      <g className="sx-in" style={d(6)}>
        <rect x="30" y="176" width="64" height="28" rx="14" className="sx-wire" />
        <text x="62" y="190.5" textAnchor="middle" className="sx-soft">Review</text>
        <Person x={110} y={190} />
        <text x="121" y="190.5">Order desk</text>
      </g>

      {notes.map((m, i) => (
        <g key={m.label} className="sx-in sx-note" style={d(7 + i)}>
          <path d={`M190 ${m.y}H212`} className="sx-lead" />
          <circle cx="190" cy={m.y} r="2.5" className="sx-dot" />
          <circle cx="220" cy={m.y} r="8" className="sx-dot" />
          <text x="220" y={m.y + 0.5} textAnchor="middle" className="sx-on-tone sx-num">{i + 1}</text>
          <text x="234" y={m.y + 0.5}>{m.label}</text>
        </g>
      ))}

      <g className="sx-in" style={d(11)}>
        <rect x="206" y="18" width="98" height="28" rx="8" className="sx-chip" />
        <text x="234" y="32.5">Agreed</text>
      </g>
      {/* On the notes' axis: tick centred over the numbers (x 220), label on their labels (x 234). */}
      <Tick x={220} y={32} n={11} />
    </>
  );
}

/* ---- 03 Build and test with your team: the same screen, built and tried on real examples ---- */
function LaunchArt() {
  return (
    <>
      <rect x="18" y="18" width="172" height="204" rx="10" className="sx-frame sx-in" style={d(0)} />
      <path d="M18 50H190" className="sx-hair sx-in" style={d(0)} />
      <ScreenHeader n={1}>
        <circle cx="152" cy="34" r="3.5" className="sx-ok sx-pulse" />
        <text x="160" y="34.5" className="sx-ok-ink">Test</text>
      </ScreenHeader>
      <g className="sx-in" style={d(2)}>
        <text x="30" y="70" className="sx-h sx-num">PO-7731 · 40 lines</text>
        <text x="30" y="87" className="sx-soft sx-num">13 lines to confirm</text>
      </g>
      {SOURCES.map((s, i) => (
        <SysChip key={s.id} x={s.x} y={100} w={s.w} id={s.id} label={s.label} n={3 + i * 0.5} />
      ))}
      <g className="sx-in" style={d(4)}>
        <text x="30" y="141" className="sx-soft">Matched</text>
        <text x="178" y="141" textAnchor="end" className="sx-num">27 of 40</text>
        <path d="M34 156H174" className="sx-track" />
      </g>
      {/* 27 of the 40 lines: about two thirds of the track. */}
      <path d="M34 156H128.5" className="sx-bar sx-draw" pathLength={1} style={d(5)} />
      <g className="sx-in" style={d(6)}>
        <rect x="30" y="176" width="64" height="28" rx="14" className="sx-ink" />
        <text x="62" y="190.5" textAnchor="middle" className="sx-on-ink">Approve</text>
        <text x="121" y="182.5">Order desk</text>
        <text x="121" y="198.5" className="sx-soft sx-num">Draft</text>
      </g>
      <Tick x={108} y={190} n={7} />

      {/* Representative cases, beside the screen: complete, incomplete, conflicting. */}
      <path d="M214 70V190" className="sx-track thin sx-in" style={d(2)} />
      <path d="M214 70V190" className="sx-progress sx-draw" pathLength={1} style={d(3)} />
      {[
        { y: 70, label: "Routine", n: 3 },
        { y: 124, label: "Exceptions", n: 5 },
        { y: 190, label: "Refined", n: 8 },
      ].map((m, i) => (
        <g key={m.label} className="sx-in" style={d(m.n)}>
          <circle cx="214" cy={m.y} r="5" className={i === 2 ? "sx-ok sx-ring" : "sx-dot sx-ring"} />
          <text x="226" y={m.y + 0.5} className={i === 2 ? undefined : "sx-soft"}>{m.label}</text>
        </g>
      ))}
      {/* The reviewers whose results it is compared with. */}
      {[0, 1, 2].map((i) => (
        <g key={i} className="sx-in" style={d(6 + i * 0.5)}>
          <circle cx={233 + i * 15} cy="146" r="8" className="sx-chip" />
          <Person x={233 + i * 15} y={146.5} />
        </g>
      ))}
    </>
  );
}

/* ---- 04 Run and improve: who uses it, who handles changes, who reviews results ---- */
const NEXT = [
  { name: ["Uses it", "Order desk"], tone: "emerald", status: "Owner", reads: ["erp", "mes", "sup"], kind: "live" },
  { name: ["Issues", "Support"], tone: "violet", status: "Agreed", reads: ["ext", "sup"], kind: "next" },
  { name: ["Review", "Monthly"], tone: "cobalt", status: "Planned", reads: ["crm", "mes"], kind: "later" },
] as const;

function ExpandArt() {
  // Rows: decision cards 22..114, plugs 114..150, shared controls 150..180, context layer 188..218.
  return (
    <>
      <g className="sx-in" style={d(0)}>
        <rect x="12" y="188" width="296" height="30" rx="8" className="sx-chip" />
        <text x="24" y="203.5" className="sx-k">RECORD SOURCES</text>
        {CONNECTS.map((c, i) => (
          <circle key={c.id} cx={216 + i * 16} cy="203" r="4" className="sx-dot" style={toneVars(c.tone)} />
        ))}
      </g>
      <g className="sx-in" style={d(1)}>
        <rect x="12" y="150" width="296" height="30" rx="8" className="sx-chip" />
        <text x="24" y="165.5" className="sx-k">ROLLOUT PLAN</text>
        <text x="296" y="165.5" textAnchor="end" className="sx-soft">Named responsibilities</text>
      </g>

      {NEXT.map((a, i) => {
        const x = 12 + i * 102;
        const n = a.kind === "live" ? 2 : a.kind === "later" ? 3 : 5;
        return (
          <g key={a.status} style={toneVars(a.tone)}>
            <path
              d={`M${x + 46} 114V150`}
              className={a.kind === "later" ? "sx-hair dash sx-in" : a.kind === "next" ? "sx-plug sx-draw" : "sx-hair strong sx-in"}
              pathLength={a.kind === "next" ? 1 : undefined}
              style={d(a.kind === "next" ? 7 : n)}
            />
            <g className={a.kind === "next" ? "sx-drop" : "sx-in"} style={d(n)}>
              <rect x={x} y="22" width="92" height="92" rx="10" className={a.kind === "later" ? "sx-wire" : a.kind === "next" ? "sx-card" : "sx-chip"} />
              <circle cx={x + 14} cy="38" r="4" className="sx-dot" />
              <text x={x + 80} y="38.5" textAnchor="end" className={a.kind === "live" ? "sx-ok-ink" : "sx-soft"}>{a.status}</text>
              <text x={x + 12} y="66" className={a.kind === "later" ? "sx-h sx-faint" : "sx-h"}>{a.name[0]}</text>
              <text x={x + 12} y="82" className={a.kind === "later" ? "sx-h sx-faint" : "sx-h"}>{a.name[1]}</text>
              {a.reads.map((r, j) => (
                <circle key={r} cx={x + 15 + j * 9} cy="100" r="2.5" className="sx-dot" style={toneVars(SYS[r])} />
              ))}
            </g>
          </g>
        );
      })}
    </>
  );
}
