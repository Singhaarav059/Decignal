// Card faces drawn as real product UI on a canvas, then used as textures.
// Laid out on a 1600 x 1000 grid and drawn at any scale. The cards are a few hundred pixels wide on
// screen, so the type is set large and sparse: the smallest text is 40 units, nothing is decoration-
// sized, and detail lives in the page's own readouts beside the cards.
import { FUNCTIONS, LAYERS } from "@/lib/story";
import { CONTROL, FACES } from "@/lib/copy";
import { APP_FACTS, EXAMPLE } from "@/lib/example";
import { COLORS, TINTS } from "./palette";

/** The reader's choice on the page's approval panel, which the decision face follows. */
export type DecisionMode = "idle" | "approved" | "rejected";

export type FaceSpec =
  | { kind: "decision"; qty?: number; mode?: DecisionMode }
  /** `fan`: the card is read fanned out, with only its left part in view, so all its text sits there. */
  | { kind: "layer"; k: number; fan?: boolean }
  /** Drawn upright (portrait) in the function's colour, for Scale's hand of cards. */
  | { kind: "function"; k: number }
  /** The glass layer card's print: text only, on a clear ground, upright like the hand. */
  | { kind: "glass" }
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

function label(c: C, text: string, x: number, y: number, color = SOFT, size = 46) {
  font(c, size, 600, true);
  c.fillStyle = color;
  c.letterSpacing = "4px";
  c.fillText(text.toUpperCase(), x, y);
  c.letterSpacing = "0px";
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

const LN = EXAMPLE.line;
const CERT = EXAMPLE.cert;
const ITEMS = EXAMPLE.checklist.items;
const SUPPORTED = ITEMS.filter((i) => i.status === "supported").length;

/** The review: what it flags, what the checklist shows, and where it stands. The page's panel holds
 *  the real Request, Add a question and Not an issue; the card only shows the state they leave it in.
 *  "approved" is the store's word for a request drafted: the shipment itself is never approved. */
function decision(c: C, mode: DecisionMode = "idle") {
  label(c, "For review", 90, 138);
  if (mode === "approved") status(c, "Certificate requested", FACE_W - 90, 140, TINTS.emerald, true);
  else if (mode === "rejected") status(c, "Resolved by reviewer", FACE_W - 90, 140, TINTS.cobalt, true);
  else status(c, "Draft · not approved", FACE_W - 90, 140, TINTS.tangerine, false);
  title(c, CONTROL.title, 330, 140, mode === "rejected" ? SOFT : INK);
  font(c, 62, 500);
  c.fillStyle = SOFT;
  c.fillText(`Certificate says ${CERT.heat} · ${CERT.source}`, 90, 428);

  const stats = [
    ["Supported", `${SUPPORTED} of ${ITEMS.length}`],
    ["Conflicting", `${ITEMS.filter((i) => i.status === "conflicting").length}`],
    ["Missing", `${ITEMS.filter((i) => i.status === "missing").length}`],
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
    c.fillStyle = i === 0 ? INK : ink(COLORS.signal);
    c.fillText(v, x + 40, 678);
  });

  // Who decides, as a quiet line: the quality source's dot, then the words.
  dot(c, 108, 864, 13, TINTS.emerald);
  font(c, 54, 500);
  c.fillStyle = SOFT;
  c.fillText(FACES.decisionFoot, 142, 882);
}

/** The fact each layer contributes, set large in the left column so it reads even when the cards fan out. */
const LAYER_METRIC: [string, string][] = [
  [LN.heat, `Heat recorded on line ${LN.n}`],
  [CERT.heat, "Heat on the supplied certificate"],
  [`${SUPPORTED} / ${ITEMS.length}`, `Checklist ${EXAMPLE.checklist.rev} items supported`],
  ["3 / 3", "Rules applied, nothing edited"],
];

/** Fanned, a layer card shows about its left 42%: every word sits there, the drawing to its right. */
const FAN_W = 0.42 * FACE_W;

