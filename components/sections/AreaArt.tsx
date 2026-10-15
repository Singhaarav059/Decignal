"use client";

import { useEffect, type CSSProperties, type RefObject } from "react";
import { useSvgScale } from "./svgScale";

/*
 * One drawing per business function, each the concrete thing its example describes, on a shared
 * 360 x 150 grid: objects stand on the ground line at y 112, labels sit on one baseline at y 136.
 * Strokes: 1.5 for outlines, 2 for data and routes, 1 for hairlines. Radii: 2 small, 3 to 4 medium.
 * The area's colour (--tone) draws the subject; ink and hairlines stay neutral; signal red marks risk.
 *
 * Motion (app/styles/decor-art.css): the drawing builds once it is in view (data-on), in the order
 * the story runs, and settles. At most one slow idle motion per drawing. Reduced motion: drawn, still.
 * Elements tied to the area's signal carry .aa-sig, so hovering the signal row can single them out.
 */

const GROUND = 112;
const LABEL = 136;

/** Where an element enters the build: --t is its start in ms, --i its place in a stagger. */
const at = (t: number, i = 0) => ({ ["--t" as string]: t, ["--i" as string]: i }) as CSSProperties;

/**
 * Sets data-on on the drawing once it is on screen, so its CSS build plays. A drawing that is hidden
 * (a closed nav glance, an inactive tab) resets, so it builds again when it next shows.
 */
export function useDrawOn(ref: RefObject<SVGSVGElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.on = "";
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) el.dataset.on = "";
        else if (e.boundingClientRect.width === 0) delete el.dataset.on;
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/**
 * Far off screen (more than half a screen away), the drawing's idle loop holds still (data-far,
 * decor-art.css): the browser otherwise re-styled it every frame for the life of the page, long after
 * a service page's hero had scrolled away. It resumes where it stopped, out of sight.
 */
function useFarHold(ref: RefObject<SVGSVGElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-far", !e.isIntersecting), { rootMargin: "50% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/** Line art for each business function, drawn in the function's colour on white. */
export function AreaArt({ area }: { area: string }) {
  const ref = useSvgScale<SVGSVGElement>(360, 150);
  useDrawOn(ref);
  useFarHold(ref);
  return (
    <svg ref={ref} className="area-art" viewBox="0 0 360 150" aria-hidden>
      {area === "Supplier coordination" && <SupplyChain />}
      {area === "Dispatch documentation" && <Ledger {...DISPATCH} />}
      {area === "RFQ review" && <Commercial />}
      {area === "Service follow-up" && <Customer />}
      {area === "Deduction review" && <Ledger {...DEDUCTION} />}
    </svg>
  );
}

function Ground({ from = 8, to = 352 }: { from?: number; to?: number }) {
  return <path d={`M${from} ${GROUND}H${to}`} className="aa-ground aa-draw" pathLength={1} style={at(0)} />;
}

/* ---- Supply Chain: Plant 02 sends 240 units to Plant 01, which is heading below safety stock ---- */

/** A plant in elevation: saw-tooth roof, chimney, windows, and a roller door on the road side (right). */
function Plant() {
  return (
    <>
      <rect x="6" y="-66" width="8" height="24" rx="1" className="aa-soft" />
      <path d="M0 0V-44l20-12v12l20-12v12l20-12v12l20-12V0z" className="aa-soft" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={8 + i * 14} y="-34" width="8" height="10" rx="1" className="aa-tint" />
      ))}
      <rect x="50" y="-26" width="22" height="26" rx="1" className="aa-solid" />
      <path d="M50 -18h22M50 -10h22" className="aa-slat" />
    </>
  );
}

