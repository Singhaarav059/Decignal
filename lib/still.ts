// Off-screen motion holds still. The sections below the story run looping CSS drawings (the glass
// wallpaper, the bento charts, pulses), and the browser ticks every one of them each frame even far off
// screen: on a phone that re-styled and re-laid out SVG it never drew on every scroll frame. Each block
// of those sections is watched; one more than half a screen away is marked [data-still], which pauses
// its CSS animations (base.css) until it comes back. The story's fixed layers do the same once the
// story has scrolled away. The site has no SMIL: its clock could not be paused (resumed after a long
// pause, Chrome replayed every missed loop at once and froze the page), so every loop is CSS.

import { storyTrack } from "./flow";

/** The blocks watched: each section's top-level parts (a tall section holds several), and the footer's; and
 *  the looping drawings themselves, as one block can be several screens tall (the statement's head and
 *  its bento grid: at the head, the bento's charts below the fold kept restyling every frame). */
const SCOPES = ".editorial > section > *, .page-foot > footer > *, .liquid, .flow-art, .bento-art, .step-art, .area-art";

function hold(el: Element, still: boolean) {
  if (still !== el.hasAttribute("data-still")) el.toggleAttribute("data-still", still);
}

/** Starts the watch; returns its cleanup. Mounted once per page by SmoothScroll. */
export function startStill() {
  if (typeof IntersectionObserver === "undefined") return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.target.id === "story") {
          document.querySelectorAll(".story-back, .story-overlay").forEach((el) => hold(el, !e.isIntersecting));
          continue;
        }
        hold(e.target, !e.isIntersecting);
      }
    },
    { rootMargin: "50% 0px" },
  );
  const watched = new Set<Element>();
  const scan = () => {
    const found = [...document.querySelectorAll(SCOPES)];
    const story = storyTrack();
    if (story) found.push(story);
    for (const el of found) {
      if (watched.has(el)) continue;
      watched.add(el);
      io.observe(el);
    }
  };
  scan();
  // Sections that mount after the first paint (the explorer, the audit form) join on the next pass.
  const ids = [1500, 5000].map((ms) => window.setTimeout(scan, ms));
  return () => {
    ids.forEach(clearTimeout);
    io.disconnect();
    document.querySelectorAll("[data-still]").forEach((el) => hold(el, false));
  };
}
