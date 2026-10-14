"use client";

import { useEffect, type CSSProperties, type RefObject } from "react";
import { useSvgScale } from "./svgScale";

/*
 * One drawing per business area, each the concrete thing its signal and example describe, on a shared
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

/** Line art for each business area, drawn in the area's colour on white. */
export function AreaArt({ area }: { area: string }) {
  const ref = useSvgScale<SVGSVGElement>(360, 150);
  useDrawOn(ref);
  return (
    <svg ref={ref} className="area-art" viewBox="0 0 360 150" aria-hidden>
      {area === "Supply Chain" && <SupplyChain />}
      {area === "Operations" && <Operations />}
      {area === "Commercial" && <Commercial />}
      {area === "Customer" && <Customer />}
      {area === "Finance & Risk" && <Finance />}
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
        {/* The same red dot as the signal row beside the drawing: Plant 01 is heading below safety stock. */}
        <circle cx="348" cy="68" r="5" className="aa-risk aa-rise" style={at(520)} />
      </g>
      {/* The transfer: 240 units, Plant 02 to Plant 01. It leaves the dock and parks at Plant 01's door. */}
      <g className="aa-truck">
        <g transform={`translate(200 ${GROUND})`}>
          <rect x="0" y="-32" width="44" height="25" rx="2" className="aa-solid" />
          <text x="22" y="-19.5" textAnchor="middle" dominantBaseline="central" className="aa-on-tone">240</text>
          <path d="M46 -7V-25h10l8 10v8z" className="aa-soft" />
          <path d="M49 -22h6l5.5 6.5H49z" className="aa-tint" />
          <circle cx="11" cy="-4.5" r="4.5" className="aa-wheel" />
          <circle cx="54" cy="-4.5" r="4.5" className="aa-wheel" />
        </g>
      </g>
      <text x="52" y={LABEL} textAnchor="middle" className="aa-rise" style={at(200)}>PLANT 02</text>
      <text x="308" y={LABEL} textAnchor="middle" className="aa-rise aa-sig" style={at(320)}>PLANT 01</text>
    </>
  );
}

/* ---- Operations: Motor M-041's drive-end bearing, vibration rising, repaired in Friday's window ---- */

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_X0 = 154;
const DAY_W = 38;
/** Vibration readings to today (Wednesday), rising; then the projection, still under the stoppage line at Friday. */
const TRACE = [100, 98, 99, 94, 92, 86, 80];
const NOW_X = DAY_X0 + 3 * DAY_W;
const NOW_Y = TRACE[TRACE.length - 1];

function Operations() {
  const trace = TRACE.map((y, i) => `${i ? "L" : "M"}${DAY_X0 + i * (DAY_W / 2)} ${y}`).join(" ");
  return (
    <>
      <Ground />
      <g className="aa-rise" style={at(0)}>
        <rect x="22" y="104" width="92" height="8" rx="2" className="aa-soft" />
        <rect x="50" y="46" width="24" height="12" rx="2" className="aa-soft" />
        <rect x="28" y="56" width="74" height="48" rx="8" className="aa-soft" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} d={`M${38 + i * 9} 61V99`} className="aa-fin" />
        ))}
        <rect x="102" y="64" width="10" height="32" rx="3" className="aa-soft" />
        <rect x="112" y="76" width="22" height="8" rx="2" className="aa-shaft" />
      </g>
      <g className="aa-sig">
        {/* The drive-end bearing the readings come from. */}
        <circle cx="107" cy="80" r="5.5" className="aa-bearing aa-rise" style={at(240)} />
        <path d={`M${DAY_X0} 34H${DAY_X0 + 4 * DAY_W + 2}`} className="aa-limit aa-rise" style={at(300)} />
        <path d={trace} className="aa-line aa-draw" pathLength={1} style={at(360)} />
        {/* The projection runs on until Friday's window, which interrupts it. */}
        <path d={`M${NOW_X} ${NOW_Y}L${DAY_X0 + 4 * DAY_W} 66`} className="aa-proj aa-rise" style={at(980)} />
        <circle cx={NOW_X} cy={NOW_Y} r="4" className="aa-dot aa-live aa-rise" style={at(940)} />
      </g>
      {/* Friday's planned window: the repair lands before the projection reaches the stoppage line. */}
      <rect x={DAY_X0 + 4 * DAY_W + 2} y="26" width={DAY_W - 4} height={GROUND - 26} rx="4" className="aa-window aa-grow" style={at(700)} />
      {DAYS.map((d, i) => (
        <path key={d} d={`M${DAY_X0 + i * DAY_W} ${GROUND}v4`} className="aa-tick" />
      ))}
      <path d={`M${DAY_X0 + 5 * DAY_W} ${GROUND}v4`} className="aa-tick" />
      <text x="68" y={LABEL} textAnchor="middle" className="aa-rise" style={at(160)}>M-041</text>
      {DAYS.map((d, i) => (
        <text
          key={d}
          x={DAY_X0 + i * DAY_W + DAY_W / 2}
          y={LABEL}
          textAnchor="middle"
          className={`aa-rise${i === 4 ? " aa-tone-ink" : ""}`}
          style={at(200, i)}
        >
          {d}
        </text>
      ))}
    </>
  );
}

/* ---- Commercial: 12% of allocation moves to West, where validated orders exceed allocated stock ---- */

const REGIONS = [
  { name: "NORTH", alloc: 72, orders: 44 },
  { name: "SOUTH", alloc: 52, orders: 48 },
  { name: "EAST", alloc: 58, orders: 52 },
  { name: "WEST", alloc: 46, orders: 74 },
];
/** 12% of the four regions' allocation (228), in chart units. */
const MOVE = 27;
const REGION_X = (i: number) => 54 + i * 84;
const BAR_W = 40;