function layer(c: C, k: number, fan = false) {
  if (k === 4) return decision(c);
  const tone = LAYER_TONE[k];
  const L = LAYERS[k];
  const [metric, caption] = LAYER_METRIC[k];
  label(c, L.name, 90, 138, ink(tone));
  if (!fan) status(c, k === 1 ? "Conflicting" : "Checked", FACE_W - 90, 140, k === 1 ? COLORS.signal : TINTS.emerald, false);

  // Left column: the one figure that matters, as large as the column allows.
  const colW = FAN_W - 140;
  let size = 230;
  c.letterSpacing = "-8px";
  for (; size > 150; size -= 10) {
    font(c, size, 650);
    if (c.measureText(metric).width <= colW) break;
  }
  c.fillStyle = k === 1 ? ink(COLORS.signal) : INK;
  c.fillText(metric, 80, 430);
  c.letterSpacing = "0px";
  font(c, 64, 500);
  c.fillStyle = SOFT;
  wrap(c, caption, 90, 556, colW, 78);

  // Right column: the drawing. Its words only where the whole card is in view; fanned, it is a drawing
  // alone, so no word is ever cut by the card in front.
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
    // The shipment's delivery lines, line 12 picked out in the tone.
    const rows = 5;
    const pitch = (bottom - top) / rows;
    for (let r = 0; r < rows; r++) {
      const y = top + r * pitch;
      const on = r === 2;
      rr(c, x0, y, w, pitch - 24, 24);
      c.fillStyle = on ? tone : BG2;
      c.fill();
      if (!fan && on) {
        font(c, 46, 650);
        c.fillStyle = onTone(tone);
        c.fillText(`Line ${LN.n} · ${LN.heat}`, x0 + 32, y + (pitch - 24) / 2 + 16);
      }
    }
  } else if (k === 1) {
    // The two references side by side, the difference marked in red.
    const bw = (w - 120) / 2;
    const y = top + 60;
    const h = 220;
    rr(c, x0, y, bw, h, 36);
    c.fillStyle = TINTS.cobalt;
    c.fill();
    rr(c, x1 - bw, y, bw, h, 36);
    c.fillStyle = "#fff";
    c.fill();
    c.strokeStyle = COLORS.signal;
    c.lineWidth = 6;
    c.stroke();
    dot(c, x0 + w / 2, y + h / 2, 30, COLORS.signal);
    if (!fan) {
      font(c, 72, 650);
      c.textAlign = "center";
      c.fillStyle = "#fff";
      c.fillText(LN.heat, x0 + bw / 2, y + h / 2 + 26);
      c.fillStyle = ink(COLORS.signal);
      c.fillText(CERT.heat, x1 - bw / 2, y + h / 2 + 26);
      c.textAlign = "left";
    }
  } else if (k === 2) {
    // The checklist: each required document as a row, supported in the tone, open ones in red.
    const pitch = (bottom - top) / ITEMS.length;
    ITEMS.forEach((it, i) => {
      const y = top + i * pitch;
      const ok = it.status === "supported";
      rr(c, x0 + 70, y + 8, w - 70, pitch - 28, 18);
      c.fillStyle = BG2;
      c.fill();
      if (ok) check(c, x0 + 26, y + pitch / 2 - 8, TINTS.emerald);
      else dot(c, x0 + 26, y + pitch / 2 - 8, 18, COLORS.signal);
      if (!fan) {
        font(c, 40, 600);
        c.fillStyle = ok ? INK : ink(COLORS.signal);
        c.fillText(it.name, x0 + 100, y + pitch / 2 + 4);
      }
    });
  } else {
    // The rules applied: the checks themselves where they can be read, else three ticked rows.
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

/* Scale's hand: each card stands upright and is mostly covered by the next one dealt, so its left
   column carries what identifies it (the badge and the start of its name); the newest card, on top,
   reads in full: the function, its decision and where it stands. Drawn on a 1000 x 1600 grid. */

const PW = FACE_H;
const PH = FACE_W;
const HAND_PAD = 84;

/** Lucide icons (24 grid, 2 stroke) as SVG paths: one per function, and the layer under them all. */
const ring = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const FN_ICON = [
  // truck
  ["M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2", "M15 18H9", "M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14", ring(17, 18, 2), ring(7, 18, 2)],
  // factory
  ["M12 16h.01", "M16 16h.01", "M8 16h.01", "M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"],
  // tags
  ["M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z", "M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193", ring(10.5, 6.5, 0.5)],
  // headset
  ["M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z", "M21 16v2a4 4 0 0 1-4 4h-5"],
  // receipt
  ["M13 16H8", "M14 8H8", "M16 12H8", "M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"],
];
const LAYER_ICON = [
  "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
  "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
  "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
];

/** A round badge with an icon, top-left of a hand card. */
function badge(c: C, paths: string[], fill: string, stroke: string) {
  const r = 74;
  const cx = HAND_PAD + r;
  const cy = HAND_PAD + r;
  dot(c, cx, cy, r, fill);
  const size = 78;
  c.save();
  c.translate(cx - size / 2, cy - size / 2);
  c.scale(size / 24, size / 24);
  c.strokeStyle = stroke;
  c.lineWidth = 2;
  c.lineCap = "round";
  c.lineJoin = "round";
  paths.forEach((d) => c.stroke(new Path2D(d)));
  c.restore();
}

/** The lines `text` wraps into at the current font. */
function lines(c: C, text: string, maxW: number) {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(" ")) {
    const test = line ? `${line} ${w}` : w;
    if (c.measureText(test).width > maxW && line) {
      out.push(line);
      line = w;
    } else line = test;
  }
  out.push(line);
  return out;
}

