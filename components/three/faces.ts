// Card faces drawn as real product UI on a canvas, then used as textures.
import { FUNCTIONS, INDUSTRIES, LAYERS } from "@/lib/story";
import { COLORS, TINTS } from "./palette";

export type FaceSpec =
  | { kind: "decision" }
  | { kind: "layer"; k: number }
  | { kind: "function"; k: number }
  | { kind: "industry"; k: number }
  | { kind: "final" };

export const FACE_W = 1600;
export const FACE_H = 1000;

const INK = "#1D1D1F";
const SOFT = "#6E6E73";
const LINE = "#E6E6EA";
const BG2 = "#F5F5F7";
export const LAYER_TONE = [COLORS.signal, TINTS.violet, TINTS.saffron, TINTS.cobalt, TINTS.emerald];
export const FUNCTION_TONE = [TINTS.cobalt, TINTS.emerald, TINTS.tangerine, TINTS.pink, TINTS.violet];
const INDUSTRY_TONE = [TINTS.emerald, TINTS.cobalt, TINTS.pink, TINTS.tangerine, TINTS.violet, TINTS.saffron];

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

function label(c: C, text: string, x: number, y: number, color = SOFT) {
  font(c, 28, 500, true);
  c.fillStyle = color;
  c.letterSpacing = "3px";
  c.fillText(text.toUpperCase(), x, y);
  c.letterSpacing = "0px";
}

