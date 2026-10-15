"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { hashOffset, holdVeil, landOnHash, lockScroll, token } from "@/lib/jump";
import { whenSceneReady } from "@/lib/chrome";
import { LOADER } from "@/lib/copy";
import { Logo } from "./ui/Logo";

const PLATES = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"];
const KEY = "decignal:intro";
/** Shown at least this long once it starts counting, so the six systems can arrive. */
const MIN = 400;
/** Never covers the site longer than this (handoff: no blocking intro): if the scene is not ready by then, the page shows anyway. */
const CAP = 1800;
/** Survives client navigation: the intro plays once per visit. */
let played = false;

function seenBefore() {
  if (played || document.documentElement.classList.contains("intro-seen")) return true;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function remember() {
  played = true;
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {}
}

/** Six systems stack into one while the site gets ready, then the curtain lifts. The count is real
 *  progress: script running, fonts in, page loaded, first frame of the 3D scene drawn. Server markup
 *  carries .loader, which CSS hides without JavaScript and on repeat visits (html.intro-seen). */
export function Loader() {
  const [phase, setPhase] = useState<"load" | "leave" | "done">("load");
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  // A repeat visit has no curtain to hide a hash landing behind, so shut the veil before the first paint.
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const covering = !!root.current && getComputedStyle(root.current).display !== "none";
    if (!reduce && !covering && seenBefore() && hashOffset() > 2) holdVeil();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const covering = !!root.current && getComputedStyle(root.current).display !== "none";
    let alive = true;
    let raf = 0;
    let leaveTimer = 0;
    let capTimer = 0;

    // The page holds still under the curtain; released once, on lift or unmount.
    let held = false;
    const release = () => {
      if (held) lockScroll(false);
      held = false;
    };
    const finish = () => {
      html.classList.add("ready");
      // The world fades in once its scene is ready (lib/chrome.ts); never later than this, whatever
      // happened to the 3D.
      window.setTimeout(() => html.classList.add("scene-ready"), 4000);
      release();
      remember();
    };
    const lift = () => {
      finish();
      setPhase("leave");
      leaveTimer = window.setTimeout(() => setPhase("done"), token("--dur-4", 600) + 60);
    };

    // Repeat visit, or reduced motion: no intro. Land on the hash and get out of the way.
    if (seenBefore() || reduce) {
      if (covering && !reduce) {
        // No head script hid the loader: lift the curtain at once rather than popping it.
        landOnHash().then(() => alive && lift());
      } else {
        finish();
        void landOnHash({ veil: true });
        queueMicrotask(() => alive && setPhase("done"));
      }
      return () => {
        alive = false;
        clearTimeout(leaveTimer);
      };
    }

    lockScroll(true);
    held = true;
    const start = performance.now();
    // On a full load the loader has been up since the first paint; on a client navigation, since now.
    const since = document.readyState !== "complete" || start < CAP ? 0 : start;
    const capAt = Math.max(since + CAP, start + MIN);

    // Progress from real work, eased so the count rolls rather than jumps.
    let target = 10;
    let shown = 0;
    let last = start;
    let loadedAt = 0;
    const bump = (p: number) => (target = Math.max(target, p));
    const tick = (t: number) => {
      // Page loaded, scene still building: keep rolling toward 90 on the time left before the cap, so
      // the count never sits still. Only the scene (or the cap) takes it to 100.
      if (loadedAt) bump(60 + 30 * Math.min((t - loadedAt) / Math.max(capAt - loadedAt, 1), 1));
      shown += (target - shown) * (1 - Math.exp(-(t - last) / 110));
      last = t;
      if (target - shown < 0.4) shown = target;
      if (count.current) count.current.textContent = String(Math.round(shown)).padStart(3, "0");
      if (bar.current) bar.current.style.transform = `scaleX(${shown / 100})`;
      if (shown < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const fonts = document.fonts.ready.then(() => bump(40));
    const loaded =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((r) => window.addEventListener("load", () => r(), { once: true }));
    loaded.then(() => {
      bump(60);
      loadedAt = performance.now();
    });
    // The scene starts under the curtain, which covers its heaviest seconds; past the cap the hero's
    // film (HeroVideo) shows the world until the scene takes over.
    const scene = whenSceneReady().then(() => bump(100));

    let lifted = false;
    const go = async () => {
      if (lifted || !alive) return;
      lifted = true;
      clearTimeout(capTimer);
      bump(100);
      // Under the curtain, so the reader arrives already on the linked section.
      await landOnHash();
      if (alive) lift();
    };
    Promise.all([fonts, scene, new Promise((r) => setTimeout(r, MIN))]).then(go);
    capTimer = window.setTimeout(go, Math.max(capAt - performance.now(), 0));

    return () => {
      alive = false;
      release();
      cancelAnimationFrame(raf);
      clearTimeout(leaveTimer);
      clearTimeout(capTimer);
    };
  }, []);

  // From here on the server markup stays hidden when the page comes back (client navigation).
  useEffect(() => {
    if (phase === "done") document.documentElement.classList.add("intro-seen");
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div ref={root} className="loader" data-phase={phase} aria-hidden>
      <div className="loader-mark">
        {/* Six systems arrive, one by one */}
        <div className="flex gap-2.5">
          {PLATES.map((c, i) => (
            <span key={c} className="loader-dot" style={{ background: `var(--color-${c})`, animationDelay: `${i * 110}ms` }} />
          ))}
        </div>
        <Logo size={30} />
      </div>
      <div className="loader-foot">
        <p className="eyebrow max-w-[30ch]">{LOADER.positioning}</p>
        <span ref={count} className="loader-count tabular font-serif">
          000
        </span>
      </div>
      <span ref={bar} className="loader-bar" />
    </div>
  );
}
