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
const LAYER_TONE = [COLORS.signal, TINTS.violet, TINTS.saffron, TINTS.cobalt, TINTS.emerald];
const FUNCTION_TONE = [TINTS.cobalt, TINTS.emerald, TINTS.tangerine, TINTS.pink, TINTS.violet];
const INDUSTRY_TONE = [TINTS.emerald, TINTS.cobalt, TINTS.pink, TINTS.tangerine, TINTS.violet, TINTS.saffron];

let fonts = { sans: "Inter, Helvetica, Arial, sans-serif", mono: "ui-monospace, Menlo, monospace" };
export function readFonts() {
  const root = getComputedStyle(document.documentElement);
  const sans = getComputedStyle(document.body).fontFamily;
  const mono = root.getPropertyValue("--font-label").trim();
  fonts = { sans: sans || fonts.sans, mono: mono ? `${mono}, ui-monospace, monospace` : fonts.mono };
}

type C = CanvasRenderingContext2D;

const font = (c: C, size: number, weight = 600, mono = false) => {
  c.font = `${weight} ${size}px ${mono ? fonts.mono : fonts.sans}`;
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
    ["Cover", "34 days"],
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
  ["620", "Units at Plant 02, above plan"],
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

function fn(c: C, k: number) {
  const tone = FUNCTION_TONE[k];
  const f = FUNCTIONS[k];
  pillLeft(c, f.name, 90, 128, tone);
  label(c, "Recommended action", FACE_W - 90 - 420, 128);
  title(c, f.decision, 330, 96, INK, FACE_W - 180);
  // Sparkline of the metric that triggered it.
  c.strokeStyle = tone;
  c.lineWidth = 9;
  c.lineCap = "round";
  c.beginPath();
  for (let i = 0; i <= 24; i++) {
    const x = 90 + (i / 24) * (FACE_W - 180);
    const y = 760 - Math.sin(i * 0.55 + k) * 40 - (i / 24) * 90 * (k % 2 ? -1 : 1);
    if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
  }
  c.stroke();
  check(c, 116, 900, TINTS.emerald);
  font(c, 34, 600);
  c.fillStyle = TINTS.emerald;
  c.fillText("Ready for approval", 160, 912);
}

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

/** Draws a face. rotate turns it upside down for faces seen after a half turn. */
export function drawFace(canvas: HTMLCanvasElement, spec: FaceSpec, rotate = false) {
  const c = canvas.getContext("2d")!;
  c.setTransform(1, 0, 0, 1, 0, 0);
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
