"use client";

import { APP_FACTS } from "@/lib/example";
import { ORDER_COUNTS } from "@/lib/demonstrations";
import { useSvgScale } from "../svgScale";

/**
 * The seven order-intake stations, each a small drawing of its own fact from the worked example.
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

const O = APP_FACTS.order;

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

/** 01 Customer order: the purchase order as received, its lines still unread. */
function Order() {
  return (
    <>
      <Floor />
      <Doc x={44} y={26} w={52} h={54} />
      <text x="0" y={LABEL} className="tg-al">{O.po}</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-key">{`${O.lines} LINES`}</text>
    </>
  );
}

/** 02 Item aliases: the customer's own code on the line, in place of the catalogue's. */
function Alias() {
  return (
    <>
      <Floor />
      <rect x="34" y="34" width="72" height="46" rx="4" className="tg-hollow" />
      <path d="M34 50H106M34 64H106" className="tg-line" pathLength={1} />
      <rect x="38" y="42" width="64" height="16" rx="3" className="tg-solid tg-mark" />
      <text x="70" y="54" textAnchor="middle" className="tg-on">OLD CODE</text>
      <text x="0" y={LABEL} className="tg-al">LINE 7</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-ink">20 BOXES</text>
    </>
  );
}

/** 03 Catalogue: lines matched through the approved mappings, one bar per matched group. */
function Catalogue() {
  return (
    <>
      <Floor />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={4 + i * 22.5} y={34} width="17" height="40" rx="3" className={i < 4 ? "tg-solid tg-bar" : "tg-hollow"} style={{ ["--i" as string]: i }} />
      ))}
      <text x="0" y={LABEL} className="tg-al">MATCHED</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-key">{`${ORDER_COUNTS.matched} OF ${ORDER_COUNTS.total}`}</text>
    </>
  );
}

/** 04 Pack units: the unit's place on the line, empty. */
function Units() {
  return (
    <>
      <Floor />
      <Doc x={44} y={26} w={52} h={54} dashed />
      <path d="M62 44l16 16m0-16-16 16" className="tg-line is-risk" pathLength={1} />
      <text x="0" y={LABEL} className="tg-al">BOX OR PIECE</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-risk">{`${ORDER_COUNTS.unit} LINES`}</text>
    </>
  );
}

/** 05 Open lines: the matched and the open side by side; nothing open is guessed. */
function Open() {
  return (
    <>
      <Floor />
      <rect x="4" y="44" width="52" height="24" rx="5" className="tg-solid tg-grow" />
      <text x="30" y="60" textAnchor="middle" className="tg-on">{ORDER_COUNTS.matched}</text>
      <rect x="84" y="44" width="52" height="24" rx="5" className="tg-risk-ring tg-grow" />
      <text x="110" y="60" textAnchor="middle" className="tg-risk">{ORDER_COUNTS.item + ORDER_COUNTS.unit}</text>
      <circle cx="70" cy="56" r="9" className="tg-risk-dot tg-mark" />
      <path d="M66 53.5h8m-8 5h8" className="tg-check tg-fade" />
      <text x="0" y={LABEL} className="tg-al">READY</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-al">OPEN</text>
    </>
  );
}

/** 06 Questions: items to confirm and units to clarify. */
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
      <text x={W} y={LABEL} textAnchor="end" className="tg-key">2</text>
    </>
  );
}

/** 07 Order desk: the draft waits on one person; the approval is theirs, so the mark stays open. */
function Desk() {
  return (
    <>
      <Floor />
      <circle cx="44" cy="40" r="11" className="tg-hollow" />
      <path d="M24 80c0-14 9-22 20-22s20 8 20 22" className="tg-line" pathLength={1} />
      <Doc x={82} y={34} w={36} h={46} />
      <circle cx="114" cy="36" r="8" className="tg-hollow tg-mark" />
      <text x="0" y={LABEL} className="tg-al">ORDER DESK</text>
      <text x={W} y={LABEL} textAnchor="end" className="tg-key">DRAFT</text>
    </>
  );
}

const ARTS = [Order, Alias, Catalogue, Units, Open, Questions, Desk];
