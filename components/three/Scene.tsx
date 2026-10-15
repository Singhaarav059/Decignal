"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { easing } from "maath";
import { CHAPTERS, blendAt, onSelect, setSceneReady, smoothstep, store, subscribe } from "@/lib/story";
import { bgAt, makeShot, shotAt } from "@/lib/scene";
import { Cards, Islands } from "./Actors";
import { IndustriesRoad } from "./actors/industries";
import { COLORS } from "./palette";
import { KeyLight, Studio } from "./Studio";
import { SystemNetwork } from "./SystemNetwork";
import { canvasQuality, portraitWide, tallTouch } from "@/lib/device";
import { markSceneReady } from "@/lib/chrome";
import { onJumpCut } from "@/lib/jump";
import { isTouch, probeGl } from "@/lib/pace";
import { Pacer } from "./Pacer";
import { SceneBoundary } from "./SceneBoundary";
import { FinalMark } from "./actors/mark";
import { ShadowFloor, ShadowGate } from "./Shadows";
import { FrameGate, lastDraw } from "./FrameGate";
import { Governor, useGovernedDpr } from "./Governor";
import { heroHandoff } from "@/lib/hero-video";
import { Sliced, drained, yieldTask } from "./slices";
import { whenStill } from "@/lib/idle";
import { DX, DY, DZ, FOV, box, cardSeen, frameShot, framed, heightsAt, measurePage, measurePanel, readCardHeights, setHeldNow, setTall, type Framed } from "@/lib/framing";


/** Camera distance in use, for the fog. */
let camDist = 20;

function Rig() {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3());
  const goal = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }), []);
  const ready = useRef(false);
  const lean = useRef(0);
  const reduced = useRef(false);
  const lastI = useRef(-1);
  // Frames left to place the camera exactly on its goal after the page moved at once (a veil cut).
  const snap = useRef(0);
  const shots = useMemo(() => [makeShot(), makeShot()], []);
  const fr = useMemo(() => [framed(), framed(), framed(), framed()], []);
  useEffect(() => onJumpCut(() => (snap.current = 3)), []);
  // The panel's height (phones) once its content for the opened system has rendered.
  useEffect(() => onSelect(() => window.setTimeout(measurePanel, 60)), []);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => (reduced.current = m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  // The page's headlines and nav, measured on resize and while fonts settle; never per frame.
  useEffect(() => {
    measurePage();
    const ids = [300, 1200, 2500, 4500].map((ms) => window.setTimeout(measurePage, ms));
    document.fonts?.ready.then(measurePage);
    return () => ids.forEach(clearTimeout);
  }, [size.width, size.height]);

  useFrame((_, dt) => {
    const { i, j, local, e } = blendAt(store.g);
    const vw = size.width;
    const vh = size.height;
    const portrait = portraitWide(vw, vh);
    const tall = tallTouch(vw, vh);
    setTall(tall);
    const now = performance.now();
    if (now - heightsAt > 300) readCardHeights(now);
    setHeldNow(e < 0.02 ? i : -1);
    // Remember where the card sits while a chapter holds.
    if (e < 0.02 && store.cardRect) {
      const r = store.cardRect;
      const seen = (cardSeen[i] ??= box());
      seen.x0 = r.x;
      seen.y0 = r.y;
      seen.x1 = r.x + r.w;
      seen.y1 = r.y + r.h;
    }
    const still = reduced.current;
    // Reduced motion: the camera cuts at the midpoint and settles.
    const k = still ? (e < 0.5 ? 0 : 1) : e;
    lean.current = THREE.MathUtils.damp(lean.current, store.selected >= 0 ? 1 : 0, 3.2, Math.min(dt, 1 / 30));
    const a = shotAt(i, local, portrait, shots[0]);
    frameShot(a, i, vw, vh, false, fr[0]);
    let A = fr[0];
    if (lean.current > 0.001) {
      // An opened system docks a panel: the world slides into the space between card and panel.
      frameShot(a, i, vw, vh, true, fr[2]);
      A = mix(fr[0], fr[2], lean.current, fr[0]);
    }
    let F = A;
    if (k > 0 && j !== i) {
      const b = shotAt(j, 0, portrait, shots[1]);
      frameShot(b, j, vw, vh, false, fr[1]);
      // Pulling back to a bigger subject, the camera leads, so the next scene assembles in its own
      // frame; pushing in on a smaller one, it holds back while the scene folds into it (partly, so
      // the push itself never rushes).
      const r = Math.log(fr[1].d / A.d);
      const w = b.steady ? 0 : Math.min(Math.abs(r) / Math.LN2, 1) * (r > 0 ? 1 : 0.6);
      const kc = still ? k : k + ((r > 0 ? smoothstep(0, 0.7, k) : smoothstep(0.3, 1, k)) - k) * w;
      F = mix(A, fr[1], kc, fr[3]);
    }
    // One angle throughout: only the target and the distance move, so every hand-off is a dolly and a pan.
    camDist = F.d;
    goal.t.set(F.x, F.y, F.z);
    goal.p.set(F.x + DX * F.d, F.y + DY * F.d, F.z + DZ * F.d);
    // A few centimetres of parallax: confirms the space is real, nothing more.
    goal.p.x += store.pointer.x * 0.16;
    goal.p.y += store.pointer.y * 0.09;

    const delta = Math.min(dt, 1 / 30);
    const side = e < 0.5 ? i : i + 1;
    const cut = still && side !== lastI.current;
    lastI.current = side;
    if (!ready.current || cut || snap.current > 0) {
      camera.position.copy(goal.p);
      look.current.copy(goal.t);
      ready.current = true;
      snap.current = Math.max(snap.current - 1, 0);
    }
    const velK = Math.min(1, Math.abs(store.velocity) / 22);
    const dampTime = still ? 0.05 : THREE.MathUtils.lerp(0.16, 0.06, velK);
    easing.damp3(camera.position, goal.p, dampTime, delta);
    easing.damp3(look.current, goal.t, dampTime, delta);
    camera.lookAt(look.current);
    store.camK = F.d / Math.max(a.dist, 0.001);
  });
  return null;
}

