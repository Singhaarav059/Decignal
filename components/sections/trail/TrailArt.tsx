"use client";

import { EXAMPLE } from "@/lib/example";
import { useSvgScale } from "../svgScale";

/**
 * The seven review stations, each a small drawing of its own fact from the worked dispatch example.
 * They share one 140 x 104 frame so the row reads as one instrument: the floor at y 80, content tops
 * near y 22, labels on the floor row at y 98, one stroke weight per role (data 2, outlines 1.25,
 * axes 1). The step's --tone colours the record; a conflict or a missing document is always signal red.
 *
 * Every part draws from the station's --q (0 to 1, written by TrailDial.tsx as the hand reaches it):
 * the frame first (--a), then the record (--b), then marks and figures (--c). See decor-trail.css.
 */

const W = 140;
const H = 104;
const FLOOR = 80;
const LABEL = 98;

const L = EXAMPLE.line;
const C = EXAMPLE.cert;
const ITEMS = EXAMPLE.checklist.items;

/**
 * The empty band above each drawing's content, in drawing units. The row keeps the shared frame so
 * every floor lines up; phones, where each drawing stands alone under its text, trim it away.
 */
const HEADROOM = [14, 18, 10, 10, 26, 18, 14];

export function TrailArt({ index }: { index: number }) {
  const ref = useSvgScale<SVGSVGElement>(W, H);
  const Art = ARTS[index];
  return (
    <svg ref={ref} className="tr-art" viewBox={`0 0 ${W} ${H}`} style={{ ["--headroom" as string]: HEADROOM[index] }} aria-hidden>
      <Art />
    </svg>
  );
}

function Floor() {
  return <path d={`M0 ${FLOOR}H${W}`} className="tg-floor" pathLength={1} />;
}

/** A document: a page with a folded corner, its lines drawn in. */
function Doc({ x, y, w = 34, h = 44, dashed = false, risk = false }: { x: number; y: number; w?: number; h?: number; dashed?: boolean; risk?: boolean }) {
  const fold = 9;
  const d = `M${x} ${y}H${x + w - fold}L${x + w} ${y + fold}V${y + h}H${x}Z`;
  return (
    <g>
      <path d={d} className={dashed ? "tg-ref" : risk ? "tg-risk-ring" : "tg-hollow"} />
      {!dashed && [12, 19, 26].map((dy, i) => <path key={dy} d={`M${x + 6} ${y + dy}H${x + w - (i === 2 ? 14 : 7)}`} className={risk ? "tg-line is-risk" : "tg-line"} pathLength={1} />)}
    </g>
  );
}

/** 01 Checklist: six required documents in a row, four already supported, two still open. */
function Checklist() {
  return (
    <>
      <Floor />
      {ITEMS.map((it, i) => {
        const x = 4 + i * 22.5;
        const ok = it.status === "supported";
        return (
          <g key={it.name}>
            <rect x={x} y={34} width="17" height="40" rx="3" className={ok ? "tg-solid tg-bar" : "tg-hollow"} style={{ ["--i" as string]: i }} />
            {!ok && <circle cx={x + 8.5} cy={54} r="3.5" className="tg-risk-dot tg-mark" />}
          </g>
        );
      })}
      <text x="0" y={LABEL} className="tg-al">{EXAMPLE.checklist.rev.toUpperCase()}</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-key">{`${ITEMS.length} DOCS`}</text>
    </>
  );
}

/** 02 Delivery line: the crate on line 12, stencilled with the heat on record. */
function Line() {
  return (
    <>
      <Floor />
      <rect x="34" y="34" width="72" height="46" rx="4" className="tg-hollow" />
      <path d="M34 50H106M34 64H106" className="tg-line" pathLength={1} />
      <rect x="48" y="42" width="44" height="16" rx="3" className="tg-solid tg-mark" />
      <text x="70" y="54" textAnchor="middle" className="tg-on">{L.heat}</text>
      <text x="0" y={LABEL} className="tg-al">{`LINE ${L.n}`}</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-ink">{`${L.pieces} PCS`}</text>
    </>
  );
}

/** 03 Certificate: the supplied material certificate, carrying the other heat number. */
function Certificate() {
  return (
    <>
      <Floor />
      <Doc x={44} y={26} w={52} h={54} />
      <rect x="52" y="60" width="36" height="13" rx="3" className="tg-risk-ring tg-mark" />
      <text x="70" y="70" textAnchor="middle" className="tg-risk">{C.heat}</text>
      <text x="0" y={LABEL} className="tg-al">CERTIFICATE</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-key">{C.source.toUpperCase()}</text>
    </>
  );
}

/** 04 Process: the heat-treatment certificate's place in the pack, empty. */
function Process() {
  return (
    <>
      <Floor />
      <Doc x={44} y={26} w={52} h={54} dashed />
      <path d="M62 44l16 16m0-16-16 16" className="tg-line is-risk" pathLength={1} />
      <text x="0" y={LABEL} className="tg-al">HEAT TREATMENT</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-risk">NOT FOUND</text>
    </>
  );
}

/** 05 Conflict: both references side by side, neither corrected. */
function Conflict() {
  return (
    <>
      <Floor />
      <rect x="4" y="44" width="52" height="24" rx="5" className="tg-solid tg-grow" />
      <text x="30" y="60" textAnchor="middle" className="tg-on">{L.heat}</text>
      <rect x="84" y="44" width="52" height="24" rx="5" className="tg-risk-ring tg-grow" />
      <text x="110" y="60" textAnchor="middle" className="tg-risk">{C.heat}</text>
      <circle cx="70" cy="56" r="9" className="tg-risk-dot tg-mark" />
      <path d="M66 53.5h8m-8 5h8" className="tg-check tg-fade" />
      <text x="0" y={LABEL} className="tg-al">DELIVERY</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-al">CERTIFICATE</text>
    </>
  );
}

/** 06 Questions: the two questions the review drafts for the reviewer. */
function Questions() {
  return (
    <>
      <Floor />
      {[0, 1].map((i) => (
        <g key={i}>
          <path
            d={`M${8 + i * 20} ${32 + i * 22}h${92 - i * 4}a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6H${22 + i * 20}l-8 6v-6h-0a6 6 0 0 1-6-6v-8a6 6 0 0 1 6-6Z`}
            className="tg-hollow"
          />
          <path d={`M${18 + i * 20} ${42 + i * 22}H${86 + i * 10}`} className="tg-line" pathLength={1} />
          <circle cx={112 + i * 8} cy={42 + i * 22} r="5" className="tg-solid tg-mark" />
        </g>
      ))}
      <text x="0" y={LABEL} className="tg-al">QUESTIONS</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-key">{`${EXAMPLE.questions.length}`}</text>
    </>
  );
}

/** 07 Reviewer: the pack waits on one person; the decision is theirs, so the mark stays open. */
function Reviewer() {
  return (
    <>
      <Floor />
      <circle cx="44" cy="40" r="11" className="tg-hollow" />
      <path d="M24 80c0-14 9-22 20-22s20 8 20 22" className="tg-line" pathLength={1} />
      <Doc x={82} y={34} w={36} h={46} />
      <circle cx="114" cy="36" r="8" className="tg-hollow tg-mark" />
      <text x="0" y={LABEL} className="tg-al">QUALITY</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-key">DRAFT</text>
    </>
  );
}

const ARTS = [Checklist, Line, Certificate, Process, Conflict, Questions, Reviewer];
