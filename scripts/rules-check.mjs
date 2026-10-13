#!/usr/bin/env node
// Design-rule gate for app/, components/ and lib/ (critic §1.3).
//   node scripts/rules-check.mjs --warn     print findings, exit 0
//   node scripts/rules-check.mjs --strict   print findings, exit 1 when there are any
// Rules (comments are ignored; strings, JSX text and CSS values are checked):
//   em-dash       an em dash in copy (TS/TSX strings and JSX text, CSS strings)
//   warm-colour   a hex or rgb() colour with hue 20-50deg and HSL saturation above 8% (brown, beige, cream).
//                 Vivid accents (chroma >= 60% and lightness >= 45%, e.g. saffron #ffb21e) pass. Skin tones
//                 are exempt when their key or constant is named for skin (skin: "#...", SKIN = [...]).
//   gradient      CSS gradients, Tailwind gradient utilities, canvas create*Gradient
//   backdrop      backdrop-filter / backdropFilter / Tailwind backdrop-* utilities
//   blur          blur() filters and Tailwind blur-* utilities
//   ink-mix       color-mix(...) that mixes with --color-ink (reads brown; use the --tone-ink tokens)
//   vw-calc       100vw inside calc() (counts the scrollbar; use % or the grid tokens)
//   shadow-blur   a box-shadow layer blurred more than 4px, unless it is var(--shadow-float)
// A line can opt out of one rule with a comment on it or on the line above: `rules-check: allow <rule>`.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const DIRS = ["app", "components", "lib"];
const EXT = new Set([".ts", ".tsx", ".css"]);
const mode = process.argv.includes("--strict") ? "strict" : "warn";

function files(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(files(p));
    else if (EXT.has(extname(name))) out.push(p);
  }
  return out;
}

/** Same-length copy of the source with comments blanked (newlines kept), strings left in place. */
function stripComments(src, css) {
  const out = src.split("");
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== "\n") out[k] = " "; };
  let i = 0;
  const n = src.length;
  const tpl = []; // brace depth at each open ${
  let depth = 0;
  const skipString = (q) => { i++; while (i < n && src[i] !== q && src[i] !== "\n") i += src[i] === "\\" ? 2 : 1; i++; };
  const skipTemplate = () => {
    while (i < n) {
      if (src[i] === "\\") { i += 2; continue; }
      if (src[i] === "`") { i++; return; }
      if (src[i] === "$" && src[i + 1] === "{") { i += 2; tpl.push(depth++); return; }
      i++;
    }
  };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); const end = e < 0 ? n : e + 2; blank(i, end); i = end; continue; }
    if (!css && c === "/" && d === "/") { const e = src.indexOf("\n", i); const end = e < 0 ? n : e; blank(i, end); i = end; continue; }
    if (c === '"' || c === "'") { skipString(c); continue; }
    if (!css && c === "`") { i++; skipTemplate(); continue; }
    if (!css && c === "{") { depth++; i++; continue; }
    if (!css && c === "}") {
      depth--;
      i++;
      if (tpl.length && tpl[tpl.length - 1] === depth) { tpl.pop(); skipTemplate(); }
      continue;
    }
    i++;
  }
  return out.join("");
}

function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}
// Brown, beige and cream: a warm hue with some saturation. Vivid accents (chroma >= 60%, lightness
// >= 45%, e.g. the saffron system colour #ffb21e or a safety-vest orange) are not brown and pass.
const warm = (r, g, b) => {
  const c = hsl(r, g, b);
  const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  return c.h >= 20 && c.h <= 50 && c.s > 0.08 && !(chroma >= 0.6 && c.l >= 0.45);
};
function hexRgb(hex) {
  let h = hex.slice(1);
  if (h.length <= 4) h = h.split("").map((x) => x + x).join("");
  return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16));
}
/** The key or constant a literal is assigned to on its line: `skin: "#..."`, `SKIN = ["#...", ...]`. */
function ownerKey(lineBefore) {
  const m = [...lineBefore.matchAll(/([A-Za-z_$][\w$-]*)\s*(?::|=(?!=))/g)];
  return m.length ? m[m.length - 1][1] : "";
}

