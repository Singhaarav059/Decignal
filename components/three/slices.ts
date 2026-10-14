// Load work in slices: jobs run a few milliseconds at a time between tasks, so building the world
// (Bake merges, people's far bodies, shader requests, first uploads) never freezes the page in one
// long task. A phone's main thread had single tasks of 0.8 to 2.2 s at load.
import { createContext } from "react";

/** Inside the story's world: Bake merges and people's far bodies wait for a slice (Scene.tsx's Warmup
 *  waits for them all). Other canvases keep building them at once. */
export const Sliced = createContext(false);

const jobs: (() => void)[] = [];
let waiting: (() => void)[] = [];
let queued = false;
/** Work per slice (ms): under a frame, so input and the loader's animation keep their turn. */
const BUDGET = 8;

const channel = typeof MessageChannel !== "undefined" ? new MessageChannel() : null;
// A message posts a task at once; setTimeout(0) is clamped to 4 ms once nested.
const post = () => (channel ? channel.port2.postMessage(0) : window.setTimeout(pump, 0));
if (channel) channel.port1.onmessage = () => pump();

function pump() {
  queued = false;
  const end = performance.now() + BUDGET;
  while (jobs.length && performance.now() < end) jobs.shift()!();
  if (jobs.length) schedule();
  else {
    const w = waiting;
    waiting = [];
    w.forEach((r) => r());
  }
}

function schedule() {
  if (queued) return;
  queued = true;
  post();
}

/** Runs `job` in a later slice. */
export function slice(job: () => void) {
  jobs.push(job);
  schedule();
}

/** Resolves once every queued job has run. */
export function drained() {
  if (!jobs.length && !queued) return Promise.resolve();
  return new Promise<void>((r) => waiting.push(r));
}

/** A fresh task: the work after it starts with the page's turn in between. */
export const yieldTask = () => new Promise<void>((r) => slice(r));
