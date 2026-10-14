"use client";

import { useEffect } from "react";

/**
 * Liquid glass refraction (the lens at the edge of Apple's Liquid Glass). Every element marked
 * [data-lens] gets its own SVG filter: a displacement map shaped like the element's rounded rectangle,
 * flat in the middle and bending toward the rim, so whatever passes behind the glass curves at its
 * edges. The map is drawn once per size on a canvas and kept, so a size seen before (the nav pill
 * growing and shrinking with its section label) costs nothing; the filter then blurs a little,
 * displaces and lifts saturation, all as the element's backdrop-filter.
 *
 * Only Chromium renders an SVG filter as a backdrop-filter, so other browsers (and readers who ask for
 * reduced transparency) keep the plain glass from liquid-glass.css: a light blur and saturation, no bending.
 *
 * Touch screens keep the plain glass too (on phones a fixed frost, liquid-glass.css). A phone's GPU
 * cannot run an SVG filter: Chrome works it out pixel by pixel on the CPU, again on every frame the
 * page behind it changes. Over the story card (40% of a phone screen, with the 3D moving behind it)
 * that held a Mali-G68 phone to 2 fps; with the lens off it ran at 50-60 (the ?perf probe, 2026-10-14).
 */

/** Max bend at the rim, in px, and how far in from the rim the bend reaches. */
const BEND = 26;
const RIM = 22;

const isChromium = () => /Chrome\/\d+/.test(navigator.userAgent);

/** Maps already drawn, by size and radius; the oldest goes once there are more than MAPS. */
const drawn = new Map<string, Promise<string>>();
const MAPS = 24;

/** The displacement map for a w x h box with corner radius r: red and green carry x and y (128 = none). */
function lensMap(w: number, h: number, r: number) {
  const key = `${w}x${h}r${r}`;
  const hit = drawn.get(key);
  if (hit) {
    drawn.delete(key);
    drawn.set(key, hit);
    return hit;
  }
  const url = drawMap(w, h, r);
  drawn.set(key, url);
  if (drawn.size > MAPS) {
    const [old, gone] = drawn.entries().next().value!;
    drawn.delete(old);
    // Its blob goes too, unless a filter still shows it.
    void gone.then((u) => {
      if (u.startsWith("blob:") && !document.querySelector(`feImage[href="${u}"]`)) URL.revokeObjectURL(u);
    });
  }
  return url;
}

/** The map as an image URL. Encoded with toBlob, off the main thread: toDataURL encoded the PNG in the
 *  frame, and the story card's map, redrawn as it settled after each chapter's hand-off, cost the scroll
 *  a third of a second over the story. */
function drawMap(w: number, h: number, r: number): Promise<string> {
  // A large map is drawn at half size and stretched by the filter: the field is smooth (and blurred
  // after), so it bends the same, for a quarter of the work on a phone's CPU.
  const k = w * h > 40_000 ? 0.5 : 1;
  const cw = Math.ceil(w * k);
  const ch = Math.ceil(h * k);
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(cw, ch);
  const d = img.data;
  const rim = Math.max(4, Math.min(RIM, r * 0.9, Math.min(w, h) / 2));
  const hw = w / 2;
  const hh = h / 2;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = ((x + 0.5) * w) / cw - hw;
      const py = ((y + 0.5) * h) / ch - hh;
      const ax = Math.abs(px) - (hw - r);
      const ay = Math.abs(py) - (hh - r);
      const ox = Math.max(ax, 0);
      const oy = Math.max(ay, 0);
      const len = Math.hypot(ox, oy);
      // Signed distance to the rounded edge, positive inside.
      const inside = r - len - Math.min(Math.max(ax, ay), 0);
      let dx = 0;
      let dy = 0;
      if (inside > 0 && inside < rim) {
        const t = inside / rim;
        // A convex rim: the bend is strongest at the edge and eases to nothing.
        const m = (1 - t) * (1 - t);
        let nx = 0;
        let ny = 0;
        if (ax > 0 && ay > 0 && len > 0) {
          nx = (ox / len) * Math.sign(px);
          ny = (oy / len) * Math.sign(py);
        } else if (ax > ay) nx = Math.sign(px);
        else ny = Math.sign(py);
        // Sample from further in: the backdrop is pulled toward the rim, the way a lens edge magnifies.
        dx = -nx * m;
        dy = -ny * m;
      }
      const i = (y * cw + x) * 4;
      d[i] = Math.round(128 + dx * 127);
      d[i + 1] = Math.round(128 + dy * 127);
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((done) =>
    c.toBlob((b) => {
      const url = b ? URL.createObjectURL(b) : c.toDataURL("image/png");
      // Decoded before a filter takes it, so the swap never draws a frame with an empty map.
      const im = new Image();
      im.src = url;
      im.decode().then(() => done(url), () => done(url));
    }, "image/png"),
  );
}

const NS = "http://www.w3.org/2000/svg";