/** The name under the badge, sized once for every card so the longest word of any name fits the strip
 *  of a card that the next one dealt leaves in view (half a card, a little more at the top). */
const NAME_W = 400;
/** The name's last baseline. */
const NAME_Y = 430;
const NAME_WORDS = [...FUNCTIONS.map((f) => f.name), FACES.layer.title].flatMap((n) => n.split(" "));
function handName(c: C, text: string, color: string) {
  // Measured at every draw: the first draw may still be in a fallback font.
  font(c, 80, 650);
  const nameSize = Math.floor(Math.min(80, (80 * NAME_W) / Math.max(...NAME_WORDS.map((w) => c.measureText(w).width))));
  font(c, nameSize, 650);
  c.fillStyle = color;
  c.letterSpacing = `${-nameSize * 0.02}px`;
  // Set up from a fixed last line, so every card's name sits the same distance above its graphic.
  const ls = lines(c, text, NAME_W);
  ls.forEach((l, i) => c.fillText(l, HAND_PAD, NAME_Y - (ls.length - 1 - i) * nameSize * 1.08));
  c.letterSpacing = "0px";
}

/* A hand card's grid, top to bottom: the badge and index, the name, the evidence graphic (HAND_ART, its
   own small texture so it can move without redrawing the face), the decision, and the status at the
   foot. Every card shares it, so the hand's names, graphics and decisions line up card to card. */

/** The graphic's box on the portrait grid: the full text width, between the name and the decision. */
const HAND_ART = { x: HAND_PAD, y: 500, w: PW - HAND_PAD * 2, h: 468 };
/** The decision's first baseline: just under the graphic, whatever its line count. */
const DECISION_Y = 1092;

/** A hand card's decision, set from a fixed top, over a footer drawn by `foot` above the bottom margin. */
function handText(c: C, text: string, fg: string, foot: (y: number) => void) {
  const footY = PH - HAND_PAD - 26;
  foot(footY);
  // Largest size whose last line still clears the status pill (its top is 76 above footY) by a gap:
  // a four-line decision at 102 ran under the pill.
  const room = footY - 76 - 44;
  let size = 102;
  let ls: string[] = [];
  for (; size >= 60; size -= 4) {
    font(c, size, 650);
    c.letterSpacing = `${-size * 0.025}px`;
    ls = lines(c, text, PW - HAND_PAD * 2);
    if (DECISION_Y + (ls.length - 1) * size * 1.08 + size * 0.22 <= room) break;
  }
  c.fillStyle = fg;
  ls.forEach((l, i) => c.fillText(l, HAND_PAD - 2, DECISION_Y + i * size * 1.08));
  c.letterSpacing = "0px";
}

