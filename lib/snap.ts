// Touch screens rest on the story's holds (story.css, lib/story.ts STOPS). Chrome lets a hard fling
// carry past stops, even ones marked scroll-snap-stop: always, so a strong swipe could skip a whole
// chapter (Control went by unseen). Each time the page comes to rest, only the stops near the reader
// are live (the rest get data-off): every beat of the chapter on screen, the last one of the chapter before and the first one
// of the next. A gentle swipe still lands on the next beat, a hard one runs through the chapter's
// beats, and no swipe leaves a chapter unseen.

const TOUCH = "(pointer: coarse) and (hover: none)";

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
  const arm = () => {
    const top = storyEl.getBoundingClientRect().top + window.scrollY;
    const y = window.scrollY;
    let n = 0;
    for (let i = 1; i < stops.length; i++) {
      if (Math.abs(top + stops[i].offsetTop - y) < Math.abs(top + stops[n].offsetTop - y)) n = i;
    }
    const c = ch[n];
    // The page after the story is a stop too (its top edge, story.css): live only from the last chapter,
    // or a fling from mid-story could land there.
    const end = c >= ch[ch.length - 1];
    document.querySelectorAll(".editorial, .page-foot").forEach((el) => {
      if (end === el.hasAttribute("data-off")) el.toggleAttribute("data-off", !end);
    });
    lo = 0;
    hi = end ? Infinity : document.documentElement.scrollHeight;
    stops.forEach((el, i) => {
      const on = ch[i] === c || (ch[i] === c + 1 && first(i)) || (ch[i] === c - 1 && last(i));
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
  let t = 0;
  const later = () => {
    clearTimeout(t);
    t = window.setTimeout(arm, 150);
  };
  const onScroll = () => {
    hold();
    later();
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("touchstart", later, { passive: true });
  // A rotation or resize moves every stop: the old range would hold the page against stale bounds
  // until the re-arm, so it is lifted at once.
  const resized = () => {
    lo = -Infinity;
    hi = Infinity;
    later();
  };
  window.addEventListener("resize", resized);
  armed = arm;
  arm();
  return () => {
    if (armed === arm) armed = null;
    clearTimeout(t);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("touchstart", later);
    window.removeEventListener("resize", resized);
  };
}