/** Blends two framings; the distance blends in log space so a dolly reads at an even pace. */
function mix(a: Framed, b: Framed, k: number, out: Framed) {
  out.x = a.x + (b.x - a.x) * k;
  out.y = a.y + (b.y - a.y) * k;
  out.z = a.z + (b.z - a.z) * k;
  out.d = Math.exp(Math.log(a.d) + (Math.log(b.d) - Math.log(a.d)) * k);
  return out;
}

/** Fog in the page's sky colour, so distant objects melt into the page. */
function Atmosphere() {
  const { scene } = useThree();
  const fog = useMemo(() => new THREE.Fog(COLORS.bg, 18, 42), []);
  useEffect(() => {
    scene.fog = fog;
  }, [scene, fog]);
  const sky = useRef("");
  useFrame(() => {
    // The fog travels with the camera: the subject is always clear, the far ground melts away.
    fog.near = camDist + 3;
    fog.far = camDist * 2.3 + 10;
    // ...and takes the chapter's sky colour (components/Backdrop.tsx paints the page the same).
    const [r, g, b] = bgAt(store.g);
    const key = `${r},${g},${b}`;
    if (key !== sky.current) {
      sky.current = key;
      fog.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
    }
  });
  return null;
}

/** The story's actors, mounted one per commit after the threads and network, in the order the story
 *  meets them (the hero's islands first). Rendered at once they were one 1-2 s task on a phone (every building, person and merged
 *  part built in a single synchronous pass); each is now its own low-priority render, which React
 *  splits into short slices, and its own commit. Nothing draws until all are in and warm. */
const ACTORS = [Islands, Cards, IndustriesRoad, FinalMark];
/** The longest an actor waits for a pause in the scroll before it builds anyway (ms). */
const MOUNT_LATEST = 3000;
/** The warm-up's uploads wait for the scroll to rest this long (ms), and at most WARM_WAIT each. */
const WARM_QUIET = 400;
const WARM_WAIT = 1500;

