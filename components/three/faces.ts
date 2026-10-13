// Card faces drawn as real product UI on a canvas, then used as textures.
// Laid out on a 1600 x 1000 grid and drawn at any scale. The cards are a few hundred pixels wide on
// screen, so the type is set large and sparse: the smallest text is 40 units, nothing is decoration-
// sized, and detail lives in the page's own readouts beside the cards.
import { FUNCTIONS, INDUSTRIES, LAYERS } from "@/lib/story";
import { CONTROL, FACES } from "@/lib/copy";
import { EXAMPLE, inrShort } from "@/lib/example";
import { COLORS, TINTS } from "./palette";

/** The reader's choice on the page's approval panel, which the decision face follows. */
export type DecisionMode = "idle" | "approved" | "rejected";

export type FaceSpec =
  | { kind: "decision"; qty?: number; mode?: DecisionMode }
  /** `fan`: the card is read fanned out, with only its left part in view, so all its text sits there. */
  | { kind: "layer"; k: number; fan?: boolean }
  | { kind: "function"; k: number }
  | { kind: "industry"; k: number }
  | { kind: "final" };

export const FACE_W = 1600;
export const FACE_H = 1000;

// Cool neutrals, matching the page tokens (ink, ink-soft, line, sunken).
const INK = COLORS.ink;
const SOFT = "#555D6B";
const LINE = "#E3E6EB";
const BG2 = "#EDEFF3";
export const LAYER_TONE = [COLORS.signal, TINTS.violet, TINTS.saffron, TINTS.cobalt, TINTS.emerald];
export const FUNCTION_TONE = [TINTS.cobalt, TINTS.emerald, TINTS.tangerine, TINTS.pink, TINTS.violet];
const INDUSTRY_TONE = [TINTS.emerald, TINTS.cobalt, TINTS.pink, TINTS.tangerine, TINTS.violet, TINTS.saffron];

/** A system colour as text: its darker ink (the page's --color-*-ink tokens). Saffron text is ink. */
const TEXT_INK: Record<string, string> = {
  [COLORS.signal]: "#C2331B",
  [TINTS.cobalt]: "#2A52F0",
  [TINTS.violet]: "#5B3BE6",
  [TINTS.emerald]: "#087A54",
  [TINTS.saffron]: INK,
  [TINTS.tangerine]: "#C7440F",
  [TINTS.pink]: "#C42B70",
};
const ink = (tone: string) => TEXT_INK[tone] ?? INK;
/** Text on a solid tone fill: white only where it holds contrast (cobalt, violet, signal), else ink. */
const onTone = (tone: string) => ([TINTS.cobalt, TINTS.violet, COLORS.signal] as string[]).includes(tone) ? "#fff" : INK;

let fonts = { sans: "Figtree, Helvetica, Arial, sans-serif", display: "Helvetica, Arial, sans-serif", mono: "ui-monospace, Menlo, monospace" };
export function readFonts() {
  const root = getComputedStyle(document.documentElement);
  const sans = getComputedStyle(document.body).fontFamily;
  const display = root.getPropertyValue("--font-display").trim();
  const mono = root.getPropertyValue("--font-label").trim();
  fonts = {
    sans: sans || fonts.sans,
    display: display ? `${display}, ${fonts.display}` : sans || fonts.sans,
    mono: mono ? `${mono}, ui-monospace, monospace` : fonts.mono,
  };
}

type C = CanvasRenderingContext2D;

/** Headline weights set in the display face, like the page; labels in the label face. */
const font = (c: C, size: number, weight = 600, mono = false) => {
  c.font = `${weight} ${size}px ${mono ? fonts.mono : weight >= 650 ? fonts.display : fonts.sans}`;
};

