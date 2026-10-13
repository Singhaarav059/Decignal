// Where the application explorer is, for the chrome outside it (the chapter rail nests one sub-dot
// per application while the explorer is pinned). ApplicationExplorer is the only writer. A rail item
// moves the explorer with goToApplication(i); the explorer listens and does the scrolling, since only
// it knows where each application's chapter sits.

import { useSyncExternalStore } from "react";
import { APPLICATIONS } from "./content";
import { showApplication } from "./jump";

/** Short chapter names, by APPLICATIONS index (the full names are APPLICATIONS[i].name). */
export const APPLICATION_SHORT = ["Inventory", "Demand", "Production", "Maintenance", "Supply risk", "Sales", "Service", "Finance"] as const;

export type ExplorerState = {
  /** The explorer's stage fills the viewport. */
  on: boolean;
  /** Position in `apps` of the application on screen. */
  index: number;
  /** Its stage: 0 signal, 1 evidence, 2 action. */
  step: number;
  /** APPLICATIONS indices the explorer shows, in order (all eight on the home page). */
  apps: readonly number[];
};

const INITIAL: ExplorerState = { on: false, index: 0, step: 0, apps: [] };
let state = INITIAL;
const listeners = new Set<() => void>();

/** Fired on window whenever the state changes; detail is the new state. */
export const EXPLORER_CHANGE = "explorer-change";

export const getExplorer = () => state;

export function subscribeExplorer(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Reads one value. The selector must return a primitive (or a stable value such as `apps`). */
export function useExplorer<T>(select: (s: ExplorerState) => T): T {
  return useSyncExternalStore(
    subscribeExplorer,
    () => select(state),
    () => select(INITIAL),
  );
}

/** The explorer reports where it is. Notifies only on change. */
export function setExplorer(patch: Partial<ExplorerState>) {
  let changed = false;
  for (const k in patch) {
    const key = k as keyof ExplorerState;
    if (patch[key] !== state[key]) changed = true;
  }
  if (!changed) return;
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
  window.dispatchEvent(new CustomEvent(EXPLORER_CHANGE, { detail: state }));
}

/** Names for a rail or a menu: one entry per application the explorer shows. */
export function explorerItems(apps: readonly number[] = state.apps) {
  return apps.map((i, n) => ({ n, app: i, short: APPLICATION_SHORT[i], name: APPLICATIONS[i].name, category: APPLICATIONS[i].category }));
}

/** Takes the explorer to its n-th application (a position in `apps`), at the evidence stage. */
export function goToApplication(n: number) {
  const app = state.apps[n];
  if (app !== undefined) showApplication(app);
}
