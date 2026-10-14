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
    stops.forEach((el, i) => {
      const on = ch[i] === c || (ch[i] === c + 1 && first(i)) || (ch[i] === c - 1 && last(i));
      if (on === el.hasAttribute("data-off")) el.toggleAttribute("data-off", !on);
    });
  };

  // Safari before 26 has no scrollend: a short quiet after the last scroll event stands in for it.
  let t = 0;
  const onScroll = () => {
    clearTimeout(t);
    t = window.setTimeout(arm, 140);
  };
  const native = "onscrollend" in window;
  if (native) window.addEventListener("scrollend", arm);
  else window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", arm);
  armed = arm;
  arm();
  return () => {
    if (armed === arm) armed = null;
    clearTimeout(t);
    window.removeEventListener("scrollend", arm);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", arm);
  };
}