/** Function k as a hand card: its colour edge to edge, its badge and name, its decision and status. */
function fnHand(c: C, k: number) {
  const tone = FUNCTION_TONE[k];
  const f = FUNCTIONS[k];
  const fg = onTone(tone);
  c.fillStyle = tone;
  c.fillRect(0, 0, PW, PH);
  badge(c, FN_ICON[k], "#FFFFFF", ink(tone));
  handName(c, f.name, fg);
  handText(c, f.decision, fg, (y) => {
    // The status, as on every decision in the story: a white pill, an emerald dot.
    font(c, 60, 650);
    const w = c.measureText(FACES.ready).width + 150;
    rr(c, HAND_PAD, y - 76, w, 112, 56);
    c.fillStyle = "#FFFFFF";
    c.fill();
    dot(c, HAND_PAD + 54, y - 20, 15, TINTS.emerald);
    c.fillStyle = INK;
    c.fillText(FACES.ready, HAND_PAD + 92, y);
  });
}

/** The layer card is smoked glass (cards.tsx), so its print is white; fills that sit on the print take
 *  ink. Light glass read as a washed-out white card on the pale page. */
const LAYER_FG = "#FFFFFF";
const LAYER_BG = INK;
const layerA = (o: number) => white(o);

/** The glass layer card's print, on clear. Its foot is a status like the functions', with a dot for
 *  each function it sits over. */
function glass(c: C) {
  badge(c, LAYER_ICON, LAYER_FG, LAYER_BG);
  handName(c, FACES.layer.title, LAYER_FG);
  handText(c, FACES.layer.body, LAYER_FG, (y) => {
    font(c, 60, 650);
    const w = c.measureText(FACES.layer.foot).width + 150 + 4 * 34;
    rr(c, HAND_PAD, y - 76, w, 112, 56);
    c.fillStyle = LAYER_FG;
    c.fill();
    FUNCTION_TONE.forEach((t, i) => dot(c, HAND_PAD + 54 + i * 34, y - 20, 12, t));
    c.fillStyle = LAYER_BG;
    c.fillText(FACES.layer.foot, HAND_PAD + 92 + 4 * 34, y);
  });
}

/* ------------------------------------------------------------------ */
/* Hand art: each card's evidence, drawn at `p` (0 to 1, its build as  */
/* the card lands) and `t` (seconds of its idle motion while read)     */
/* ------------------------------------------------------------------ */