export function LiquidLens() {
  useEffect(() => {
    if (!isChromium() || window.matchMedia("(pointer: coarse)").matches) return;
    const calm = window.matchMedia("(prefers-reduced-transparency: reduce)");
    if (calm.matches) return;

    const host = document.createElementNS(NS, "svg");
    host.setAttribute("aria-hidden", "true");
    host.setAttribute("width", "0");
    host.setAttribute("height", "0");
    host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    const defs = document.createElementNS(NS, "defs");
    host.appendChild(defs);
    document.body.appendChild(host);

    let n = 0;
    const seen = new Map<HTMLElement, { id: string; key: string; image?: SVGFEImageElement; map?: SVGFEDisplacementMapElement }>();
    // While an element is resizing (the story card easing between chapters), its map stretches to the new
    // size and is redrawn once the size settles: drawing it every frame stalled the scroll.
    const settle = new Map<HTMLElement, number>();
    const ro = new ResizeObserver((entries) =>
      entries.forEach((e) => {
        const el = e.target as HTMLElement;
        const rec = seen.get(el);
        if (!rec?.image || !rec.map) return apply(el);
        const w = Math.round(el.offsetWidth);
        const h = Math.round(el.offsetHeight);
        rec.image.setAttribute("width", String(w));
        rec.image.setAttribute("height", String(h));
        rec.map.setAttribute("scale", String(Math.min(BEND * 2, h * 0.9)));
        window.clearTimeout(settle.get(el));
        settle.set(el, window.setTimeout(() => (settle.delete(el), apply(el)), 180));
      }),
    );

    function apply(el: HTMLElement) {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 8 || h < 8 || w * h > 600_000) return;
      const cs = getComputedStyle(el);
      // Only where the element is glass at this width (a bare wrapper on phones stays bare).
      if (cs.backgroundColor === "rgba(0, 0, 0, 0)" || cs.display === "none") {
        if (el.hasAttribute("data-lens-on")) {
          el.style.backdropFilter = "";
          el.removeAttribute("data-lens-on");
          const rec = seen.get(el);
          if (rec) {
            rec.key = "";
            rec.image = rec.map = undefined;
          }
        }
        return;
      }
      const r = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, w / 2, h / 2);
      const key = `${w}x${h}r${Math.round(r)}`;
      let rec = seen.get(el);
      if (rec?.key === key) return;
      if (!rec) {
        rec = { id: `lens-${n++}`, key: "" };
        seen.set(el, rec);
      }
      rec.key = key;
      const r2 = rec;
      void lensMap(w, h, Math.max(Math.round(r), 2)).then((map) => {
        // Moved on to another size (or bare) while this map was encoding: that call places its own.
        if (r2.key === key && el.isConnected) place(el, r2, map, w, h);
      });
    }

    function place(el: HTMLElement, rec: { id: string; image?: SVGFEImageElement; map?: SVGFEDisplacementMapElement }, map: string, w: number, h: number) {
      // A new size for a filter that exists: swap its map in place rather than rebuilding the filter.
      if (rec.image && rec.map && rec.image.isConnected) {
        rec.image.setAttribute("href", map);
        rec.image.setAttribute("width", String(w));
        rec.image.setAttribute("height", String(h));
        rec.map.setAttribute("scale", String(Math.min(BEND * 2, h * 0.9)));
        return;
      }
      defs.querySelector(`#${rec.id}`)?.remove();
      const blur = el.dataset.lens === "clear" ? 1.5 : 4;
      const f = document.createElementNS(NS, "filter");
      f.setAttribute("id", rec.id);
      f.setAttribute("x", "0");
      f.setAttribute("y", "0");
      f.setAttribute("width", "100%");
      f.setAttribute("height", "100%");
      f.setAttribute("primitiveUnits", "userSpaceOnUse");
      f.setAttribute("color-interpolation-filters", "sRGB");
      f.innerHTML =
        `<feImage href="${map}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>` +
        `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="soft"/>` +
        `<feDisplacementMap in="soft" in2="map" scale="${Math.min(BEND * 2, h * 0.9)}" xChannelSelector="R" yChannelSelector="G" result="bent"/>` +
        `<feColorMatrix in="bent" type="saturate" values="1.7"/>`;
      defs.appendChild(f);
      rec.image = f.querySelector("feImage") as SVGFEImageElement;
      rec.map = f.querySelector("feDisplacementMap") as SVGFEDisplacementMapElement;
      el.style.backdropFilter = `url(#${rec.id})`;
      el.setAttribute("data-lens-on", "");
    }

    // Every element is applied once and then followed by the ResizeObserver (a bare one too: it turns to
    // glass at another width, which is a resize).
    const watched = new WeakSet<HTMLElement>();
    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-lens]").forEach((el) => {
        if (watched.has(el)) return;
        watched.add(el);
        apply(el);
        ro.observe(el);
      });
    };
    scan();
    // Chrome that mounts later (the floating CTA, a menu) is picked up on the next scans.
    const ids = [600, 2000, 5000].map((ms) => window.setTimeout(scan, ms));
    // Only when something with a lens arrives, at most once per frame: text the story rewrites every
    // frame (counters, step labels) must not cost a scan.
    let queued = 0;
    const lensIn = (n: Node) => n instanceof Element && (n.matches("[data-lens]") || !!n.querySelector("[data-lens]"));
    const mo = new MutationObserver((records) => {
      if (queued) return;
      if (records.some((r) => Array.from(r.addedNodes).some(lensIn))) queued = requestAnimationFrame(() => ((queued = 0), scan()));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      ids.forEach(clearTimeout);
      settle.forEach(clearTimeout);
      cancelAnimationFrame(queued);
      mo.disconnect();
      ro.disconnect();
      seen.forEach((_, el) => {
        el.style.backdropFilter = "";
        el.removeAttribute("data-lens-on");
      });
      host.remove();
    };
  }, []);
  return null;
}