function pill(c: C, text: string, xRight: number, y: number, color: string, filled = false) {
  font(c, 30, 600);
  const w = c.measureText(text).width + 84;
  const x = xRight - w;
  rr(c, x, y - 40, w, 64, 32);
  c.fillStyle = filled ? color : hexA(color, 0.12);
  c.fill();
  c.fillStyle = filled ? "#fff" : color;
  c.beginPath();
  c.arc(x + 34, y - 8, 8, 0, Math.PI * 2);
  c.fill();
  c.fillText(text, x + 54, y + 2);
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

function title(c: C, text: string, y: number, size = 92, color = INK, maxW = FACE_W - 180) {
  font(c, size, 650);
  c.fillStyle = color;
  c.letterSpacing = `${-size * 0.03}px`;
  const end = wrap(c, text, 90, y, maxW, size * 1.08);
  c.letterSpacing = "0px";
  return end;
}

function check(c: C, x: number, y: number, color: string) {
  c.fillStyle = hexA(color, 0.14);
  c.beginPath();
  c.arc(x, y, 26, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = color;
  c.lineWidth = 6;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(x - 11, y + 1);
  c.lineTo(x - 3, y + 9);
  c.lineTo(x + 12, y - 8);
  c.stroke();
}

function button(c: C, text: string, x: number, y: number, dark: boolean) {
  font(c, 32, 600);
  const w = c.measureText(text).width + 88;
  rr(c, x, y, w, 84, 42);
  if (dark) {
    c.fillStyle = INK;
    c.fill();
  } else {
    c.strokeStyle = "#D2D2D7";
    c.lineWidth = 3;
    c.stroke();
  }
  c.fillStyle = dark ? "#fff" : INK;
  c.fillText(text, x + 44, y + 53);
  return x + w + 20;
}

/* ------------------------------------------------------------------ */

function decision(c: C) {
  label(c, "Recommended action", 90, 128);
  pill(c, "Ready for approval", FACE_W - 90, 128, TINTS.emerald);
  title(c, "Transfer 240 units", 300, 112);
  font(c, 58, 500);
  c.fillStyle = SOFT;
  c.fillText("from Plant 02 to Plant 01", 90, 385);

  const stats = [
    ["Units", "240"],
    ["Arrives", "2 days"],
    ["Cost", "INR 38,000"],
  ];
  const bw = (FACE_W - 180 - 40) / 3;
  stats.forEach(([k, v], i) => {
    const x = 90 + i * (bw + 20);
    rr(c, x, 460, bw, 170, 28);
    c.fillStyle = BG2;
    c.fill();
    font(c, 30, 500);
    c.fillStyle = SOFT;
    c.fillText(k, x + 36, 522);
    font(c, 56, 650);
    c.fillStyle = INK;
    c.fillText(v, x + 36, 598);
  });

  let x = button(c, "Approve", 90, 720, true);
  x = button(c, "Adjust", x, 720, false);
  button(c, "Reject", x, 720, false);
  font(c, 28, 500);
  c.fillStyle = SOFT;
  c.textAlign = "right";
  c.fillText("Creates a transfer order in SAP", FACE_W - 90, 772);
  c.textAlign = "left";

  // Evidence strip: the six systems it was built from.
  const tones = [TINTS.cobalt, TINTS.violet, TINTS.emerald, TINTS.saffron, TINTS.tangerine, TINTS.pink];
  const names = ["ERP", "CRM", "MES", "WMS", "SUPPLIERS", "EXTERNAL"];
  let ex = 90;
  font(c, 26, 500, true);
  names.forEach((n, i) => {
    c.fillStyle = tones[i];
    c.beginPath();
    c.arc(ex + 9, 893, 9, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = SOFT;
    c.fillText(n, ex + 28, 902);
    ex += c.measureText(n).width + 76;
  });
}

/** The fact each layer contributes, set large in the left column so it reads even when the cards fan out. */
const LAYER_METRIC: [string, string][] = [
  ["Day 6", "Plant 01 drops below safety stock"],
  ["+18%", "Open orders in three weeks"],
  ["240", "Transferable after reserving 380"],
  ["3 / 3", "Policy checks passed"],
];

function layer(c: C, k: number) {
  if (k === 4) return decision(c);
  const tone = LAYER_TONE[k];
  const L = LAYERS[k];
  const [metric, caption] = LAYER_METRIC[k];
  label(c, `0${k + 1}  ${L.name}`, 90, 128, tone);
  pill(c, "Checked", FACE_W - 90, 128, TINTS.emerald);

  // Left column: the one number that matters.
  font(c, 190, 650);
  c.fillStyle = INK;
  c.letterSpacing = "-7px";
  c.fillText(metric, 82, 420);
  c.letterSpacing = "0px";
  rr(c, 90, 470, 72, 10, 5);
  c.fillStyle = tone;
  c.fill();
  font(c, 42, 500);
  c.fillStyle = SOFT;
  wrap(c, caption, 90, 560, 420, 54);

  // Right column: the statement and its evidence.
  const x0 = 640;
  const x1 = FACE_W - 90;
  const w = x1 - x0;
  font(c, 54, 650);
  c.fillStyle = INK;
  c.letterSpacing = "-1.5px";
  wrap(c, L.text, x0, 290, w, 62);
  c.letterSpacing = "0px";

  const top = 470;
  const bottom = 880;
  if (k === 0) {
    // Stock running down through safety stock.
    const safety = 760;
    c.strokeStyle = hexA(COLORS.signal, 0.8);
    c.setLineDash([16, 14]);
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x0, safety);
    c.lineTo(x1, safety);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = INK;
    c.lineWidth = 9;
    c.lineCap = "round";
    c.beginPath();
    for (let i = 0; i <= 24; i++) {
      const x = x0 + (i / 24) * w;
      const y = top + 30 + Math.pow(i / 24, 1.25) * 360;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
    const cross = x0 + Math.pow((safety - top - 30) / 360, 1 / 1.25) * w;
    c.fillStyle = COLORS.signal;
    c.beginPath();
    c.arc(cross, safety, 20, 0, Math.PI * 2);
    c.fill();
    font(c, 30, 600);
    c.fillText("Day 6", cross - 120, safety + 62);
  } else if (k === 1) {
    // Orders rising week on week.
    const vals = [0.42, 0.48, 0.5, 0.58, 0.66, 0.78, 0.92];
    const gap = 20;
    const bw = (w - gap * (vals.length - 1)) / vals.length;
    vals.forEach((v, i) => {
      const h = v * (bottom - top);
      rr(c, x0 + i * (bw + gap), bottom - h, bw, h, 14);
      c.fillStyle = i === vals.length - 1 ? tone : hexA(tone, 0.25);
      c.fill();
    });
  } else if (k === 2) {
    // Plant 02 holds more than its plan; Plant 01 is short.
    const rows: [string, number][] = [
      ["Plant 02", 620],
      ["Plant 01", 140],
    ];
    const plan = 380;
    rows.forEach(([n, v], i) => {
      const y = top + 40 + i * 170;
      font(c, 32, 600);
      c.fillStyle = SOFT;
      c.fillText(n, x0, y);
      const by = y + 24;
      rr(c, x0, by, w, 64, 32);
      c.fillStyle = BG2;
      c.fill();
      rr(c, x0, by, Math.max((v / 700) * w, 64), 64, 32);
      c.fillStyle = i === 0 ? tone : COLORS.signal;
      c.fill();
      c.fillStyle = INK;
      c.fillRect(x0 + (plan / 700) * w - 3, by - 14, 6, 92);
      font(c, 30, 650);
      c.fillStyle = i === 0 ? INK : "#fff";
      c.fillText(`${v}`, x0 + 24, by + 43);
    });
    font(c, 26, 500);
    c.fillStyle = SOFT;
    c.fillText("Line marks plan", x0, bottom + 10);
  } else {
    // Policy checks passed.
    ["Inter-plant transfer allowed", "Plant 02 stays at plan", "Planner approval required"].forEach((t, i) => {
      const y = top + 50 + i * 120;
      check(c, x0 + 26, y, i === 2 ? TINTS.cobalt : TINTS.emerald);
      font(c, 38, 550);
      c.fillStyle = INK;
      c.fillText(t, x0 + 80, y + 13);
    });
  }
}

/* Each function shows its decision through the evidence that function actually works with:
   a lane between plants, a maintenance schedule, a regional allocation, a case cluster, a ledger. */

const FN_TOP = 520;
const FN_BOTTOM = 820;

/** Supply chain: the lane between two plants, with the transfer on it. */
function fnLane(c: C, tone: string) {
  const y = 650;
  const a = 200;
  const b = FACE_W - 200;
  c.strokeStyle = LINE;
  c.lineWidth = 10;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(a, y);
  c.lineTo(b, y);
  c.stroke();
  c.strokeStyle = tone;
  c.setLineDash([2, 26]);
  c.lineWidth = 12;
  c.beginPath();
  c.moveTo(a, y);
  c.lineTo(b * 0.62 + a * 0.38, y);
  c.stroke();
  c.setLineDash([]);
  const node = (x: number, name: string, sub: string, col: string) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(x, y, 34, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = col;
    c.lineWidth = 10;
    c.stroke();
    font(c, 34, 650);
    c.fillStyle = INK;
    c.textAlign = "center";
    c.fillText(name, x, y - 70);
    font(c, 28, 500);
    c.fillStyle = SOFT;
    c.fillText(sub, x, y + 90);
    c.textAlign = "left";
  };
  node(a, "Plant 02", "620 units", TINTS.saffron);
  node(b, "Plant 01", "140 units", COLORS.signal);
  // The shipment on the lane
  const tx = b * 0.62 + a * 0.38;
  rr(c, tx - 80, y - 34, 160, 68, 34);
  c.fillStyle = tone;
  c.fill();
  font(c, 30, 650);
  c.fillStyle = "#fff";
  c.textAlign = "center";
  c.fillText("240", tx, y + 11);
  c.textAlign = "left";
}

/** Operations: Line 04 week plan, the bearing swap slotted before Friday's run. */
function fnSchedule(c: C, tone: string) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const x0 = 250;
  const x1 = FACE_W - 90;
  const dw = (x1 - x0) / days.length;
  font(c, 30, 500, true);
  c.fillStyle = SOFT;
  days.forEach((d, i) => c.fillText(d.toUpperCase(), x0 + i * dw + 12, FN_TOP));
  const rows: [string, [number, number, string][]][] = [
    ["Line 03", [[0, 2.4, BG2], [2.6, 4.9, BG2]]],
    ["Line 04", [[0, 3.1, BG2], [3.15, 3.85, tone], [3.9, 4.9, BG2]]],
    ["Line 05", [[0.4, 4.6, BG2]]],
  ];
  rows.forEach(([name, bars], r) => {
    const y = FN_TOP + 50 + r * 92;
    font(c, 30, 600);
    c.fillStyle = r === 1 ? INK : SOFT;
    c.fillText(name, 90, y + 44);
    bars.forEach(([s, e, col]) => {
      rr(c, x0 + s * dw, y, (e - s) * dw - 8, 62, 16);
      c.fillStyle = col;
      c.fill();
    });
  });
  // Label the slot
  const sx = x0 + 3.15 * dw;
  font(c, 26, 650);
  c.fillStyle = "#fff";
  c.fillText("Swap", sx + 16, FN_TOP + 50 + 92 + 41);
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
    const y = FN_TOP + 20 + row * 150;
    label(c, row ? "Proposed" : "Today", x0, y);
    let x = x0;
    regions.forEach(([name, v, d], i) => {
      const share = v + (row ? d : 0);
      const bw = share * w - 8;
      rr(c, x, y + 22, bw, 70, 16);
      c.fillStyle = row && d !== 0 ? (d > 0 ? tone : hexA(tone, 0.35)) : i === 0 || i === 1 ? hexA(tone, 0.18) : BG2;
      c.fill();
      font(c, 32, 600);
      c.fillStyle = row && d > 0 ? "#fff" : INK;
      c.fillText(`${name} ${Math.round(share * 100)}%`, x + 22, y + 67);
      x += share * w;
    });
  });
}