/**
 * Resolves once a touch screen's scroll has rested WARM_QUIET (or after WARM_WAIT). The uploads draw
 * each piece and its shadow map: on a phone that GPU work shares one process with the page's own
 * frames, and a swipe in the first seconds stuttered under it.
 */
async function scrollRest() {
  if (!isTouch()) return;
  const t0 = performance.now();
  while (performance.now() - store.scrollAt < WARM_QUIET && performance.now() - t0 < WARM_WAIT) {
    await new Promise((r) => window.setTimeout(r, WARM_QUIET - (performance.now() - store.scrollAt) + 10));
  }
}

function World() {
  const [n, setN] = useState(0);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    // Each actor's programs are requested as soon as it is in, so the browser links them while the
    // next one builds.
    if (n > 0) void requestPrograms(gl, scene, camera);
    if (n > ACTORS.length + 1) return;
    // A transition: React renders it in its own short tasks, so the page gets its turn between them.
    // Each at a pause in the scroll (never later than MOUNT_LATEST): building an actor mid-swipe was a
    // phone's heaviest moment of the first seconds.
    return whenStill(() => startTransition(() => setN(n + 1)), MOUNT_LATEST);
  }, [n, gl, scene, camera]);
  return (
    <Sliced value={true}>
      <Hold />
      <Studio />
      <Atmosphere />
      <KeyLight />
      <Suspense fallback={null}>
        {ACTORS.slice(0, Math.max(0, n - 1)).map((Actor, k) => (
          <Actor key={k} />
        ))}
        {n > ACTORS.length + 1 && <Warmup />}
      </Suspense>
      {n > 0 && (
        <>
          <SystemNetwork />
        </>
      )}
      <ShadowFloor color={COLORS.shadow} opacity={0.16} />
      <Rig />
      <ShadowGate />
      <FrameGate />
      <Pause />
    </Sliced>
  );
}

/** Nothing draws while the actors mount and warm (each early frame linked programs on the spot);
 *  Warmup starts the loop. Touch screens stay on "never": their Pacer holds while warming. */
function Hold() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useLayoutEffect(() => {
    if (loop.warming) setFrameloop("never");
  }, [setFrameloop]);
  return null;
}

/** Whether rendering is held: by the warm-up, or because the story is out of sight. */
const loop = { warming: true, hidden: false };
/** The story draws nothing while it warms up or is out of sight (the phone Pacer's hold). */
const storyPaused = () => loop.hidden || loop.warming || store.after > 0.02 || store.g >= CHAPTERS.length - 0.01;

/**
 * Mounted last inside the Suspense, once every model exists. Compiles every shader in the story
 * (hidden chapters included) off the main thread where the browser can (KHR_parallel_shader_compile)
 * while the loader is up and nothing renders, then uploads geometry and textures, then draws a few
 * frames and tells the loader the scene is ready.
 */
function Warmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const clock = useThree((s) => s.clock);
  const frames = useRef(-1);
  useEffect(() => {
    let live = true;
    loop.warming = true;
    // Switching the loop restarts the scene clock from 0: carry the time on, as Pause does.
    // Touch screens stay on "never" throughout: their Pacer draws, and holds while warming or hidden.
    const paced = isTouch();
    const run = (on: boolean) => {
      const t = clock.elapsedTime;
      setFrameloop(on && !paced ? "always" : "never");
      clock.elapsedTime = t;
    };
    run(false);
    const done = () => {
      loop.warming = false;
      frames.current = 0;
      // The hero's film is showing: carry on from its frame, on its clock (lib/hero-video.ts).
      const t = heroHandoff();
      if (t !== null) clock.elapsedTime = t;
      run(!loop.hidden);
      // Out of sight (a restored scroll below the story): nothing will draw, so it is ready now.
      if (loop.hidden) ready();
    };
    const warm = async () => {
      // Bake merges and far bodies first: they are part of what gets uploaded.
      await drained();
      // Programs for anything not requested yet, then wait for the links (capped, as before).
      await requestPrograms(gl, scene, camera);
      if (!live) return;
      await Promise.race([Promise.all(linking), new Promise((r) => window.setTimeout(r, 2500))]).catch(() => {});
      if (!live) return;
      const roots = pieces(scene.children);
      // Uploads, and the shadow programs compile() does not build: piece by piece, one task each.
      try {
        await upload(gl, scene, camera, roots, () => live);
      } catch {
        // A lost context: the frames below redraw what they can.
      }
      if (live) done();
    };
    void warm();
    return () => {
      live = false;
    };
  }, [gl, scene, camera, setFrameloop, clock]);
  useFrame(() => {
    if (frames.current < 0) return;
    if (++frames.current === 3) ready();
  });
  return null;
}

