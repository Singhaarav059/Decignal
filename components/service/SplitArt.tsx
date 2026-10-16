"use client";

import type { CSSProperties } from "react";
import { toneVars } from "@/lib/tone";
import { sourceIcon, sourceTone, systemPath } from "../ui/SystemIcon";
import { Tick, useServiceArt } from "./ArtKit";

/**
 * The drawings under the split sections' titles on a function page, in the function's tone (inherited
 * from main.svc); records keep their system's colour, a question still open is signal red.
 *   changes  — the page's records, scattered with one missing, become one list ready for review
 *   prepare  — the draft an application hands over: lines ready or to confirm, approved by the team
 *   start    — a recent example, the software that handles it today, and what an application adds
 *   example  — the worked example's four lines as stations: its records, the application linking them,
 *              the output with one question open, and the owner who takes the next step
 */
export function SplitArt({
  kind,
  records = [],
  rows = 3,
  labels = [],
}: {
  kind: "changes" | "prepare" | "start" | "example";
  records?: string[];
  rows?: number;
  labels?: string[];
}) {
  const [w, h] = SIZE[kind];
  const ref = useServiceArt(w, h);
  return (
    <svg ref={ref} className="svc-art sa" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {kind === "changes" ? (
        <Changes records={records} />
      ) : kind === "prepare" ? (
        <Prepare rows={rows} />
      ) : kind === "example" ? (
        <Example records={records} labels={labels} />
      ) : (
        <Start />
      )}
    </svg>
  );
}

const SIZE = { changes: [400, 240], prepare: [400, 236], start: [400, 150], example: [400, 148] } as const;
const d = (ms: number, more?: CSSProperties) => ({ ["--d" as string]: `${ms}ms`, ...more }) as CSSProperties;

/** A system icon (24px grid) at (x, y), drawn s times its size in the record's colour. */
function Icon({ name, x, y, s = 0.66 }: { name: string; x: number; y: number; s?: number }) {
  return <path d={systemPath(sourceIcon(name))} transform={`translate(${x} ${y}) scale(${s})`} className="k-icon" />;
}

/* ------------------------------------------------------------ what changes */

const SCATTER: [number, number, number][] = [
  [4, 18, -4],
  [22, 70, 3],
  [0, 124, -2],
  [16, 178, 4],
];