function SupplyChain() {
  return (
    <>
      <Ground />
      <g className="aa-rise" style={at(0)}>
        <g transform={`translate(12 ${GROUND})`}>
          <Plant />
        </g>
      </g>
      <g className="aa-sig">
        <g className="aa-rise" style={at(120)}>
          <g transform={`translate(348 ${GROUND}) scale(-1 1)`}>
            <Plant />
          </g>
        </g>
        {/* The same red dot as the example row beside the drawing: 40 returned pieces are still unexplained. */}
        <circle cx="348" cy="68" r="5" className="aa-risk aa-rise" style={at(520)} />
      </g>
      {/* The return: 940 pieces back from the job worker. It leaves their dock and parks at your plant's door. */}
      <g className="aa-truck">
        <g transform={`translate(200 ${GROUND})`}>
          <rect x="0" y="-32" width="44" height="25" rx="2" className="aa-solid" />
          <text x="22" y="-19.5" textAnchor="middle" dominantBaseline="central" className="aa-on-tone">940</text>
          <path d="M46 -7V-25h10l8 10v8z" className="aa-soft" />
          <path d="M49 -22h6l5.5 6.5H49z" className="aa-tint" />
          <circle cx="11" cy="-4.5" r="4.5" className="aa-wheel" />
          <circle cx="54" cy="-4.5" r="4.5" className="aa-wheel" />
        </g>
      </g>
      <text x="52" y={LABEL} textAnchor="middle" className="aa-rise" style={at(200)}>JOB WORKER</text>
      <text x="308" y={LABEL} textAnchor="middle" className="aa-rise aa-sig" style={at(320)}>YOUR PLANT</text>
    </>
  );
}

/* ---- RFQ review: the customer's requirement against the supplier's offer, one difference flagged ---- */

const SPECS = [
  { name: "MATERIAL", need: 74, offer: 52, ok: false },
  { name: "SIZE", need: 58, offer: 58, ok: true },
  { name: "PRESSURE", need: 66, offer: 66, ok: true },
  { name: "ENDS", need: 46, offer: 46, ok: true },
];
const SPEC_X = (i: number) => 54 + i * 84;
const BAR_W = 40;

function Commercial() {
  return (
    <>
      <Ground />
      {SPECS.map((r, i) => {
        const cx = SPEC_X(i);
        return (
          <g key={r.name} className={r.ok ? undefined : "aa-sig"}>
            {/* The offer as the bar, the requirement as the line it should reach. */}
            <rect x={cx - BAR_W / 2} y={GROUND - r.offer} width={BAR_W} height={r.offer} className={r.ok ? "aa-tint aa-grow" : "aa-ghost aa-grow"} style={at(0, i)} />
            <path d={`M${cx - 26} ${GROUND - r.need}H${cx + 26}`} className="aa-orders aa-rise" style={at(420, i)} />
            {r.ok ? (
              <path d={`M${cx - 6} ${GROUND - r.offer - 14}l4 4 8-8`} className="aa-check aa-check--tone aa-rise" style={at(760, i)} />
            ) : (
              <circle cx={cx} cy={GROUND - r.need - 14} r="5" className="aa-risk aa-rise" style={at(820)} />
            )}
            <text x={cx} y={LABEL} textAnchor="middle" className={`aa-rise${r.ok ? "" : " aa-strong"}`} style={at(160, i)}>
              {r.name}
            </text>
          </g>
        );
      })}
      <g className="aa-rise" style={at(1060)}>
        <rect x="96" y="2" width="92" height="20" rx="10" className="aa-tag" />
        <text x="142" y="12" textAnchor="middle" dominantBaseline="central" className="aa-on-tag">SS316 ≠ SS304</text>
      </g>
    </>
  );
}

/* ---- Service follow-up: service reports on one pump; the seal recommendation goes to its owner ---- */

const CASES = Array.from({ length: 8 }, (_, i) => ({ x: 16 + (i % 4) * 30, y: i < 4 ? 44 : 80 }));
const HUB = { x: 252, y: 73 };

/** The mechanical seal the report recommends: a ring with its springs. */
function Bearing({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="20" className="aa-ring" />
      <circle r="8" className="aa-ring" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <circle key={i} cx={(14 * Math.cos(a)).toFixed(2)} cy={(14 * Math.sin(a)).toFixed(2)} r="3.2" className="aa-solid" />;
      })}
    </g>
  );
}