/** A subtree never drawn on this screen (userData.noWarm, the Scale glass on a phone) stays hidden, as
 *  Warm.tsx leaves it: compiling it would link programs for nothing. */
const noWarm = (o: THREE.Object3D | null) => {
  for (let x = o; x; x = x.parent) if (x.userData.noWarm) return true;
  return false;
};
/** Top-level branches whose programs have been requested, and the links under way. */
const asked = new WeakSet<THREE.Object3D>();
const linking: Promise<unknown>[] = [];
let requesting: Promise<void> = Promise.resolve();

/**
 * Requests the programs of every top-level branch not asked for yet, a few pieces per task. The
 * browser compiles and links them off the main thread where it can (KHR_parallel_shader_compile); in
 * one call, building every program's source took a single long task.
 */
function requestPrograms(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  requesting = requesting.then(async () => {
    const fresh = scene.children.filter((c) => !asked.has(c));
    fresh.forEach((c) => asked.add(c));
    const roots = pieces(fresh);
    for (let k = 0; k < roots.length; ) {
      await yieldTask();
      const end = performance.now() + 8;
      do {
        const r = roots[k++];
        const hidden: THREE.Object3D[] = [];
        r.traverse((o) => {
          if (!o.visible && !noWarm(o)) {
            hidden.push(o);
            o.visible = true;
          }
        });
        try {
          linking.push(gl.compileAsync(r, camera, scene).catch(() => {}));
        } catch {
          // compileAsync is missing or failed: the uploads compile synchronously instead.
        } finally {
          // Programs are built from this synchronous pass: hidden objects go back before any frame draws.
          for (const o of hidden) o.visible = false;
        }
      } while (k < roots.length && performance.now() < end);
    }
  });
  return requesting;
}

/** Meshes per piece of warm-up work: small enough that one piece's programs or uploads fit a short task. */
const PIECE = 24;
const drawable = (o: THREE.Object3D) => {
  const d = o as THREE.Mesh & { isPoints?: boolean; isLine?: boolean; isSprite?: boolean };
  return !!(d.isMesh || d.isPoints || d.isLine || d.isSprite);
};

/** Branches cut into subtrees of at most PIECE drawables (a drawable with children stays whole). */
function pieces(branches: THREE.Object3D[]) {
  const count = new Map<THREE.Object3D, number>();
  const tally = (o: THREE.Object3D): number => {
    let n = drawable(o) ? 1 : 0;
    for (const c of o.children) n += tally(c);
    count.set(o, n);
    return n;
  };
  branches.forEach(tally);
  const out: THREE.Object3D[] = [];
  const split = (o: THREE.Object3D) => {
    const n = count.get(o) ?? 0;
    if (n === 0) return;
    if (n <= PIECE || drawable(o)) out.push(o);
    else o.children.forEach(split);
  };
  branches.forEach(split);
  return out;
}

const SOLO = 31;
const NOOP = () => {};
const SCISSOR = new THREE.Vector4();

/**
 * What prewarm (Warm.tsx) does in one go, a piece per task: each piece, hidden and off-camera parts
 * included, is drawn alone (a spare layer) by the scene's lights into one pixel of the canvas, which
 * uploads its geometry and textures and builds its shadow programs. Nothing has been drawn yet, so the
 * canvas shows nothing either way. Then one whole frame.
 */
