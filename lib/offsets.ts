// Where sections sit on the page, measured once per layout change instead of on every scroll frame.
// Reading layout in a scroll handler, right after the story has written its styles, forces the browser
// to lay out the whole page again before the frame can paint.
type Box = { top: number; height: number };
const cache = new Map<Element, Box>();
let watching = false;

function watch() {
  watching = true;
  const clear = () => cache.clear();
  window.addEventListener("resize", clear);
  new ResizeObserver(clear).observe(document.body);
}

/** Top (page coordinates) and height of a static, non-sticky element. */
export function pageBox(el: Element): Box {
  if (!watching) watch();
  let box = cache.get(el);
  if (!box) {
    const r = el.getBoundingClientRect();
    box = { top: r.top + window.scrollY, height: r.height };
    cache.set(el, box);
  }
  return box;
}

/** The element's top edge relative to the viewport, from the cached page position. */
export const viewTop = (el: Element) => pageBox(el).top - window.scrollY;
