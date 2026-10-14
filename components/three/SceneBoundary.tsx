"use client";

// SceneBoundary: the page stays whole when 3D cannot run. Wrap a WebGL canvas in it. It shows the
// chapter's flat drawing (ChapterArt) in the canvas's place when the browser has no WebGL (enterprise
// policy, VDI, an old GPU), when the canvas throws while it mounts or renders, and while the GPU has
// taken the context back (a phone under memory pressure). A restored context remounts the canvas.
// It never shows on a timer: only a failed check, a caught error or a lost context bring it up.
import { Component, createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ErrorInfo, type ReactNode } from "react";
import { ChapterArt } from "@/components/ChapterArt";
import { blendAt, setSceneReady, store, subscribe } from "@/lib/story";
import { markSceneReady } from "@/lib/chrome";

let probe: boolean | null = null;

/** Whether this browser can create a WebGL context (cached; false on the server). */
function webglAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (probe !== null) return probe;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
    probe = !!gl;
    // Hand the probe's context straight back: browsers cap how many can be live at once.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    probe = false;
  }
  return probe;
}

const noop = () => () => {};
/** False only once the client has checked and found no WebGL; true on the server and while hydrating. */
function useWebgl() {
  return useSyncExternalStore(noop, webglAvailable, () => true);
}

/** The story chapter under the reader, for the drawing that stands in for the story's world. */
function useStoryChapter(on: boolean) {
  const sub = useCallback((fn: () => void) => (on ? subscribe(() => fn()) : () => {}), [on]);
  return useSyncExternalStore(
    sub,
    () => {
      if (!on) return 0;
      // The chapter the page is showing: past the blend's midpoint, the next one.
      const { i, j, e } = blendAt(store.g);
      return e > 0.5 ? j : i;
    },
    () => 0,
  );
}

class Catch extends Component<{ children: ReactNode; onError: (e: Error) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError(error);
    if (process.env.NODE_ENV !== "production") console.warn("3D disabled", error.message, info.componentStack?.split("\n")[1]?.trim());
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// The drawing is a 280 x 80 strip; here it is shown large, so it keeps its proportions.
// Transparent like the canvas it stands in for, so the layers behind it (the hero line) still show.
const FALLBACK_CSS = `.scene-fallback{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
.scene-fallback>div{width:min(72vw,max(40vmin,320px))}
.scene-fallback .chapter-art{height:auto;aspect-ratio:280/80;background:transparent}`;

type SceneBoundaryProps = {
  children: ReactNode;
  /** What the 3D shows, read out in its place when it cannot run. */
  label: string;
  /** The chapter whose drawing stands in. Omit it with `story` to follow the story's scroll. */
  chapter?: number;
  /** Follow the story: the drawing is the chapter under the reader (lib/story). */
  story?: boolean;
  /** A drawing of your own to stand in, instead of ChapterArt. */
  fallback?: ReactNode;
};

/**
 * Wrap a canvas: `<SceneBoundary story label="..."><Scene /></SceneBoundary>`. Renders the canvas when
 * it can, else a flat block in the slot's place (role img, `label`) holding the chapter's drawing.
 * The canvas's own box is untouched: the wrapper has no box of its own (display: contents).
 */
/** Set inside a boundary: a second boundary round the same canvas passes through (one fallback). */
const Inside = createContext(false);

export function SceneBoundary(props: SceneBoundaryProps) {
  return useContext(Inside) ? <>{props.children}</> : <Boundary {...props} />;
}

function Boundary({ children, label, chapter, story = false, fallback }: SceneBoundaryProps) {
  const webgl = useWebgl();
  const [failed, setFailed] = useState(false);
  const [lost, setLost] = useState(false);
  // Bumped when a lost context comes back, to mount a fresh canvas.
  const [mount, setMount] = useState(0);
  const live = useStoryChapter(story && chapter === undefined);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el || !webgl) return;
    // Context events fire on the canvas and do not bubble: listen in the capture phase.
    const onLost = (e: Event) => {
      // Lets the browser restore the context later (three does the same).
      e.preventDefault();
      setLost(true);
    };
    const onRestored = () => {
      setLost(false);
      setMount((n) => n + 1);
    };
    el.addEventListener("webglcontextlost", onLost, true);
    el.addEventListener("webglcontextrestored", onRestored, true);
    return () => {
      el.removeEventListener("webglcontextlost", onLost, true);
      el.removeEventListener("webglcontextrestored", onRestored, true);
    };
  }, [webgl]);

  useEffect(() => {
    if (webgl) return;
    document.documentElement.dataset.webgl = "off";
    if (process.env.NODE_ENV !== "production") console.warn("3D disabled", "no WebGL");
  }, [webgl]);

  const down = !webgl || failed || lost;
  // The loader waits for the story's first frame; with no canvas, the drawing is that frame.
  useEffect(() => {
    if (!story || (webgl && !failed)) return;
    setSceneReady(true);
    markSceneReady();
  }, [story, webgl, failed]);
  return (
    <div ref={wrap} style={{ display: "contents" }}>
      {webgl && !failed && (
        <Catch key={mount} onError={() => setFailed(true)}>
          <Inside.Provider value>{children}</Inside.Provider>
        </Catch>
      )}
      {down && (
        <div className="scene-fallback" role="img" aria-label={label}>
          <style href="scene-fallback" precedence="default">
            {FALLBACK_CSS}
          </style>
          <div>{fallback ?? <ChapterArt i={chapter ?? live} live />}</div>
        </div>
      )}
    </div>
  );
}