async function upload(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, roots: THREE.Object3D[], live: () => boolean) {
  const lights: THREE.Object3D[] = [];
  scene.traverse((o) => (o as THREE.Light).isLight && lights.push(o));
  const mask = camera.layers.mask;
  const previous = gl.getRenderTarget();
  // Nothing moves while the world warms: one matrix walk serves every piece's draw.
  scene.updateMatrixWorld();
  const auto = scene.matrixWorldAutoUpdate;
  // ShadowGate's per-render check walks the whole scene; each piece asks for its shadow map itself.
  const before = scene.onBeforeRender;
  const top = (o: THREE.Object3D) => {
    let t = o;
    while (t.parent && t.parent !== scene) t = t.parent;
    return t;
  };
  for (let k = 0; k < roots.length; ) {
    await scrollRest();
    await yieldTask();
    if (!live()) return;
    const end = performance.now() + 8;
    const scissorTest = gl.getScissorTest();
    gl.getScissor(SCISSOR);
    lights.forEach((l) => l.layers.enable(SOLO));
    camera.layers.set(SOLO);
    scene.matrixWorldAutoUpdate = false;
    scene.onBeforeRender = NOOP;
    // The other branches are left out of the walk altogether (lights stay in).
    const asleep: THREE.Object3D[] = [];
    const branch = top(roots[k]);
    for (const c of scene.children) {
      if (c !== branch && c.visible && !lights.includes(c)) {
        asleep.push(c);
        c.visible = false;
      }
    }
    try {
      do {
        const r = roots[k++];
        let off = false;
        const shown: THREE.Object3D[] = [];
        // Its ancestors as well: a chapter's hidden group would keep it from drawing.
        for (let p: THREE.Object3D | null = r; p; p = p.parent) if (p.userData.noWarm) off = true;
        if (off) continue;
        for (let p = r.parent; p; p = p.parent) {
          if (!p.visible) {
            shown.push(p);
            p.visible = true;
          }
        }
        const culled: THREE.Object3D[] = [];
        const solo: THREE.Object3D[] = [];
        const visit = (o: THREE.Object3D) => {
          // Never drawn on this screen (userData.noWarm), or merged away by a Bake: left as it is.
          if (o.userData.noWarm) return;
          if (!o.visible && !o.userData.bakedAway) {
            shown.push(o);
            o.visible = true;
          }
          if (o.frustumCulled) {
            culled.push(o);
            o.frustumCulled = false;
          }
          o.layers.enable(SOLO);
          solo.push(o);
          for (const c of o.children) visit(c);
        };
        visit(r);
        gl.setRenderTarget(null);
        gl.setScissorTest(true);
        gl.setScissor(0, 0, 1, 1);
        gl.shadowMap.needsUpdate = true;
        gl.render(scene, camera);
        solo.forEach((o) => o.layers.disable(SOLO));
        shown.forEach((o) => (o.visible = false));
        culled.forEach((o) => (o.frustumCulled = true));
      } while (k < roots.length && top(roots[k]) === branch && performance.now() < end);
    } finally {
      asleep.forEach((c) => (c.visible = true));
      scene.matrixWorldAutoUpdate = auto;
      scene.onBeforeRender = before;
      camera.layers.mask = mask;
      lights.forEach((l) => l.layers.disable(SOLO));
      gl.setScissor(SCISSOR);
      gl.setScissorTest(scissorTest);
    }
  }
  await yieldTask();
  if (!live()) return;
  // The shadow map as the view sees it, and one whole frame.
  gl.shadowMap.needsUpdate = true;
  gl.render(scene, camera);
  gl.setRenderTarget(previous);
}

let readySent = false;
function ready() {
  if (readySent) return;
  readySent = true;
  setSceneReady(true);
  markSceneReady();
}

