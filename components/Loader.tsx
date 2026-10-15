"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { hashOffset, holdVeil, landOnHash } from "@/lib/jump";
import { LOADER } from "@/lib/copy";

const PLATES = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"];
const KEY = "decignal:intro";
/** The hero waits at most this long for its fonts before it rises, so the offer is on screen at once. */
const FONT_WAIT = 300;
/** The world fades in once its scene is ready (lib/chrome.ts); never later than this. */
const SCENE_CAP = 4000;
/** The same wait on an upright phone, whose windows already show their posters. */
const FLOW_CAP = 900;
/** Survives client navigation: the entrance plays once per visit. */
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

/**
 * Non-blocking (handoff §11: no compulsory loader). The hero's headline, offer and actions show and
 * work at once; nothing locks the scroll. While the 3D scene builds, the hero's film shows the world and
 * six small dots under it say it is still arriving; they leave when the scene has drawn
 * (html.scene-ready, infra.css). Server markup carries .loader, hidden without JavaScript and on
 * repeat visits (html.intro-seen).
 */
export function Loader() {
  const [done, setDone] = useState(false);

  // Landing on a #hash: shut the veil before the first paint, so the reader never sees the top first.
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && hashOffset() > 2) holdVeil();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    let alive = true;
    const repeat = seenBefore();
    // The entrance: html.ready lets the headline rise and the offer fade in (story.css).
    const rise = () => {
      if (!alive) return;
      html.classList.add("ready");
      remember();
    };
    if (repeat) rise();
    else Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, FONT_WAIT))]).then(rise);
    void landOnHash({ veil: true });
    // An upright phone's story windows show baked posters (PhoneFlow), so the page need not wait long
    // for the live world: it takes over each window once it has drawn.
    const cap = window.setTimeout(() => html.classList.add("scene-ready"), html.dataset.flow === "phone" ? FLOW_CAP : SCENE_CAP);
    // The dots leave with the scene's fade; unmount once it has.
    const poll = window.setInterval(() => {
      if (!html.classList.contains("scene-ready")) return;
      window.clearInterval(poll);
      window.setTimeout(() => alive && setDone(true), 700);
    }, 200);
    return () => {
      alive = false;
      clearTimeout(cap);
      clearInterval(poll);
    };
  }, []);

  // From here on the server markup stays hidden when the page comes back (client navigation).
  useEffect(() => {
    if (done) document.documentElement.classList.add("intro-seen");
  }, [done]);

  if (done) return null;

  return (
    <div className="loader" role="status" aria-label={LOADER.label}>
      {PLATES.map((c, i) => (
        <span key={c} className="loader-dot" style={{ background: `var(--color-${c})`, animationDelay: `${i * 110}ms` }} />
      ))}
    </div>
  );
}
