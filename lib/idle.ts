// Background work that waits for the reader to stop. An idle callback alone also fires between the
// frames of a scroll, and building a 3D world there (React, geometry, shader programs) is a task of a
// fifth of a second on a phone: the scroll stuttered each time. Work queued here runs in an idle moment
// once the page has not scrolled for a short while.

/** How long the page must have been still. */
const QUIET = 350;

let lastScroll = -Infinity;
let listening = false;
const listen = () => {
  if (listening) return;
  listening = true;
  const mark = () => (lastScroll = performance.now());
  window.addEventListener("scroll", mark, { passive: true, capture: true });
  window.addEventListener("touchmove", mark, { passive: true });
  window.addEventListener("wheel", mark, { passive: true });
};

/** Runs fn in an idle moment with the page still; returns a cancel. `latest` (ms) forces it anyway. */
export function whenStill(fn: () => void, latest = Infinity) {
  listen();
  const start = performance.now();
  let idle = 0;
  let timer = 0;
  let done = false;
  const ric = typeof window.requestIdleCallback === "function";
  const attempt = () => {
    if (done) return;
    const now = performance.now();
    const wait = QUIET - (now - lastScroll);
    if (wait > 0 && now - start < latest) {
      timer = window.setTimeout(ask, wait);
      return;
    }
    done = true;
    fn();
  };
  const ask = () => {
    if (done) return;
    if (ric) idle = window.requestIdleCallback(attempt, { timeout: 1000 });
    else timer = window.setTimeout(attempt, 50);
  };
  ask();
  return () => {
    done = true;
    if (ric) window.cancelIdleCallback(idle);
    window.clearTimeout(timer);
  };
}