/** Stops rendering while the story is out of sight: scrolled past its end, or the canvas faded out. */
function Pause() {
  const gl = useThree((s) => s.gl);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const clock = useThree((s) => s.clock);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __frameloop: () => (loop.hidden || loop.warming ? "never" : "always") });
    // The page fades the canvas through an inline opacity on one of its wrappers.
    let wrap: HTMLElement | null = gl.domElement.parentElement;
    while (wrap && wrap !== document.body && !wrap.style.opacity) wrap = wrap.parentElement;
    const faded = () => {
      if (!wrap || wrap === document.body) {
        wrap = gl.domElement.parentElement;
        while (wrap && wrap !== document.body && !wrap.style.opacity) wrap = wrap.parentElement;
      }
      return !!wrap && wrap !== document.body && wrap.style.opacity !== "" && Number(wrap.style.opacity) < 0.01;
    };
    let elapsed = 0;
    const paced = isTouch();
    // Once the page below covers the whole screen, the canvas leaves the compositor too: still shown, its
    // full-screen layer was composited under the explorer on every frame though nothing of it could be seen.
    const canvas = gl.domElement;
    return subscribe((g) => {
      const covered = store.after > 0.999;
      if (canvas.style.visibility !== (covered ? "hidden" : "")) canvas.style.visibility = covered ? "hidden" : "";
      // Resume as soon as anything shows (opacity above 0), never at the midpoint of a fade.
      const off = g >= CHAPTERS.length - 0.01 || store.after > 0.02 || faded();
      if (off === loop.hidden) return;
      loop.hidden = off;
      if (loop.warming) return;
      if (off) elapsed = clock.elapsedTime;
      setFrameloop(off ? "never" : (paced ? "never" : "always"));
      // Restarting the loop resets the clock to 0, which replayed every entrance (the islands
      // vanished and rose again on the way back up). Carry the time on from where it paused.
      if (!off) clock.elapsedTime = elapsed;
    });
  }, [gl, setFrameloop, clock]);
  return null;
}

/** No WebGL, or a canvas that fails to start: the chapter's flat drawing (ChapterArt, live) stands in,
 *  and the loader is told at once instead of waiting for its cap. A boundary the page puts round
 *  <Scene /> as well passes through, so there is only ever one. */
export default function Scene() {
  return (
    <SceneBoundary story label="Six business systems feeding one decision">
      <World3D />
    </SceneBoundary>
  );
}

function World3D() {
  const q = useMemo(() => canvasQuality(), []);
  // Touch screens draw on the phone budget (Pacer, lib/pace.ts).
  const paced = useMemo(() => isTouch(), []);
  // A weak device's density follows its frame time (Governor); a capable one keeps q.dpr.
  const { dpr, govern } = useGovernedDpr(q.dpr);
  // Held, so a density change re-renders the canvas and not the whole world inside it.
  const world = useMemo(() => <World />, []);
  return (
    <Canvas
      frameloop={paced ? "never" : "always"}
      shadows="percentage"
      // Up to 2x with MSAA on every screen (lib/device.ts): smooth edges at a density a phone's GPU
      // can hold at full frame rate.
      dpr={dpr}
      // Layout size, not the on-screen rect: the intro scales the stage (1.04) while the canvas mounts,
      // and a measured rect would keep that size after the intro (the framing then ran 4% off).
      resize={{ offsetSize: true }}
      camera={{ fov: FOV, near: 0.1, far: 120, position: [0, 7, 15] }}
      // The world reads the pointer from the window (store.pointer, manual raycasts), so the canvas
      // never takes a hit: the hero's tag and buttons behind it stay clickable (R3F defaults to auto).
      style={{ pointerEvents: "none" }}
      gl={{ antialias: q.antialias, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl, scene, camera, clock }) => {
        // three checks each program's link status and log as it is first used: a synchronous wait on
        // the GPU that undid the parallel compile (a tenth of a second of a phone's first swipe).
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
        if (process.env.NODE_ENV !== "production") Object.assign(window, { __three: { gl, scene, camera, clock }, __story: store });
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 0.95;
        gl.setClearColor(0x000000, 0);
        probeGl("story", gl);
      }}
    >
      {world}
      {paced && <Pacer paused={storyPaused} drawnAt={lastDraw} />}
      {govern && <Governor at={dpr} set={govern} />}
    </Canvas>
  );
}
