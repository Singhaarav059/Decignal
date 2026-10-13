"use client";

import { useEffect } from "react";

/**
 * Liquid glass refraction (the lens at the edge of Apple's Liquid Glass). Every element marked
 * [data-lens] gets its own SVG filter: a displacement map shaped like the element's rounded rectangle,
 * flat in the middle and bending toward the rim, so whatever passes behind the glass curves at its
 * edges. The map is drawn once per size on a canvas; the filter then blurs a little, displaces and
 * lifts saturation, all as the element's backdrop-filter.
 *
 * Only Chromium renders an SVG filter as a backdrop-filter, so other browsers (and readers who ask for
 * reduced transparency) keep the plain glass from liquid-glass.css: a light blur and saturation, no bending.
 */

/** Max bend at the rim, in px, and how far in from the rim the bend reaches. */
const BEND = 26;
const RIM = 22;

const isChromium = () => /Chrome\/\d+/.test(navigator.userAgent);

/** The displacement map for a w x h box with corner radius r: red and green carry x and y (128 = none). */
function lensMap(w: number, h: number, r: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const rim = Math.max(4, Math.min(RIM, r * 0.9, Math.min(w, h) / 2));
  const hw = w / 2;
  const hh = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
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
      const i = (y * w + x) * 4;
      d[i] = Math.round(128 + dx * 127);
      d[i + 1] = Math.round(128 + dy * 127);
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

const NS = "http://www.w3.org/2000/svg";

export function LiquidLens() {
  useEffect(() => {
    if (!isChromium()) return;
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
    const seen = new Map<HTMLElement, { id: string; key: string }>();
    const ro = new ResizeObserver((entries) => entries.forEach((e) => apply(e.target as HTMLElement)));

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
          if (rec) rec.key = "";
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
        `<feImage href="${lensMap(w, h, Math.max(r, 2))}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>` +
        `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="soft"/>` +
        `<feDisplacementMap in="soft" in2="map" scale="${Math.min(BEND * 2, h * 0.9)}" xChannelSelector="R" yChannelSelector="G" result="bent"/>` +
        `<feColorMatrix in="bent" type="saturate" values="1.7"/>`;
      defs.appendChild(f);
      el.style.backdropFilter = `url(#${rec.id})`;
      el.setAttribute("data-lens-on", "");
    }

    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-lens]").forEach((el) => {
        if (seen.has(el)) return;
        apply(el);
        ro.observe(el);
      });
    };
    scan();
    // Chrome that mounts later (the floating CTA, a menu) is picked up on the next scans.
    const ids = [600, 2000, 5000].map((ms) => window.setTimeout(scan, ms));
    // At most one scan per frame, however busy the page's DOM is.
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(() => ((queued = 0), scan()));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      ids.forEach(clearTimeout);
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