function Changes({ records }: { records: string[] }) {
  const recs = records.slice(0, 4);
  return (
    <>
      {/* Before: the records as they arrive, apart and turned, one not there yet. */}
      {recs.map((r, i) => {
        const [x, y, rot] = SCATTER[i];
        const w = Math.min(178, r.length * 5.4 + 44);
        const missing = i === 2;
        return (
          <g key={r} style={{ ...toneVars(sourceTone(r)), ...d(80 + i * 110) }} className="k-rise">
            <g transform={`rotate(${rot} ${x + w / 2} ${y + 15})`}>
              <rect x={x} y={y} width={w} height="30" rx="8" className={missing ? "k-missing" : "k-sheet"} />
              <Icon name={r} x={x + 9} y={y + 7} />
              <text x={x + 32} y={y + 19.5} className="k-name">{r}</text>
              {missing && <circle cx={x + w} cy={y} r="5" className="k-risk" />}
            </g>
          </g>
        );
      })}
      <path d="M190 120H222" className="k-line k-draw" pathLength={1} style={d(520)} />
      <path d="M216 114l7 6-7 6" className="k-line k-draw" pathLength={1} style={d(700)} />

      {/* After: one list, each record checked or still to confirm. */}
      <g className="k-rise" style={d(560)}>
        <rect x="230.5" y="12.5" width="168" height="214" rx="12" className="k-sheet" />
        <circle cx="248" cy="34" r="4" className="k-fill" />
        <text x="258" y="38">READY FOR REVIEW</text>
        <path d="M242 52H386" className="k-hair" />
      </g>
      {recs.map((r, i) => {
        const y = 64 + i * 40;
        const open = i === 2;
        return (
          <g key={r} style={d(720 + i * 120)}>
            <g style={toneVars(sourceTone(r))} className="k-pop">
              <rect x="242" y={y} width="24" height="24" rx="7" className="k-tile" />
              <Icon name={r} x={246} y={y + 4} s={0.66} />
            </g>
            <rect x="274" y={y + 5} width="78" height="5" rx="2.5" className="k-track" />
            <rect x="274" y={y + 5} width={[64, 52, 30, 70][i]} height="5" rx="2.5" className={open ? "k-risk-bar k-grow" : "k-bar k-grow"} style={d(780 + i * 120)} />
            <rect x="274" y={y + 15} width={[50, 40, 56, 36][i]} height="4" rx="2" className="k-track faint" />
            {open ? (
              <circle cx="374" cy={y + 12} r="8" className="k-risk k-pop" style={d(900 + i * 120)} />
            ) : (
              <g className="k-pop" style={d(900 + i * 120)}>
                <circle cx="374" cy={y + 12} r="8" className="k-fill" />
                <Tick x={374} y={y + 12} s={0.8} />
              </g>
            )}
          </g>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------ what an application would prepare */

function Prepare({ rows }: { rows: number }) {
  const n = Math.min(Math.max(rows, 2), 4);
  return (
    <>
      <rect x="44.5" y="20.5" width="300" height="200" rx="12" className="k-sheet k-rise" transform="rotate(-3 194 120)" style={d(60)} />
      <g className="k-rise" style={d(160)}>
        <rect x="56.5" y="12.5" width="300" height="210" rx="12" className="k-sheet" />
        <rect x="74" y="30" width="58" height="22" rx="11" className="k-soft" />
        <text x="103" y="45" textAnchor="middle" className="k-tone-ink">DRAFT</text>
        <rect x="144" y="38" width="120" height="6" rx="3" className="k-track faint" />
      </g>
      {Array.from({ length: n }, (_, i) => {
        const y = 68 + i * (112 / n);
        const open = i === 1;
        return (
          <g key={i} style={d(320 + i * 140)}>
            <g className="k-pop">
              <circle cx="86" cy={y + 10} r="10" className="k-ring" />
              <text x="86" y={y + 14} textAnchor="middle" className="k-val">{i + 1}</text>
            </g>
            <rect x="106" y={y + 3} width="140" height="6" rx="3" className="k-track" />
            <rect x="106" y={y + 3} width={[120, 96, 132, 88][i]} height="6" rx="3" className={open ? "k-risk-bar k-grow" : "k-bar k-grow"} style={d(380 + i * 140)} />
            <rect x="106" y={y + 14} width={[92, 110, 70, 100][i]} height="5" rx="2.5" className="k-track faint" />
            <g className="k-pop" style={d(520 + i * 140)}>
              {open ? (
                <>
                  <rect x="258" y={y} width="84" height="20" rx="10" className="k-missing" />
                  <text x="300" y={y + 14} textAnchor="middle" className="k-risk-ink">TO CONFIRM</text>
                </>
              ) : (
                <>
                  <rect x="258" y={y} width="84" height="20" rx="10" className="k-fill" />
                  <text x="300" y={y + 14} textAnchor="middle" className="k-on">READY</text>
                </>
              )}
            </g>
          </g>
        );
      })}
      <path d="M74 186H340" className="k-hair" />
      <g className="k-rise" style={d(320 + n * 140)}>
        <circle cx="84" cy="200" r="4.5" className="k-ink" />
        <path d="M76.5 213a7.5 7.5 0 0 1 15 0z" className="k-ink" />
        <text x="100" y="208">YOUR TEAM APPROVES</text>
        <rect x="262" y="194" width="80" height="22" rx="11" className="k-ink" />
        <Tick x={276} y={205} s={0.8} />
        <text x="310" y="209" textAnchor="middle" className="k-on">APPROVE</text>
      </g>
    </>
  );
}

/* ------------------------------------------------------------ start with the work your team does today */

function Start() {
  return (
    <>
      {/* A recent example: the document as it arrived, one line picked out. */}
      <g className="k-rise" style={d(80)} transform="rotate(-4 66 70)">
        <path d="M38.5 28.5h40l12 12v66h-52z" className="k-sheet" />
        <path d="M78.5 28.5v12h12" className="k-hair" />
        {[48, 58, 68, 78, 88].map((y, i) => (
          <rect key={y} x="46" y={y} width={[30, 36, 34, 26, 32][i]} height="4" rx="2" className={i === 2 ? "k-fill" : "k-track"} />
        ))}
      </g>
      <path d="M104 68H140" className="k-line k-draw" pathLength={1} style={d(300)} />
      <path d="M135 63l5 5-5 5" className="k-line k-draw" pathLength={1} style={d(420)} />

      {/* The software that handles it today. */}
      <g className="k-rise" style={d(360)}>
        <rect x="150.5" y="32.5" width="100" height="72" rx="8" className="k-sheet" />
        <path d="M150.5 46.5H250.5" className="k-hair" />
        {[158, 165, 172].map((x) => (
          <circle key={x} cx={x} cy="39.5" r="2" className="k-dot" />
        ))}
        {[56, 67, 78, 89].map((y, i) => (
          <g key={y}>
            <rect x="160" y={y} width="22" height="5" rx="2.5" className="k-track" />
            <rect x="188" y={y} width={[48, 38, 52, 30][i]} height="5" rx="2.5" className="k-track faint" />
          </g>
        ))}
      </g>
      <path d="M260 68H286" className="k-line k-draw" pathLength={1} style={d(600)} />
      <path d="M281 63l5 5-5 5" className="k-line k-draw" pathLength={1} style={d(720)} />

      {/* The same screen with what an application adds: the prepared work, checked. */}
      <g className="k-rise" style={d(660)}>
        <rect x="294.5" y="32.5" width="100" height="72" rx="8" className="k-sheet" />
        <path d="M294.5 46.5H394.5" className="k-hair" />
        {[302, 309, 316].map((x) => (
          <circle key={x} cx={x} cy="39.5" r="2" className="k-dot" />
        ))}
        <rect x="302" y="53" width="84" height="44" rx="6" className="k-soft" />
        {[60, 72, 84].map((y, i) => (
          <g key={y}>
            <circle cx="313" cy={y + 2.5} r="4.5" className="k-fill" />
            <Tick x={313} y={y + 2.5} s={0.5} />
            <rect x="322" y={y} width={[52, 40, 46][i]} height="5" rx="2.5" className="k-bar" />
          </g>
        ))}
      </g>
      <g className="k-pop" style={d(900)}>
        <circle cx="394" cy="32" r="10" className="k-fill" />
        <path d="M394 27v10M389 32h10" className="k-tick" pathLength={1} />
      </g>

      <text x="66" y="140" textAnchor="middle">RECENT EXAMPLE</text>
      <text x="200" y="140" textAnchor="middle">CURRENT SOFTWARE</text>
      <text x="344" y="140" textAnchor="middle">WHAT TO ADD</text>
    </>
  );
}

/* ------------------------------------------------------------ the illustrative example */

function Arrow({ x, ms }: { x: number; ms: number }) {
  return (
    <>
      <path d={`M${x} 64H${x + 22}`} className="k-line k-draw" pathLength={1} style={d(ms)} />
      <path d={`M${x + 17} 59l5 5-5 5`} className="k-line k-draw" pathLength={1} style={d(ms + 120)} />
    </>
  );
}

function Example({ records, labels }: { records: string[]; labels: string[] }) {
  const recs = records.slice(0, 3);
  return (
    <>
      {/* Input: the records the case starts from, each in its system's colour. */}
      {recs.map((r, i) => (
        <g key={r} style={{ ...toneVars(sourceTone(r)), ...d(80 + i * 100) }} className="k-pop">
          <rect x={30 + i * 6} y={22 + i * 30} width="32" height="26" rx="7" className="k-tile" />
          <Icon name={r} x={38 + i * 6} y={27 + i * 30} s={0.66} />
        </g>
      ))}
      <Arrow x={84} ms={380} />

      {/* Application: the agreed rules link each record to one case. */}
      <g className="k-rise" style={d(480)}>
        <rect x="114.5" y="26.5" width="76" height="76" rx="14" className="k-soft" />
        {[44, 64, 84].map((y, i) => (
          <g key={y}>
            <path d={`M134 ${y}C150 ${y} 154 64 170 64`} className="k-link" />
            <circle cx="134" cy={y} r="4" className="k-ring" style={d(560 + i * 80)} />
          </g>
        ))}
        <circle cx="170" cy="64" r="7" className="k-fill" />
      </g>
      <Arrow x={198} ms={760} />

      {/* Output: the prepared work, two lines checked and one question open. */}
      <g className="k-rise" style={d(860)}>
        <rect x="228.5" y="22.5" width="74" height="86" rx="10" className="k-sheet" />
        {[38, 60, 82].map((y, i) => (
          <g key={y}>
            {i === 1 ? (
              <circle cx="242" cy={y + 3} r="5" className="k-risk" />
            ) : (
              <>
                <circle cx="242" cy={y + 3} r="5.5" className="k-fill" />
                <Tick x={242} y={y + 3} s={0.55} />
              </>
            )}
            <rect x="253" y={y} width={[38, 30, 34][i]} height="5" rx="2.5" className={i === 1 ? "k-risk-bar" : "k-bar"} />
          </g>
        ))}
      </g>
      <Arrow x={310} ms={1000} />

      {/* Next step: the owner who confirms it. */}
      <g className="k-rise" style={d(1120)}>
        <circle cx="362" cy="52" r="10" className="k-ink" />
        <path d="M345 88a17 17 0 0 1 34 0z" className="k-ink" />
        <circle cx="376" cy="80" r="8" className="k-fill" />
        <Tick x={376} y={80} s={0.7} />
      </g>

      {labels.map((l, i) => (
        <text key={l} x={[50, 152, 266, 362][i]} y="140" textAnchor="middle">
          {l.toUpperCase()}
        </text>
      ))}
    </>
  );
}