/** Balanced argument text of a function call starting at the "(" index. */
function argsAt(text, open) {
  let d = 0;
  for (let k = open; k < text.length; k++) {
    if (text[k] === "(") d++;
    else if (text[k] === ")" && --d === 0) return text.slice(open + 1, k);
  }
  return text.slice(open + 1);
}
function splitTop(s) {
  const out = []; let d = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") d++;
    if (ch === ")") d--;
    if (ch === "," && d === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}
/** Largest blur radius (px) among the layers of a box-shadow value, or 0. */
function shadowBlur(value) {
  let worst = 0;
  for (let layer of splitTop(value)) {
    layer = layer
      .replace(/\b(rgba?|hsla?|oklab|oklch|color-mix|var)\([^()]*(\([^()]*\)[^()]*)*\)/g, " ")
      .replace(/#[0-9a-fA-F]{3,8}\b/g, " ")
      .replace(/\binset\b/g, " ");
    const lens = [...layer.matchAll(/(-?\d*\.?\d+)(px|rem|em)?\b/g)].map((m) => +m[1] * (m[2] === "rem" || m[2] === "em" ? 16 : 1));
    if (lens.length >= 3) worst = Math.max(worst, lens[2]);
  }
  return worst;
}

const findings = [];
const lineOf = (text, idx) => text.slice(0, idx).split("\n").length;

for (const dir of DIRS) {
  for (const file of files(join(ROOT, dir))) {
    const rel = relative(ROOT, file);
    const css = file.endsWith(".css");
    const src = readFileSync(file, "utf8");
    const text = stripComments(src, css);
    const rawLines = src.split("\n");
    const allowed = (line, rule) => [rawLines[line - 1], rawLines[line - 2]].some((l) => l && new RegExp(`rules-check:\\s*allow\\s+${rule}\\b`).test(l));
    const add = (rule, idx, snippet) => {
      const line = lineOf(text, idx);
      if (allowed(line, rule)) return;
      findings.push({ rule, file: rel, line, snippet: snippet.replace(/\s+/g, " ").trim().slice(0, 90) });
    };

    for (const m of text.matchAll(/—/g)) add("em-dash", m.index, rawLines[lineOf(text, m.index) - 1]);

    for (const m of text.matchAll(/(?<![\w&#-])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g)) {
      const [r, g, b] = hexRgb(m[0]);
      if (!warm(r, g, b)) continue;
      const lineStart = text.lastIndexOf("\n", m.index) + 1;
      if (/skin/i.test(ownerKey(text.slice(lineStart, m.index)))) continue;
      add("warm-colour", m.index, m[0]);
    }
    for (const m of text.matchAll(/\brgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/g)) {
      if (!warm(+m[1], +m[2], +m[3])) continue;
      const lineStart = text.lastIndexOf("\n", m.index) + 1;
      if (/skin/i.test(ownerKey(text.slice(lineStart, m.index)))) continue;
      add("warm-colour", m.index, m[0] + ")");
    }

    for (const m of text.matchAll(/\b(?:repeating-)?(?:linear|radial|conic)-gradient\(|\bcreate(?:Linear|Radial|Conic)Gradient\b|\bbg-(?:gradient|linear|radial|conic)\b[\w-]*/g)) add("gradient", m.index, m[0]);
    for (const m of text.matchAll(/\bbackdrop-filter\b|\bbackdropFilter\b|(?<![\w-])backdrop-(?:blur|brightness|contrast|grayscale|saturate|opacity|invert|sepia|hue-rotate)\b[\w\[\]().-]*/g)) add("backdrop", m.index, m[0]);
    for (const m of text.matchAll(/(?<![\w.$-])blur\(|(?<=["'`\s])blur-[\w\[\]().]+/g)) add("blur", m.index, m[0]);

    for (const m of text.matchAll(/\bcolor-mix\(/g)) {
      const a = argsAt(text, m.index + m[0].length - 1);
      if (/--color-ink/.test(a)) add("ink-mix", m.index, `color-mix(${a})`);
    }
    for (const m of text.matchAll(/\bcalc\(/g)) {
      const a = argsAt(text, m.index + m[0].length - 1);
      if (/\b100vw\b/.test(a)) add("vw-calc", m.index, `calc(${a})`);
    }

    const shadows = [];
    for (const m of text.matchAll(/(?<![\w-])box-shadow\s*:\s*([^;}]+)/g)) shadows.push([m.index, m[1]]);
    for (const m of text.matchAll(/\bboxShadow\s*:\s*(["'`])([^"'`]*)\1/g)) shadows.push([m.index, m[2]]);
    for (const m of text.matchAll(/(?<![\w-])shadow-\[([^\]]+)\]/g)) shadows.push([m.index, m[1].replace(/_/g, " ")]);
    for (const [idx, value] of shadows) {
      if (/var\(--shadow-float\)/.test(value)) continue;
      const b = shadowBlur(value);
      if (b > 4) add("shadow-blur", idx, `${b}px blur: ${value}`);
    }
    for (const m of text.matchAll(/(?<=["'`\s])shadow-(?:md|lg|xl|2xl)(?![\w-])/g)) add("shadow-blur", m.index, m[0]);
  }
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
for (const f of findings) console.log(`${f.file}:${f.line}  ${f.rule.padEnd(11)}  ${f.snippet}`);
const counts = {};
for (const f of findings) counts[f.rule] = (counts[f.rule] || 0) + 1;
const RULES = ["em-dash", "warm-colour", "gradient", "backdrop", "blur", "ink-mix", "vw-calc", "shadow-blur"];
console.log(`\nrules-check (${mode}): ${findings.length} finding${findings.length === 1 ? "" : "s"}`);
console.log(RULES.map((r) => `${r} ${counts[r] || 0}`).join(" | "));
if (mode === "strict" && findings.length) process.exit(1);
