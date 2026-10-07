// Deep links between the nav previews and the sections they point at. Each section listens for
// its own event and does the scrolling, since only it knows where its pinned parts land.

const send = (name: string, detail: number) => window.dispatchEvent(new CustomEvent(name, { detail }));
const listen = (name: string, fn: (i: number) => void) => {
  const on = (e: Event) => fn((e as CustomEvent<number>).detail);
  window.addEventListener(name, on);
  return () => window.removeEventListener(name, on);
};

/** Open one outcome case in the Outcomes board. */
export const showOutcome = (i: number) => send("outcome-jump", i);
export const onOutcome = (fn: (i: number) => void) => listen("outcome-jump", fn);

/** Walk the How it works roadmap to one step. */
export const showStep = (i: number) => send("step-jump", i);
export const onStep = (fn: (i: number) => void) => listen("step-jump", fn);

/** Open one question in the FAQ. */
export const showQuestion = (i: number) => send("faq-jump", i);
export const onQuestion = (fn: (i: number) => void) => listen("faq-jump", fn);
