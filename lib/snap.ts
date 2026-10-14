// Touch screens rest on the story's holds (story.css, lib/story.ts STOPS). Chrome lets a hard fling
// carry past stops, even ones marked scroll-snap-stop: always, so a strong swipe could skip a whole
// chapter (Control went by unseen). Each time the page comes to rest, only the stops near the reader
// are live (the rest get data-off): every beat of the chapter on screen, the last one of the chapter before and the first one
// of the next. A gentle swipe still lands on the next beat, a hard one runs through the chapter's
// beats, and no swipe leaves a chapter unseen.
//
// Chrome lands a drag that ends without a fling on the NEAREST stop, so a slow drag shorter than half
// the gap sprang back to the stop it left (the last hold to the page after the story is 1.4 screens:
// any slow drag under 70% of the screen stayed there for good). A drag past STEER of the screen now
// aims, as iOS does: from the moment it passes that, only the next stop in its direction is live, so
// the browser's own snap carries it there, one stop per swipe, with no second move of ours to fight
// it. A shorter drag keeps the stops as they were and may settle back where it began.

const TOUCH = "(pointer: coarse) and (hover: none)";
/** The share of the screen a drag must travel before it aims at the next stop. */
const STEER = 0.12;

let armed: (() => void) | null = null;
/** Re-reads the live stops, after SmoothScroll has moved them (a story trigger refresh). */
export const rearmSnap = () => armed?.();