/** Customer: 14 cases that look separate, traced to one root cause. */
function fnCases(c: C, tone: string) {
  const cx = FACE_W - 330;
  const cy = 680;
  // Root cause node
  const dots: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.3;
    const r = 150 + (i % 3) * 28;
    dots.push([cx + Math.cos(a) * r * 1.5, cy + Math.sin(a) * r * 0.62]);
  }
  c.strokeStyle = hexA(tone, 0.35);
  c.lineWidth = 3;
  dots.forEach(([x, y]) => {
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(x, y);
    c.stroke();
  });
  dots.forEach(([x, y]) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(x, y, 16, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = tone;
    c.lineWidth = 6;
    c.stroke();
  });
  c.fillStyle = tone;
  c.beginPath();
  c.arc(cx, cy, 40, 0, Math.PI * 2);
  c.fill();
  font(c, 120, 650);
  c.fillStyle = INK;
  c.letterSpacing = "-4px";
  c.fillText("14", 90, 680);
  c.letterSpacing = "0px";
  font(c, 34, 500);
  c.fillStyle = SOFT;
  c.fillText("cases, one cause:", 90, 740);
  c.fillStyle = INK;
  c.fillText("Batch 2207 seal", 90, 790);
}

/** Finance and risk: the invoice ledger, three held until goods are received. */
function fnLedger(c: C, tone: string) {
  const rows: [string, string, boolean][] = [
    ["INV-4471", "INR 2.4L", false],
    ["INV-4472", "INR 86k", true],
    ["INV-4475", "INR 1.1L", true],
    ["INV-4478", "INR 64k", true],
  ];
  rows.forEach(([id, amt, hold], i) => {
    const y = FN_TOP - 30 + i * 84;
    if (hold) {
      rr(c, 70, y - 8, FACE_W - 140, 72, 18);
      c.fillStyle = hexA(tone, 0.1);
      c.fill();
    }
    font(c, 30, 500, true);
    c.fillStyle = hold ? INK : SOFT;
    c.fillText(id, 100, y + 38);
    font(c, 32, 600);
    c.fillText(amt, 520, y + 38);
    font(c, 28, 600);
    c.fillStyle = hold ? tone : TINTS.emerald;
    c.textAlign = "right";
    c.fillText(hold ? "Hold · no GRN" : "Matched", FACE_W - 100, y + 38);
    c.textAlign = "left";
  });
}