function Commercial() {
  const north = REGION_X(0), west = REGION_X(3);
  const northTop = GROUND - REGIONS[0].alloc;
  const westTop = GROUND - REGIONS[3].alloc - MOVE;
  return (
    <>
      <Ground />
      {REGIONS.map((r, i) => {
        const cx = REGION_X(i);
        const kept = r.alloc - (i === 0 ? MOVE : 0);
        return (
          <g key={r.name} className={i === 3 ? "aa-sig" : undefined}>
            <rect x={cx - BAR_W / 2} y={GROUND - kept} width={BAR_W} height={kept} className="aa-tint aa-grow" style={at(0, i)} />
            {/* Validated orders: the level each region's allocation should reach. */}
            <path d={`M${cx - 26} ${GROUND - r.orders}H${cx + 26}`} className="aa-orders aa-rise" style={at(420, i)} />
            <text x={cx} y={LABEL} textAnchor="middle" className={`aa-rise${i === 3 ? " aa-strong" : ""}`} style={at(160, i)}>
              {r.name}
            </text>
          </g>
        );
      })}
      {/* The allocation North gives up, then the same block landing on West. */}
      <rect x={north - BAR_W / 2 + 0.75} y={northTop + 0.75} width={BAR_W - 1.5} height={MOVE - 1.5} className="aa-ghost aa-rise" style={at(700)} />
      <path d={`M${north} ${northTop - 6}C${north} 8 ${west} 8 ${west} ${westTop - 7}`} className="aa-line aa-draw" pathLength={1} style={at(760)} />
      <path d={`M${west - 5} ${westTop - 12}l5 6 5-6`} className="aa-line aa-rise" style={at(1300)} />
      <g className="aa-sig">
        <rect x={west - BAR_W / 2} y={westTop} width={BAR_W} height={MOVE} className="aa-solid aa-chunk aa-grow" style={at(1300)} />
      </g>
      <g className="aa-rise" style={at(1060)}>
        <rect x="160" y="2" width="40" height="20" rx="10" className="aa-tag" />
        <text x="180" y="12" textAnchor="middle" dominantBaseline="central" className="aa-on-tag">12%</text>
      </g>
    </>
  );
}

/* ---- Customer: fourteen service cases share Bearing X90; one escalation goes to Quality ---- */

const CASES = Array.from({ length: 14 }, (_, i) => ({ x: 16 + (i % 7) * 26, y: i < 7 ? 44 : 80 }));
const HUB = { x: 252, y: 73 };

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
        <text x="16" y={LABEL} className="aa-rise" style={at(160)}>14 CASES</text>
        <text x={HUB.x} y={LABEL} textAnchor="middle" className="aa-rise" style={at(900)}>X90</text>
      </g>
      <path d={`M${HUB.x + 21} ${HUB.y}H${300}`} className="aa-line aa-draw" pathLength={1} style={at(1060)} />
      <g className="aa-rise" style={at(1280)}>
        <circle cx="318" cy={HUB.y} r="18" className="aa-solid" />
        <path d={`M310 ${HUB.y}l5.5 5.5 10-11`} className="aa-check" />
      </g>
      <text x="318" y={LABEL} textAnchor="middle" className="aa-rise aa-strong" style={at(1340)}>QUALITY</text>
    </>
  );
}

/* ---- Finance & Risk: three-way match; three invoices without a goods receipt stay on hold ---- */

const COLS = [56, 146, 236];
const STATUS_X = 326;
/** Five invoices; rows 1, 3 and 4 arrived without a goods receipt. */
const HAS_RECEIPT = [true, false, true, false, false];

function Doc({ x, y, missing }: { x: number; y: number; missing?: boolean }) {
  return (
    <g transform={`translate(${x - 7} ${y - 9})`}>
      <path d="M0 0h9l5 5v13H0z" className={missing ? "aa-doc-missing" : "aa-doc"} />
      {!missing && <path d="M9 0v5h5" className="aa-doc-fold" />}
    </g>
  );
}

function Finance() {
  return (
    <>
      {[33, 55, 77, 99].map((y) => (
        <path key={y} d={`M32 ${y}H344`} className="aa-rule" />
      ))}
      {HAS_RECEIPT.map((ok, i) => {
        const y = 22 + i * 22;
        return (
          <g key={i} className={ok ? undefined : "aa-sig"}>
            <g className="aa-rise" style={at(0, i)}>
              <Doc x={COLS[0]} y={y} />
              <Doc x={COLS[1]} y={y} missing={!ok} />
              <Doc x={COLS[2]} y={y} />
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
              {ok ? (
                <path d={`M${STATUS_X - 6} ${y}l4 4 8-8`} className="aa-check aa-check--tone" />
              ) : (
                <>
                  <rect x={STATUS_X - 5.5} y={y - 6.5} width="4" height="13" rx="1" className="aa-hold" />
                  <rect x={STATUS_X + 1.5} y={y - 6.5} width="4" height="13" rx="1" className="aa-hold" />
                </>
              )}
            </g>
          </g>
        );
      })}
      {["PO", "RECEIPT", "INVOICE"].map((n, i) => (
        <text key={n} x={COLS[i]} y={LABEL} textAnchor="middle" className="aa-rise" style={at(160, i)}>
          {n}
        </text>
      ))}
      <text x={STATUS_X} y={LABEL} textAnchor="middle" className="aa-rise aa-sig aa-risk-ink" style={at(1100)}>3 HELD</text>
    </>
  );
}