/** Starts the guard; returns its cleanup. Mounted once per page by SmoothScroll (story pages only). */
export function startSnap(storyEl: HTMLElement) {
  if (!window.matchMedia(TOUCH).matches) return () => {};
  const stops = [...storyEl.querySelectorAll<HTMLElement>(".story-stop")];
  if (!stops.length) return () => {};
  const ch = stops.map((el) => Math.floor(Number(el.dataset.g)));
  const first = (i: number) => i === 0 || ch[i - 1] !== ch[i];
  const last = (i: number) => i === stops.length - 1 || ch[i + 1] !== ch[i];

  // The scroll range the next rest must fall in: from the chapter before's last stop to the next one's
  // first. Chrome's snap alone did not hold it: a very fast fling sometimes ran past every live stop
  // to the top of the page. A scroll past either end is held there, which ends the fling on that stop;
  // the story's layers are fixed, so the hold itself is never seen.
  let lo = -Infinity;
  let hi = Infinity;
  // The aimed drag: the stop it is carried to (null: none, the stops near the reader are live).
  let aim: HTMLElement | null = null;
  let touching = false;
  let c = 0;
  const arm = () => {
    // Mid-drag (a story refresh) the chapter stays the one the drag began in.
    if (!touching) {
      aim = null;
      const top = storyEl.getBoundingClientRect().top + window.scrollY;
      const y = window.scrollY;
      let n = 0;
      for (let i = 1; i < stops.length; i++) {
        if (Math.abs(top + stops[i].offsetTop - y) < Math.abs(top + stops[n].offsetTop - y)) n = i;
      }
      c = ch[n];
    }
    paint();
  };
  const paint = () => {
    const top = storyEl.getBoundingClientRect().top + window.scrollY;
    // The page after the story is a stop too (its top edge, story.css): live only from the last chapter,
    // or a fling from mid-story could land there.
    const end = c >= ch[ch.length - 1];
    document.querySelectorAll<HTMLElement>(".editorial, .page-foot").forEach((el) => {
      const on = aim ? el === aim : end;
      if (on === el.hasAttribute("data-off")) el.toggleAttribute("data-off", !on);
    });
    lo = 0;
    hi = end ? Infinity : document.documentElement.scrollHeight;
    stops.forEach((el, i) => {
      const near = ch[i] === c || (ch[i] === c + 1 && first(i)) || (ch[i] === c - 1 && last(i));
      const on = aim ? el === aim : near;
      if (on === el.hasAttribute("data-off")) el.toggleAttribute("data-off", !on);
      if (ch[i] === c - 1 && last(i)) lo = top + el.offsetTop;
      if (ch[i] === c + 1 && first(i)) hi = top + el.offsetTop;
    });
  };

  const hold = () => {
    // Jumps move the page on purpose (html[data-jump]); so does the page after the story.
    // A landed jump ("rest") is the reader's page again: the guard holds from its first swipe.
    const jump = document.documentElement.dataset.jump;
    if (jump && jump !== "rest") return;
    const y = window.scrollY;
    if (y < lo - 1) window.scrollTo({ top: lo, behavior: "instant" });
    else if (y > hi + 1) window.scrollTo({ top: hi, behavior: "instant" });
  };

  // Re-arm only once the page has truly come to rest. A hold ends the scroll (scrollend) while the
  // fling still carries on underneath; re-arming there moved the range along with it, chapter by
  // chapter, and the fling ran to the top of the page. Any scroll or touch restarts the wait.
  // A finger on the glass holds the re-arm off until it lifts: a pause mid-drag must not re-centre the
  // live stops on wherever the drag has got to.
  let t = 0;
  const later = () => {
    clearTimeout(t);
    t = window.setTimeout(() => touching || arm(), 150);
  };
  const onScroll = () => {
    hold();
    later();
  };

  // The live stops the browser can land on, in page order: the holds and the page after the story.
  const targets = () => {
    const top = storyEl.getBoundingClientRect().top + window.scrollY;
    const ed = document.querySelector<HTMLElement>(".editorial");
    const list = stops.map((el) => ({ el, y: top + el.offsetTop }));
    if (ed) list.push({ el: ed, y: ed.getBoundingClientRect().top + window.scrollY });
    return list.sort((a, b) => a.y - b.y);
  };
  // Where the drag began (scrollY) and the stop it is counted from: the one the page rests on, or, when
  // a swipe comes before the last one has landed, the stop that one was carried to.
  let y0 = 0;
  let from: number | null = null;
  let dir = 0;
  const onStart = () => {
    touching = true;
    clearTimeout(t);
    y0 = window.scrollY;
    dir = 0;
    const jump = document.documentElement.dataset.jump;
    const at = jump && jump !== "rest" ? undefined : targets().find((s) => Math.abs(s.y - y0) <= 2 && !s.el.hasAttribute("data-off"));
    from = at ? at.y : aim && !(jump && jump !== "rest") ? targets().find((s) => s.el === aim)?.y ?? null : null;
  };
  const onMove = () => {
    if (from === null) return;
    const d = window.scrollY - y0;
    const next = Math.abs(d) > STEER * window.innerHeight ? Math.sign(d) : 0;
    if (next === dir) return;
    dir = next;
    const list = targets();
    // The next stop in the drag's direction, inside the chapter guard's range; a short drag (or one back
    // under the mark) leaves the stops as they were.
    const to = dir > 0 ? list.find((s) => s.y > from! + 2) : dir < 0 ? list.findLast((s) => s.y < from! - 2) : undefined;
    aim = to && to.y >= lo - 1 && to.y <= hi + 1 ? to.el : null;
    paint();
  };
  const onEnd = (e: TouchEvent) => {
    if (e.touches.length) return;
    touching = false;
    later();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("touchstart", onStart, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
  window.addEventListener("touchend", onEnd, { passive: true });
  window.addEventListener("touchcancel", onEnd, { passive: true });
  // A rotation or resize moves every stop: the old range would hold the page against stale bounds
  // until the re-arm, so it is lifted at once, and an aimed drag lets go of its stop.
  const resized = () => {
    lo = -Infinity;
    hi = Infinity;
    from = null;
    later();
  };
  window.addEventListener("resize", resized);
  armed = arm;
  arm();
  return () => {
    if (armed === arm) armed = null;
    clearTimeout(t);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("touchstart", onStart);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend", onEnd);
    window.removeEventListener("touchcancel", onEnd);
    window.removeEventListener("resize", resized);
  };
}