const FN_VISUAL = [fnLane, fnSchedule, fnAllocation, fnCases, fnLedger];

function fn(c: C, k: number) {
  const tone = FUNCTION_TONE[k];
  const f = FUNCTIONS[k];
  pillLeft(c, f.name, 90, 128, tone);
  pill(c, "Ready for approval", FACE_W - 90, 128, TINTS.emerald);
  title(c, f.decision, 300, 84, INK, FACE_W - 180);
  FN_VISUAL[k](c, tone);
  // Footer: the systems this function's decision drew on
  c.fillStyle = LINE;
  c.fillRect(90, FN_BOTTOM + 40, FACE_W - 180, 3);
  label(c, FN_SOURCES[k], 90, FN_BOTTOM + 110);
}

const FN_SOURCES = [
  "WMS · ERP · Freight",
  "MES · CMMS · Stores",
  "CRM · Planning · POS",
  "Service desk · Quality · MES",
  "ERP · AP · Receiving",
];

function pillLeft(c: C, text: string, x: number, y: number, color: string) {
  font(c, 32, 650);
  const w = c.measureText(text).width + 64;
  rr(c, x, y - 44, w, 70, 35);
  c.fillStyle = color;
  c.fill();
  c.fillStyle = "#fff";
  c.fillText(text, x + 32, y + 3);
}

function industry(c: C, k: number) {
  const ind = INDUSTRIES[k];
  const tone = INDUSTRY_TONE[k];
  pillLeft(c, ind.name, 90, 128, tone);
  pill(c, "Ready", FACE_W - 90, 128, TINTS.emerald);
  label(c, "Recommended action", 90, 270);
  title(c, ind.decision, 380, 96, INK, FACE_W - 180);
  label(c, "Connected systems", 90, 790);
  let x = 90;
  font(c, 34, 600);
  ind.system.split(" · ").forEach((s) => {
    const w = c.measureText(s).width + 64;
    rr(c, x, 830, w, 76, 38);
    c.fillStyle = BG2;
    c.fill();
    c.fillStyle = INK;
    c.fillText(s, x + 32, 880);
    x += w + 18;
  });
}

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
  font(c, 64, 650);
  c.fillStyle = INK;
  c.fillText("decignal", 240, 200);
  title(c, "Your first decision, in production in weeks.", 470, 100, INK, FACE_W - 180);
  pillLeft(c, "Free AI audit · 30 minutes", 90, 880, TINTS.cobalt);
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
      decision(c);
      break;
    case "layer":
      layer(c, spec.k);
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

export const faceKey = (s: FaceSpec) => ("k" in s ? `${s.kind}-${s.k}` : s.kind);