function Customer() {
  return (
    <>
      <g className="aa-sig">
        {CASES.map((c, i) => (
          <path
            key={`l${i}`}
            d={`M${c.x + 18} ${c.y + 11}C${c.x + 64} ${c.y + 11} 206 ${HUB.y} ${HUB.x - 21} ${HUB.y}`}
            className="aa-link aa-draw"
            pathLength={1}
            style={at(380, i)}
          />
        ))}
        {CASES.map((c, i) => (
          <rect key={`c${i}`} x={c.x} y={c.y} width="18" height="22" rx="3" className="aa-case aa-rise" style={at(0, i)} />
        ))}
        <g className="aa-rise" style={at(820)}>
          <Bearing x={HUB.x} y={HUB.y} />
        </g>
        <text x="16" y={LABEL} className="aa-rise" style={at(160)}>REPORTS</text>
        <text x={HUB.x} y={LABEL} textAnchor="middle" className="aa-rise" style={at(900)}>SEAL</text>
      </g>
      <path d={`M${HUB.x + 21} ${HUB.y}H${300}`} className="aa-line aa-draw" pathLength={1} style={at(1060)} />
      <g className="aa-rise" style={at(1280)}>
        <circle cx="318" cy={HUB.y} r="18" className="aa-solid" />
        <path d={`M310 ${HUB.y}l5.5 5.5 10-11`} className="aa-check" />
      </g>
      <text x="318" y={LABEL} textAnchor="middle" className="aa-rise aa-strong" style={at(1340)}>OWNER</text>
    </>
  );
}

/* ---- Ledgers: one row per record, three linked documents, the open ones flagged ---- */

const COLS = [56, 146, 236];
const STATUS_X = 326;

type LedgerSpec = { cols: [string, string, string]; rows: boolean[]; open: string };

/** Dispatch documentation: delivery lines against their certificates; line 12's does not match. */
const DISPATCH: LedgerSpec = { cols: ["LINE", "CERTIFICATE", "PROCESS"], rows: [true, true, false, true, true], open: "2 OPEN" };
/** Deduction review: deductions against their invoices and delivery evidence; one note is unclear. */
const DEDUCTION: LedgerSpec = { cols: ["DEBIT NOTE", "INVOICE", "DELIVERY"], rows: [true, true, true, false, true], open: "1 TO REVIEW" };

function Doc({ x, y, missing }: { x: number; y: number; missing?: boolean }) {
  return (
    <g transform={`translate(${x - 7} ${y - 9})`}>
      <path d="M0 0h9l5 5v13H0z" className={missing ? "aa-doc-missing" : "aa-doc"} />
      {!missing && <path d="M9 0v5h5" className="aa-doc-fold" />}
    </g>
  );
}

function Ledger({ cols, rows, open }: LedgerSpec) {
  return (
    <>
      {[33, 55, 77, 99].map((y) => (
        <path key={y} d={`M32 ${y}H344`} className="aa-rule" />
      ))}
      {rows.map((ok, i) => {
        const y = 22 + i * 22;
        return (
          <g key={i} className={ok ? undefined : "aa-sig"}>
            <g className="aa-rise" style={at(0, i)}>
              <Doc x={COLS[0]} y={y} />
              <Doc x={COLS[1]} y={y} />
              <Doc x={COLS[2]} y={y} missing={!ok} />
            </g>
            {ok ? (
              <>
                <path d={`M${COLS[0] + 10} ${y}H${COLS[1] - 10}`} className="aa-match aa-draw" pathLength={1} style={at(440, i)} />
                <path d={`M${COLS[1] + 10} ${y}H${COLS[2] - 10}`} className="aa-match aa-draw" pathLength={1} style={at(640, i)} />
              </>
            ) : (
              <path d={`M${COLS[0] + 10} ${y}H${COLS[2] - 10}`} className="aa-nomatch aa-rise" style={at(440, i)} />
            )}
            <g className="aa-rise" style={at(900, i)}>
              {ok ? <path d={`M${STATUS_X - 6} ${y}l4 4 8-8`} className="aa-check aa-check--tone" /> : <circle cx={STATUS_X} cy={y} r="5" className="aa-risk" />}
            </g>
          </g>
        );
      })}
      {cols.map((n, i) => (
        <text key={n} x={COLS[i]} y={LABEL} textAnchor="middle" className="aa-rise" style={at(160, i)}>
          {n}
        </text>
      ))}
      <text x={STATUS_X} y={LABEL} textAnchor="middle" className="aa-rise aa-sig aa-risk-ink" style={at(1100)}>{open}</text>
    </>
  );
}
