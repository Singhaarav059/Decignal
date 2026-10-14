// `?live3d`: the story's live 3D on any screen, phones included, drawn every frame (no stills). The
// phone-stills bake (scripts/bake-phone-stills.mjs) renders through it, and it is the A/B against the
// stills on a real phone. It exposes what the bake reads and sets on window.__live3d.
import { CH, STOPS, select, setPinHint, store } from "./story";
import { pacing, paceTarget, probe } from "./pace";
import { bandOf } from "./stills";

export function exposeLive3d() {
  // Every frame drawn, so a hold settles completely (labels open, eases done) before it is captured.
  probe.still = false;
  // The bake draws at its own density (the canvas otherwise caps at 2x).
  const dpr = (n: number) => probe.dprSetters.forEach((set) => set(n));
  Object.assign(window, { __live3d: { store, select, setPinHint, pacing, paceTarget, bandOf, dpr, STOPS, CH } });
}