function rr(c: C, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

const dot = (c: C, x: number, y: number, r: number, color: string) => {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
};

function label(c: C, text: string, x: number, y: number, color = SOFT) {
  font(c, 46, 600, true);
  c.fillStyle = color;
  c.letterSpacing = "4px";
  c.fillText(text.toUpperCase(), x, y);
  c.letterSpacing = "0px";
}

/** Status pill, right-aligned: a tone dot and the status in the tone's ink, on the sunken grey. */
function pill(c: C, text: string, xRight: number, y: number, tone: string) {
  font(c, 42, 600);
  const w = c.measureText(text).width + 104;
  const x = xRight - w;
  rr(c, x, y - 58, w, 84, 42);
  c.fillStyle = BG2;
  c.fill();
  dot(c, x + 42, y - 16, 11, tone);
  c.fillStyle = ink(tone);
  c.fillText(text, x + 68, y);
}

/** Name chip, left-aligned: a tone dot and the name in ink, on the sunken grey. */
function chip(c: C, text: string, x: number, y: number, tone: string) {
  font(c, 46, 650);
  const w = c.measureText(text).width + 112;
  rr(c, x, y - 60, w, 88, 44);
  c.fillStyle = BG2;
  c.fill();
  dot(c, x + 44, y - 16, 12, tone);
  c.fillStyle = INK;
  c.fillText(text, x + 72, y);
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Wraps text into lines that fit maxW; returns the y after the last line. */
function wrap(c: C, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (c.measureText(test).width > maxW && line) {
      c.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  c.fillText(line, x, y);
  return y;
}

function title(c: C, text: string, y: number, size = 112, color = INK, maxW = FACE_W - 180) {
  font(c, size, 650);
  c.fillStyle = color;
  c.letterSpacing = `${-size * 0.03}px`;
  const end = wrap(c, text, 90, y, maxW, size * 1.06);
  c.letterSpacing = "0px";
  return end;
}

function check(c: C, x: number, y: number, color: string) {
  c.strokeStyle = color;
  c.lineWidth = 8;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(x - 14, y + 1);
  c.lineTo(x - 4, y + 11);
  c.lineTo(x + 15, y - 10);
  c.stroke();
}

/** A status pill, right-aligned. Outline: the tone as a hairline and its ink; solid: the tone as the
 *  fill, with white or ink text (onTone). A state on the card, never a control. */
function status(c: C, text: string, xRight: number, y: number, tone: string, solid: boolean) {
  font(c, 44, 650);
  const w = c.measureText(text).width + (solid ? 88 : 108);
  const x = xRight - w;
  rr(c, x, y - 60, w, 88, 44);
  if (solid) {
    c.fillStyle = tone;
    c.fill();
  } else {
    c.strokeStyle = tone;
    c.lineWidth = 5;
    c.stroke();
    dot(c, x + 42, y - 16, 11, tone);
  }
  c.fillStyle = solid ? onTone(tone) : ink(tone);
  c.fillText(text, x + (solid ? 44 : 66), y);
}

/* ------------------------------------------------------------------ */

const T = EXAMPLE.transfer;

/** The decision: what it is, what it costs, and where it stands. The page's panel holds the real
 *  Approve, Adjust and Reject; the card only shows the state they leave it in. */
function decision(c: C, qty: number = T.units, mode: DecisionMode = "idle") {
  label(c, "Recommended action", 90, 138);
  if (mode === "approved") status(c, `Approved · ${qty} units`, FACE_W - 90, 140, TINTS.emerald, true);
  else if (mode === "rejected") status(c, "Rejected", FACE_W - 90, 140, COLORS.signal, true);
  else status(c, "Ready for approval", FACE_W - 90, 140, TINTS.emerald, false);
  title(c, CONTROL.title(qty), 330, 140, mode === "rejected" ? SOFT : INK);
  font(c, 62, 500);
  c.fillStyle = SOFT;
  c.fillText(`from ${EXAMPLE.plant02.name} to ${EXAMPLE.plant01.name}`, 90, 428);

  const stats = [
    ["Units", `${qty}`],
    ["Arrives", `${T.arrivesDay} days`],
    ["Cost", inrShort(qty * T.perUnitINR)],
  ];
  const bw = (FACE_W - 180 - 48) / 3;
  stats.forEach(([k, v], i) => {
    const x = 90 + i * (bw + 24);
    rr(c, x, 492, bw, 230, 32);
    c.fillStyle = BG2;
    c.fill();
    font(c, 48, 500);
    c.fillStyle = SOFT;
    c.fillText(k, x + 40, 574);
    font(c, 92, 650);
    c.fillStyle = INK;
    c.fillText(v, x + 40, 678);
  });

  // What approving does, as a quiet line: the ERP's dot, then the words.
  dot(c, 108, 864, 13, TINTS.cobalt);
  font(c, 54, 500);
  c.fillStyle = SOFT;
  c.fillText(FACES.decisionFoot, 142, 882);
}

/** The fact each layer contributes, set large in the left column so it reads even when the cards fan out. */
const LAYER_METRIC: [string, string][] = [
  ["Day 6", "Plant 01 drops below safety stock"],
  ["+18%", "Open orders in three weeks"],
  ["240", "Transferable after reserving 380"],
  ["3 / 3", "Policy checks passed"],
];

/** Fanned, a layer card shows about its left 42%: every word sits there, the drawing to its right. */
const FAN_W = 0.42 * FACE_W;

function layer(c: C, k: number, fan = false) {
  if (k === 4) return decision(c);
  const tone = LAYER_TONE[k];
  const L = LAYERS[k];
  const [metric, caption] = LAYER_METRIC[k];
  label(c, `0${k + 1}  ${L.name}`, 90, 138, ink(tone));
  if (!fan) status(c, "Checked", FACE_W - 90, 140, TINTS.emerald, false);

  // Left column: the one number that matters, as large as the column allows.
  const colW = FAN_W - 140;
  let size = 230;
  c.letterSpacing = "-8px";
  for (; size > 150; size -= 10) {
    font(c, size, 650);
    if (c.measureText(metric).width <= colW) break;
  }
  c.fillStyle = INK;
  c.fillText(metric, 80, 430);
  c.letterSpacing = "0px";
  // No accent rule under the number: the label above and the drawing carry the tone.
  font(c, 64, 500);
  c.fillStyle = SOFT;
  wrap(c, caption, 90, 556, colW, 78);

  // Right column: the drawing. Its words (the statement, the figures on it) only where the whole
  // card is in view; fanned, it is a drawing alone, so no word is ever cut by the card in front.
  const x0 = fan ? FAN_W + 60 : 720;
  const x1 = FACE_W - 90;
  const w = x1 - x0;
  if (!fan) {
    font(c, 60, 650);
    c.fillStyle = INK;
    c.letterSpacing = "-1.5px";
    wrap(c, L.text, x0, 300, w, 72);
    c.letterSpacing = "0px";
  }

  const top = fan ? 300 : 500;
  const bottom = 900;
  if (k === 0) {
    // Stock running down through safety stock.
    const safety = bottom - 120;
    const span = safety - top + 60;
    c.strokeStyle = hexA(COLORS.signal, 0.8);
    c.setLineDash([18, 16]);
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(x0, safety);
    c.lineTo(x1, safety);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = INK;
    c.lineWidth = 11;
    c.lineCap = "round";
    c.beginPath();
    for (let i = 0; i <= 24; i++) {
      const x = x0 + (i / 24) * w;
      const y = top + 20 + Math.pow(i / 24, 1.25) * span;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
    const cross = x0 + Math.pow((safety - top - 20) / span, 1 / 1.25) * w;
    dot(c, cross, safety, 24, COLORS.signal);
    if (!fan) {
      font(c, 46, 650);
      c.fillStyle = ink(COLORS.signal);
      c.textAlign = "right";
      c.fillText("Day 6", cross - 40, safety + 80);
      c.textAlign = "left";
    }
  } else if (k === 1) {
    // Orders rising week on week.
    const vals = [0.42, 0.48, 0.5, 0.58, 0.66, 0.78, 0.92];
    const gap = 22;
    const bw = (w - gap * (vals.length - 1)) / vals.length;
    vals.forEach((v, i) => {
      const h = v * (bottom - top);
      rr(c, x0 + i * (bw + gap), bottom - h, bw, h, 16);
      c.fillStyle = i === vals.length - 1 ? tone : hexA(tone, 0.25);
      c.fill();
    });
  } else if (k === 2) {
    // Plant 02 holds more than its plan; Plant 01 is short. The line marks each plant's plan.
    const rows: [string, number][] = [
      [EXAMPLE.plant02.name, EXAMPLE.plant02.stock],
      [EXAMPLE.plant01.name, EXAMPLE.plant01.day6Without],
    ];
    const plan = EXAMPLE.plant02.ownPlan;
    const pitch = fan ? 260 : 190;
    rows.forEach(([n, v], i) => {
      const y = top + 44 + i * pitch;
      if (!fan) {
        font(c, 44, 600);
        c.fillStyle = SOFT;
        c.fillText(n, x0, y);
      }
      const by = y + 28;
      rr(c, x0, by, w, 84, 42);
      c.fillStyle = BG2;
      c.fill();
      rr(c, x0, by, Math.max((v / 700) * w, 120), 84, 42);
      c.fillStyle = i === 0 ? tone : COLORS.signal;
      c.fill();
      c.fillStyle = INK;
      c.fillRect(x0 + (plan / 700) * w - 4, by - 16, 8, 116);
      if (!fan) {
        font(c, 46, 650);
        c.fillStyle = i === 0 ? INK : "#fff";
        c.fillText(`${v}`, x0 + 32, by + 58);
      }
    });
  } else {
    // Policy checks passed: the checks themselves where they can be read, else three ticked rows.
    FACES.policyChecks.forEach((t, i) => {
      const y = top + (fan ? 90 : 60) + i * (fan ? 170 : 130);
      check(c, x0 + 28, y - 4, i === 2 ? TINTS.cobalt : TINTS.emerald);
      if (fan) {
        rr(c, x0 + 90, y - 20, (w - 90) * [0.9, 0.7, 0.8][i], 34, 17);
        c.fillStyle = BG2;
        c.fill();
        return;
      }
      font(c, 52, 550);
      c.fillStyle = INK;
      c.fillText(t, x0 + 90, y + 14);
    });
  }
}

/* Each function shows its decision through the evidence that function actually works with:
   a lane between plants, a maintenance schedule, a regional allocation, a case cluster, a ledger. */

const FN_TOP = 560;

/** Supply chain: the lane between two plants, with the transfer on it. */
function fnLane(c: C, tone: string) {
  const y = 720;
  const a = 230;
  const b = FACE_W - 230;
  c.strokeStyle = LINE;
  c.lineWidth = 12;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(a, y);
  c.lineTo(b, y);
  c.stroke();
  c.strokeStyle = tone;
  c.setLineDash([2, 28]);
  c.lineWidth = 14;
  c.beginPath();
  c.moveTo(a, y);
  c.lineTo(b * 0.62 + a * 0.38, y);
  c.stroke();
  c.setLineDash([]);
  const node = (x: number, name: string, sub: string, col: string) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(x, y, 40, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = col;
    c.lineWidth = 12;
    c.stroke();
    font(c, 50, 650);
    c.fillStyle = INK;
    c.textAlign = "center";
    c.fillText(name, x, y - 80);
    font(c, 44, 500);
    c.fillStyle = SOFT;
    c.fillText(sub, x, y + 110);
    c.textAlign = "left";
  };
  node(a, "Plant 02", "620 units", TINTS.saffron);
  node(b, "Plant 01", "140 units", COLORS.signal);
  // The shipment on the lane
  const tx = b * 0.62 + a * 0.38;
  rr(c, tx - 100, y - 42, 200, 84, 42);
  c.fillStyle = tone;
  c.fill();
  font(c, 48, 650);
  c.fillStyle = onTone(tone);
  c.textAlign = "center";
  c.fillText("240", tx, y + 16);
  c.textAlign = "left";
}

/** Operations: Line 04 week plan, the bearing swap slotted before Friday's run. */
function fnSchedule(c: C, tone: string) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const x0 = 320;
  const x1 = FACE_W - 90;
  const dw = (x1 - x0) / days.length;
  font(c, 42, 600, true);
  c.fillStyle = SOFT;
  days.forEach((d, i) => c.fillText(d.toUpperCase(), x0 + i * dw + 14, FN_TOP + 10));
  const rows: [string, [number, number, string][]][] = [
    ["Line 03", [[0, 2.4, BG2], [2.6, 4.9, BG2]]],
    ["Line 04", [[0, 3.05, BG2], [3.1, 3.95, tone], [4.0, 4.9, BG2]]],
    ["Line 05", [[0.4, 4.6, BG2]]],
  ];
  rows.forEach(([name, bars], r) => {
    const y = FN_TOP + 44 + r * 100;
    font(c, 46, 600);
    c.fillStyle = r === 1 ? INK : SOFT;
    c.fillText(name, 90, y + 54);
    bars.forEach(([s, e, col]) => {
      rr(c, x0 + s * dw, y, (e - s) * dw - 10, 76, 20);
      c.fillStyle = col;
      c.fill();
    });
  });
  // Label the slot
  const sx = x0 + 3.1 * dw;
  font(c, 42, 650);
  c.fillStyle = onTone(tone);
  c.fillText("Swap", sx + 22, FN_TOP + 44 + 100 + 53);
}

/** Commercial: allocation by region, 12% moving from North to West. */
function fnAllocation(c: C, tone: string) {
  const regions: [string, number, number][] = [
    ["North", 0.38, -0.12],
    ["West", 0.22, 0.12],
    ["South", 0.24, 0],
    ["East", 0.16, 0],
  ];
  const x0 = 90;
  const w = FACE_W - 180;
  // Before and after, as two stacked bars
  [0, 1].forEach((row) => {
    const y = FN_TOP + 10 + row * 170;
    label(c, row ? "Proposed" : "Today", x0, y);
    let x = x0;
    regions.forEach(([name, v, d], i) => {
      const share = v + (row ? d : 0);
      const bw = share * w - 10;
      rr(c, x, y + 26, bw, 88, 20);
      c.fillStyle = row && d !== 0 ? (d > 0 ? tone : hexA(tone, 0.35)) : i === 0 || i === 1 ? hexA(tone, 0.18) : BG2;
      c.fill();
      font(c, 44, 600);
      c.fillStyle = row && d > 0 ? onTone(tone) : INK;
      c.fillText(`${name} ${Math.round(share * 100)}%`, x + 26, y + 86);
      x += share * w;
    });
  });
}

/** Customer: 14 cases that look separate, traced to one root cause. */
function fnCases(c: C, tone: string) {
  const cx = FACE_W - 360;
  const cy = 730;
  const dots: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.3;
    const r = 140 + (i % 3) * 26;
    dots.push([cx + Math.cos(a) * r * 1.55, cy + Math.sin(a) * r * 0.62]);
  }
  c.strokeStyle = hexA(tone, 0.35);
  c.lineWidth = 4;
  dots.forEach(([x, y]) => {
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(x, y);
    c.stroke();
  });
  dots.forEach(([x, y]) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(x, y, 18, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = tone;
    c.lineWidth = 7;
    c.stroke();
  });
  dot(c, cx, cy, 44, tone);
  font(c, 170, 650);
  c.fillStyle = INK;
  c.letterSpacing = "-6px";
  c.fillText("14", 82, 730);
  c.letterSpacing = "0px";
  font(c, 48, 500);
  c.fillStyle = SOFT;
  c.fillText(FACES.casesCause[0], 90, 810);
  c.fillStyle = INK;
  c.fillText(FACES.casesCause[1], 90, 876);
}

/** Finance and risk: the invoice ledger, three held until goods are received. */
function fnLedger(c: C, tone: string) {
  FACES.ledger.forEach(([id, amt, hold], i) => {
    const y = FN_TOP - 24 + i * 92;
    if (hold) {
      rr(c, 70, y - 6, FACE_W - 140, 82, 20);
      c.fillStyle = BG2;
      c.fill();
    }
    font(c, 48, 600, true);
    c.fillStyle = hold ? INK : SOFT;
    c.fillText(id, 104, y + 52);
    font(c, 50, 600);
    c.fillText(amt, 560, y + 52);
    font(c, 48, 600);
    c.fillStyle = hold ? ink(tone) : ink(TINTS.emerald);
    c.textAlign = "right";
    c.fillText(hold ? "Hold · no GRN" : "Matched", FACE_W - 104, y + 52);
    c.textAlign = "left";
  });
}

const FN_VISUAL = [fnLane, fnSchedule, fnAllocation, fnCases, fnLedger];

function fn(c: C, k: number) {
  const tone = FUNCTION_TONE[k];
  const f = FUNCTIONS[k];
  chip(c, f.name, 90, 140, tone);
  pill(c, "Ready for approval", FACE_W - 90, 140, TINTS.emerald);
  title(c, f.decision, 310, 104, INK, FACE_W - 180);
  FN_VISUAL[k](c, tone);
  // Footer: the systems this function's decision drew on
  label(c, FN_SOURCES[k], 90, 958);
}

const FN_SOURCES = [
  "WMS · ERP · Freight",
  "MES · CMMS · Stores",
  "CRM · Planning · POS",
  "Service desk · Quality · MES",
  "ERP · AP · Receiving",
];

/** Industries: one board, one decision. Three things on it, set to read from across the room: the
 *  industry, what kind of thing this is, and the decision. Its systems are on the page beside it. */
function industry(c: C, k: number) {
  const ind = INDUSTRIES[k];
  const tone = INDUSTRY_TONE[k];
  font(c, 64, 650);
  const w = c.measureText(ind.name).width + 136;
  rr(c, 90, 76, w, 112, 56);
  c.fillStyle = BG2;
  c.fill();
  dot(c, 146, 132, 16, tone);
  c.fillStyle = INK;
  c.fillText(ind.name, 182, 155);
  font(c, 58, 600, true);
  c.fillStyle = SOFT;
  c.letterSpacing = "5px";
  c.fillText("RECOMMENDED ACTION", 90, 404);
  c.letterSpacing = "0px";
  title(c, ind.decision, 560, 132, INK, FACE_W - 180);
}

/** The ending: the lead magnet, standing where the six systems meet. */
function final(c: C) {
  // Logo mark
  const marks: [string, number][] = [
    [TINTS.cobalt, 70],
    [TINTS.saffron, 40],
    [COLORS.signal, 10],
  ];
  marks.forEach(([col, y]) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(150, 90 + y);
    c.lineTo(90, 120 + y);
    c.lineTo(150, 150 + y);
    c.lineTo(210, 120 + y);
    c.closePath();
    c.fill();
  });
  font(c, 80, 650);
  c.fillStyle = INK;
  c.fillText("decignal", 240, 206);
  // The six systems that feed it, one dot each, as the threads arrive on the ground around it.
  [TINTS.cobalt, TINTS.violet, TINTS.emerald, TINTS.saffron, TINTS.tangerine, TINTS.pink].forEach((t, i) => dot(c, FACE_W - 110 - (5 - i) * 56, 178, 17, t));
  title(c, FACES.final.title, 440, 136, INK, FACE_W - 180);
  // What it is: a quiet tag, not a button (the page carries the real call to action).
  // Set at 88 units so it stays at least 11 CSS px on the ending's card on a desktop screen.
  font(c, 88, 650);
  const text = FACES.final.pill;
  const w = Math.min(c.measureText(text).width + 156, FACE_W - 180);
  rr(c, 90, 778, w, 152, 76);
  c.fillStyle = BG2;
  c.fill();
  dot(c, 160, 854, 17, TINTS.emerald);
  c.fillStyle = INK;
  c.fillText(text, 204, 886);
}

/** Draws a face. rotate turns it upside down for faces seen after a half turn; scale draws it into a
 *  canvas of a different size (FACE_W * scale wide) with the same layout. */
export function drawFace(canvas: HTMLCanvasElement, spec: FaceSpec, rotate = false, scale = 1) {
  const c = canvas.getContext("2d")!;
  c.setTransform(scale, 0, 0, scale, 0, 0);
  c.clearRect(0, 0, FACE_W, FACE_H);
  if (rotate) {
    c.translate(FACE_W, FACE_H);
    c.rotate(Math.PI);
  }
  c.fillStyle = "#FFFFFF";
  c.fillRect(0, 0, FACE_W, FACE_H);
  c.textBaseline = "alphabetic";
  switch (spec.kind) {
    case "decision":
      decision(c, spec.qty, spec.mode);
      break;
    case "layer":
      layer(c, spec.k, spec.fan);
      break;
    case "function":
      fn(c, spec.k);
      break;
    case "industry":
      industry(c, spec.k);
      break;
    case "final":
      final(c);
      break;
  }
  // Hairline frame
  c.strokeStyle = LINE;
  c.lineWidth = 4;
  c.strokeRect(2, 2, FACE_W - 4, FACE_H - 4);
}

export function faceKey(s: FaceSpec) {
  switch (s.kind) {
    case "decision":
      return `decision-${s.qty ?? T.units}-${s.mode ?? "idle"}`;
    case "layer":
      return `layer-${s.k}${s.fan ? "-fan" : ""}`;
    case "final":
      return "final";
    default:
      return `${s.kind}-${s.k}`;
  }
}