const AW = HAND_ART.w;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => {
  const v = clamp01(x);
  return v * v * (3 - 2 * v);
};
/** p's progress through [a, b], eased. */
const seg = (p: number, a: number, b: number) => ease((p - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Text and lines in the card's own text colour (fg, a); data fills always in white (w): ink tints on
 *  the warm glazes read brown. */
type Paint = { fg: string; a: (o: number) => string; w: (o: number) => string; tone: string };
const white = (o: number) => `rgba(255,255,255,${o})`;
const paintOf = (tone: string): Paint => {
  const fg = onTone(tone);
  return { fg, tone, a: (o) => (fg === INK ? hexA(INK, o) : white(o)), w: white };
};
/** The art's smallest type: about 12 CSS px on a hand card at 1440. */
const ART_TYPE = 58;
const ART = FACES.art;

/** The graphic's head: what it shows on the left, its one figure on the right. */
function artHead(c: C, k: number, P: Paint) {
  label(c, ART.labels[k], 0, 44, P.a(0.78), ART_TYPE);
  font(c, 58, 650);
  c.fillStyle = P.fg;
  c.textAlign = "right";
  c.fillText(ART.figures[k], AW, 44);
  c.textAlign = "left";
}

/** Supplier coordination: the confirmed PO line and the supplier's update, which lands short on Friday
 *  (the confirmed level dashed); the message flows toward the buyer's review. */
function artStock(c: C, P: Paint, p: number, t: number) {
  artHead(c, 0, P);
  const top = 86;
  const base = 312;
  const bw = 186;
  const U = APP_FACTS.supplier;
  const max = 120;
  const m = seg(p, 0.3, 0.9);
  const plants = [
    { x: 0, name: "Confirmed", from: U.qty, to: U.qty, right: false },
    { x: AW - bw, name: U.firstDay, from: U.qty, to: U.first, right: true },
  ];
  for (const pl of plants) {
    const u = lerp(pl.from, pl.to, m);
    rr(c, pl.x, top, bw, base - top, 30);
    c.fillStyle = P.w(0.2);
    c.fill();
    const h = (u / max) * (base - top);
    rr(c, pl.x, base - h, bw, h, 30);
    // The update's bar drops to what the supplier now promises for Friday.
    c.fillStyle = pl.right ? P.w(lerp(1, 0.55, m)) : P.w(1);
    c.fill();
    c.textAlign = pl.right ? "right" : "left";
    const x = pl.right ? AW : 0;
    font(c, 80, 650);
    c.fillStyle = P.fg;
    c.fillText(String(Math.round(u)), x, 390);
    label(c, pl.name, x, 446, P.a(0.78), ART_TYPE);
    c.textAlign = "left";
  }
  // The confirmed quantity, as a line across the update's bar.
  const sy = base - (U.qty / max) * (base - top);
  c.strokeStyle = P.a(0.75);
  c.lineWidth = 5;
  c.setLineDash([14, 12]);
  c.beginPath();
  c.moveTo(AW - bw - 14, sy);
  c.lineTo(AW + 2, sy);
  c.stroke();
  // The message between them, flowing toward the update, and its icon on the way.
  const ly = 199;
  const x0 = bw + 34;
  const x1 = AW - bw - 34;
  c.setLineDash([2, 30]);
  c.lineDashOffset = -t * 64;
  c.lineCap = "round";
  c.lineWidth = 12;
  c.strokeStyle = P.a(0.5);
  c.beginPath();
  c.moveTo(x0, ly);
  c.lineTo(x1 - 26, ly);
  c.stroke();
  c.setLineDash([]);
  c.lineDashOffset = 0;
  c.lineWidth = 9;
  c.strokeStyle = P.a(0.7);
  c.beginPath();
  c.moveTo(x1 - 34, ly - 22);
  c.lineTo(x1 - 10, ly);
  c.lineTo(x1 - 34, ly + 22);
  c.stroke();
  const pw = 150;
  const px = lerp(x0 - 40, (x0 + x1) / 2 - pw / 2, seg(p, 0, 0.7));
  c.globalAlpha = seg(p, 0, 0.25);
  rr(c, px, ly - 42, pw, 84, 42);
  c.fillStyle = "#FFFFFF";
  c.fill();
  c.save();
  c.translate(px + pw / 2 - 30, ly - 30);
  c.scale(60 / 24, 60 / 24);
  c.strokeStyle = ink(P.tone);
  c.lineWidth = 2;
  c.lineJoin = "round";
  FN_ICON[0].forEach((d) => c.stroke(new Path2D(d)));
  c.restore();
  c.globalAlpha = 1;
}

/** Dispatch documentation: the checklist's six documents as a rising line of evidence found; the
 *  last two (the conflicting certificate and the missing process certificate) break it, and the
 *  pack's open item is lit as a band behind the line. */
function artVibration(c: C, P: Paint, p: number, t: number) {
  artHead(c, 1, P);
  const top = 100;
  const base = 352;
  const limit = 128;
  const v = [0.2, 0.36, 0.52, 0.68, 0.62, 0.96];
  const xs = v.map((_, i) => 56 + i * 144);
  const ys = v.map((n) => base - n * (base - top));
  const sk = seg(p, 0.55, 0.9);
  // The open item, behind the line, down to its document on the axis.
  c.globalAlpha = sk;
  rr(c, xs[4] - 60, top - 18, 120, 468 - top + 18, 32);
  c.fillStyle = P.w(0.26);
  c.fill();
  c.globalAlpha = 1;
  c.strokeStyle = P.a(0.55);
  c.lineWidth = 5;
  c.setLineDash([16, 12]);
  c.beginPath();
  c.moveTo(0, limit);
  c.lineTo(AW, limit);
  c.stroke();
  c.setLineDash([]);
  // The limit's name hangs under its line, at the low (left) end of the series.
  label(c, ART.limit, 0, limit + 80, P.a(0.7), ART_TYPE);
  const q = seg(p, 0, 0.7) * (v.length - 1);
  c.strokeStyle = P.fg;
  c.lineWidth = 10;
  c.lineCap = "round";
  c.lineJoin = "round";
  for (let s = 0; s < v.length - 1; s++) {
    const f = clamp01(q - s);
    if (f <= 0) break;
    if (s === v.length - 2) c.setLineDash([18, 16]);
    c.beginPath();
    c.moveTo(xs[s], ys[s]);
    c.lineTo(lerp(xs[s], xs[s + 1], f), lerp(ys[s], ys[s + 1], f));
    c.stroke();
    c.setLineDash([]);
  }
  for (let i = 0; i < v.length - 1; i++) if (q >= i) dot(c, xs[i], ys[i], 13, P.fg);
  if (q >= v.length - 1) {
    const sx = xs[v.length - 1];
    const sy = ys[v.length - 1];
    c.lineWidth = 7;
    c.strokeStyle = P.fg;
    c.beginPath();
    c.arc(sx, sy, 20, 0, Math.PI * 2);
    c.stroke();
    // While read: a ring keeps spreading from the missing document.
    if (t > 0) {
      const ph = (t % 1.8) / 1.8;
      c.strokeStyle = P.a((1 - ph) * 0.6);
      c.lineWidth = 5;
      c.beginPath();
      c.arc(sx, sy, 20 + ph * 36, 0, Math.PI * 2);
      c.stroke();
    }
  }
  c.textAlign = "center";
  ART.days.forEach((d, i) => label(c, d, xs[i], 430, i === v.length - 1 ? P.a(0.5) : P.a(0.78), ART_TYPE));
  c.textAlign = "left";
}

/** RFQ review: each specification the customer requires (the material's requirement dashed), with
 *  the supplier's offer as the bar; the material falls short of what is asked. */
function artAllocation(c: C, P: Paint, p: number, t: number) {
  artHead(c, 2, P);
  const base = 372;
  const maxH = 230;
  const cw = 166;
  const step = (AW - cw) / 3;
  const today = [36, 26, 30, 20];
  const next = [24, 26, 30, 20];
  const OFFER = [APP_FACTS.rfq.offered, "DN50", "PN40", "FL"];
  const m = seg(p, 0.2, 0.85);
  const fill = [P.w(0.5), P.w(1), P.w(0.3), P.w(0.3)];
  today.forEach((v0, i) => {
    const x = i * step;
    const v = lerp(v0, next[i], m);
    const h = (v / 40) * maxH;
    rr(c, x, base - h, cw, h, 24);
    c.fillStyle = fill[i];
    c.fill();
    if (i === 0) {
      // North's share before the shift, as a dashed outline that marches while the card is read.
      const h0 = (v0 / 40) * maxH;
      c.globalAlpha = m;
      c.strokeStyle = P.a(0.6);
      c.lineWidth = 5;
      c.setLineDash([12, 10]);
      c.lineDashOffset = -t * 24;
      rr(c, x + 2.5, base - h0 + 2.5, cw - 5, h0 - 5, 22);
      c.stroke();
      c.setLineDash([]);
      c.lineDashOffset = 0;
      c.globalAlpha = 1;
    }
    c.textAlign = "center";
    font(c, 64, 650);
    c.fillStyle = P.fg;
    c.fillText(OFFER[i], x + cw / 2, base - Math.max(h, i === 0 ? (v0 / 40) * maxH * m : 0) - 22);
    font(c, 60, 600);
    c.fillStyle = P.a(0.8);
    c.fillText(ART.regions[i], x + cw / 2, 444);
    c.textAlign = "left";
  });
}

/** Service follow-up: service visits that came in separately, each traced to the one pump and seal. */
const CASES: [number, number][] = [
  [40, 130], [150, 104], [262, 140], [380, 116], [96, 222], [212, 206], [330, 232],
  [450, 200], [40, 318], [156, 300], [270, 330], [392, 306], [110, 404], [300, 410],
];
function artCases(c: C, P: Paint, p: number, t: number) {
  artHead(c, 3, P);
  const rx = 610;
  const ry = 240;
  CASES.forEach(([x, y], i) => {
    const f = seg(p, i * 0.035, i * 0.035 + 0.35);
    if (f <= 0) return;
    c.strokeStyle = P.a(0.35);
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(lerp(x, rx, f), lerp(y, ry, f));
    c.stroke();
  });
  // While read: a few cases send a dot along their line to the cause.
  if (t > 0)
    CASES.forEach(([x, y], i) => {
      if (i % 3) return;
      const ph = (t * 0.45 + i / CASES.length) % 1;
      dot(c, lerp(x, rx, ph), lerp(y, ry, ph), 8, P.a(0.7 * (1 - ph * 0.6)));
    });
  CASES.forEach(([x, y]) => {
    c.fillStyle = "#FFFFFF";
    c.beginPath();
    c.arc(x, y, 17, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = P.fg;
    c.lineWidth = 6;
    c.stroke();
  });
  const k = seg(p, 0.35, 0.75);
  c.strokeStyle = P.a(0.3);
  c.lineWidth = 5;
  c.beginPath();
  c.arc(rx, ry, 70, 0, Math.PI * 2);
  c.stroke();
  dot(c, rx, ry, 46 * (0.6 + 0.4 * k), P.fg);
  if (t > 0) {
    const ph = (t % 1.8) / 1.8;
    c.strokeStyle = P.a((1 - ph) * 0.5);
    c.lineWidth = 5;
    c.beginPath();
    c.arc(rx, ry, 70 + ph * 40, 0, Math.PI * 2);
    c.stroke();
  }
  c.textAlign = "center";
  label(c, APP_FACTS.service.equipment, rx, 374, P.fg, ART_TYPE);
  c.textAlign = "left";
}

/** Deduction review: the records behind one debit note; two linked, the receiver note and the
 *  deduction itself left open for finance. */
function artLedger(c: C, P: Paint, p: number, t: number) {
  artHead(c, 4, P);
  FACES.ledger.forEach(([id, amt, hold], r) => {
    const y = 82 + r * 100;
    const k = seg(p, r * 0.12, r * 0.12 + 0.35);
    if (k <= 0) return;
    c.globalAlpha = k;
    const x = (1 - k) * 24;
    if (hold) {
      rr(c, x, y, AW, 86, 24);
      c.fillStyle = P.w(0.16);
      c.fill();
    }
    const ix = x + 44;
    const iy = y + 43;
    if (hold) {
      // Held: a pause mark, which breathes while the card is read.
      const s = seg(p, 0.5 + r * 0.08, 0.75 + r * 0.08);
      c.globalAlpha = k * s * (t > 0 ? 0.75 + 0.25 * Math.cos(t * 2.4 + r) : 1);
      c.strokeStyle = P.fg;
      c.lineWidth = 6;
      c.beginPath();
      c.arc(ix, iy, 24, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = P.fg;
      c.fillRect(ix - 10, iy - 11, 7, 22);
      c.fillRect(ix + 3, iy - 11, 7, 22);
      c.globalAlpha = k;
    } else {
      dot(c, ix, iy, 24, P.fg);
      check(c, ix, iy, P.tone);
    }
    font(c, ART_TYPE, 600, true);
    c.fillStyle = P.fg;
    c.fillText(id, x + 92, y + 62);
    font(c, 60, 600);
    c.fillStyle = P.a(0.85);
    c.textAlign = "right";
    c.fillText(amt, x + AW - 28, y + 62);
    c.textAlign = "left";
    c.globalAlpha = 1;
  });
}

/** The glass layer card: the five functions, each feeding the one layer they share. */
function artLayer(c: C, p: number, t: number) {
  const P: Paint = { fg: LAYER_FG, tone: LAYER_FG, a: layerA, w: white };
  artHead(c, 5, P);
  const dy = 150;
  const by = 330;
  const xs = FUNCTION_TONE.map((_, i) => 64 + i * ((AW - 128) / 4));
  FUNCTION_TONE.forEach((tone, i) => {
    const f = seg(p, i * 0.08, i * 0.08 + 0.4);
    c.strokeStyle = layerA(0.34);
    c.lineWidth = 6;
    c.lineCap = "round";
    if (f > 0) {
      c.beginPath();
      c.moveTo(xs[i], dy + 30);
      c.lineTo(xs[i], lerp(dy + 30, by, f));
      c.stroke();
    }
    // While read: each function keeps sending its context down into the layer.
    if (t > 0) {
      const ph = (t * 0.7 + i * 0.2) % 1;
      c.globalAlpha = 1 - ease((ph - 0.7) / 0.3);
      dot(c, xs[i], lerp(dy + 44, by - 14, ph), 10, tone);
      c.globalAlpha = 1;
    }
    dot(c, xs[i], dy, 30, tone);
  });
  c.globalAlpha = seg(p, 0.35, 0.8);
  rr(c, 0, by, AW, 100, 50);
  c.fillStyle = LAYER_FG;
  c.fill();
  font(c, ART_TYPE, 650);
  c.fillStyle = LAYER_BG;
  c.textAlign = "center";
  c.fillText(ART.layer, AW / 2, by + 70);
  c.textAlign = "left";
  c.globalAlpha = 1;
}

const FN_ART = [artStock, artVibration, artAllocation, artCases, artLedger];

/** The art's canvas size at `scale` (FACE_W * scale is the face canvas's width). Drawn turned a quarter,
 *  like the face, so the art's height runs along the canvas's width. */
export const handArtSize = (scale: number): [number, number] => [Math.round(HAND_ART.h * scale), Math.round(HAND_ART.w * scale)];

/** Where the art lies on a face plane w x h (from the plane's centre, in its own units), so its plane
 *  lands exactly over the face's empty box. */
export function handArtPlane(w: number, h: number) {
  const cx = HAND_ART.y + HAND_ART.h / 2;
  const cy = FACE_H - HAND_ART.x - HAND_ART.w / 2;
  return { x: (cx / FACE_W - 0.5) * w, y: (0.5 - cy / FACE_H) * h, w: (HAND_ART.h / FACE_W) * w, h: (HAND_ART.w / FACE_H) * h };
}

/** The art's box on an upright face (the phone hand's DOM cards), as fractions of the face. */
export const HAND_ART_BOX = { x: HAND_ART.x / PW, y: HAND_ART.y / PH, w: HAND_ART.w / PW, h: HAND_ART.h / PH };

/** Draws a hand card's art (function k, or the glass card's) at build p and idle time t. `upright`
 *  draws it unturned, onto a canvas HAND_ART.w * scale wide (the phone hand's DOM cards). */
export function drawHandArt(canvas: HTMLCanvasElement, spec: FaceSpec, p: number, t: number, scale: number, upright = false) {
  const c = canvas.getContext("2d")!;
  c.setTransform(scale, 0, 0, scale, 0, 0);
  if (upright) c.clearRect(0, 0, HAND_ART.w, HAND_ART.h);
  else {
    c.clearRect(0, 0, HAND_ART.h, HAND_ART.w);
    c.translate(0, HAND_ART.w);
    c.rotate(-Math.PI / 2);
  }
  c.textBaseline = "alphabetic";
  c.lineCap = "butt";
  if (spec.kind === "function") {
    const tone = FUNCTION_TONE[spec.k];
    // The face's own colour under the art, so the plane over it is seamless.
    c.fillStyle = tone;
    c.fillRect(-2, -2, HAND_ART.w + 4, HAND_ART.h + 4);
    FN_ART[spec.k](c, paintOf(tone), p, t);
  } else if (spec.kind === "glass") artLayer(c, p, t);
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
 *  canvas of a different size (FACE_W * scale wide) with the same layout. `upright` draws a hand face
 *  unturned onto a portrait canvas (FACE_H * scale wide), for the phone hand's DOM cards. */
export function drawFace(canvas: HTMLCanvasElement, spec: FaceSpec, rotate = false, scale = 1, upright = false) {
  const c = canvas.getContext("2d")!;
  c.setTransform(scale, 0, 0, scale, 0, 0);
  c.clearRect(0, 0, FACE_W, FACE_W);
  if (rotate) {
    c.translate(FACE_W, FACE_H);
    c.rotate(Math.PI);
  }
  c.textBaseline = "alphabetic";
  // Scale's hand stands its cards upright: drawn on a portrait grid turned a quarter onto the canvas.
  const hand = spec.kind === "glass" || spec.kind === "function";
  if (hand) {
    if (!upright) {
      c.translate(0, FACE_H);
      c.rotate(-Math.PI / 2);
    }
    if (spec.kind === "glass") glass(c);
    else fnHand(c, spec.k);
    return;
  }
  c.fillStyle = "#FFFFFF";
  c.fillRect(0, 0, FACE_W, FACE_H);
  switch (spec.kind) {
    case "decision":
      decision(c, spec.mode);
      break;
    case "layer":
      layer(c, spec.k, spec.fan);
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
      return `decision-${s.qty ?? SUPPORTED}-${s.mode ?? "idle"}`;
    case "layer":
      return `layer-${s.k}${s.fan ? "-fan" : ""}`;
    case "final":
      return "final";
    case "glass":
      return "glass";
    case "function":
      return `function-${s.k}`;
  }
}
