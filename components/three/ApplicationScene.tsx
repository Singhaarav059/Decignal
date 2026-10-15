"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { isTouch, probeGl } from "@/lib/pace";
import { Pacer } from "./Pacer";
import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";
import { Studio } from "./Studio";
import { COLORS } from "./palette";
import type { DemoKind } from "@/lib/application-demos";
import { Logistics, Maintenance, Production, SupplyRisk, DealerNetwork, Finance, type SceneProps } from "./OperationalScenes";
import { FLOORS, phase, type Motion } from "./SceneKit";
import { Warm } from "./Warm";
import { ShadowGate } from "./Shadows";
import { FrameGate } from "./FrameGate";
import { canvasQuality } from "@/lib/device";
import { deviceTier } from "@/lib/tier";
import { Governor, useGovernedDpr } from "./Governor";
import { whenStill } from "@/lib/idle";

/** The part of the canvas the page's copy leaves free, as insets in CSS px from each edge. */
export type Frame = { left: number; top: number; right: number; bottom: number };

type Props = SceneProps & {
  kind: DemoKind;
  active: boolean;
  /** Build only these worlds (a service page's applications). Default: all six. */
  kinds?: readonly DemoKind[];
  /** Where the subject goes: the canvas is full-bleed and the camera frames the free area. */
  frame?: RefObject<Frame>;
  /** Filled with a function that draws the current picture now and returns the canvas (a phone's
   *  flowing explorer copies a window's picture before the canvas moves on). */
  snap?: RefObject<(() => HTMLCanvasElement | null) | null>;
};

/** Registers the snapshot function (Props.snap). */
function Snap({ to }: { to: RefObject<(() => HTMLCanvasElement | null) | null> }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    to.current = () => {
      gl.render(scene, camera);
      return gl.domElement;
    };
    return () => {
      to.current = null;
    };
  }, [to, gl, scene, camera]);
  return null;
}

const NO_FRAME: Frame = { left: 0, top: 0, right: 0, bottom: 0 };

const R = new THREE.Vector3();
const U = new THREE.Vector3();
const P = new THREE.Vector3();
const B = new THREE.Box3();
/** Dev only: the last phone fit, for the review scripts (window.__appFit). */
const fitLog: Record<string, number> | null = process.env.NODE_ENV !== "production" && typeof window !== "undefined" ? ((window as unknown as { __appFit: Record<string, number> }).__appFit = {}) : null;

/**
 * The largest zoom (px per world unit) that keeps the shown world's floor whole in the free area, the
 * page gutter clear of its sides: phones frame the models tighter, and the plates ran off both edges.
 * A world without a floor (the logistics road runs off by design) is not limited.
 */
function floorFit(c: THREE.OrthographicCamera, target: THREE.Vector3, vw: number, w: number, h: number) {
  let floor: THREE.Mesh | null = null;
  for (const m of FLOORS) {
    let o: THREE.Object3D | null = m;
    while (o && o.visible) o = o.parent;
    if (!o && m.parent) {
      floor = m;
      break;
    }
  }
  if (!floor) return Infinity;
  const g = floor.geometry;
  if (!g.boundingBox) g.computeBoundingBox();
  B.copy(g.boundingBox!);
  floor.updateWorldMatrix(true, false);
  R.set(1, 0, 0).applyQuaternion(c.quaternion);
  U.set(0, 1, 0).applyQuaternion(c.quaternion);
  let ax = 0;
  let ay = 0;
  for (let k = 0; k < 8; k++) {
    P.set(k & 1 ? B.max.x : B.min.x, k & 2 ? B.max.y : B.min.y, k & 4 ? B.max.z : B.min.z).applyMatrix4(floor.matrixWorld).sub(target);
    ax = Math.max(ax, Math.abs(P.dot(R)));
    ay = Math.max(ay, Math.abs(P.dot(U)));
  }
  const gutter = THREE.MathUtils.clamp(vw * 0.05, 20, 72);
  const zx = (w / 2 - gutter) / ax;
  const zy = (h / 2 - 8) / ay;
  if (fitLog) Object.assign(fitLog, { zx, zy });
  return Math.min(zx, zy);
}

function Camera({ kind, motion, still, frame }: { kind: DemoKind; motion: Motion; still: boolean; frame?: RefObject<Frame> }) {
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const view = useRef({ x: 0, y: 0, set: false });
  useFrame((_, dt) => {
    const p = motion.current.progress;
    const f = frame?.current ?? NO_FRAME;
    const w = Math.max(120, size.width - f.left - f.right);
    const h = Math.max(120, size.height - f.top - f.bottom);
    const close = kind === "maintenance" ? 1 + phase(p, 0.15, 0.45) * 0.06 : 1;
    // Phones are width-bound: frame the working area a little tighter so the models read.
    const fit = (kind === "inventory" ? 10.3 : kind === "maintenance" ? 8.4 : 9) * (size.width < 768 ? 0.9 : 1);
    const viewHeight = kind === "risk" ? 5.8 : kind === "maintenance" ? 5.2 : kind === "finance" ? 4.2 : kind === "inventory" ? 4.6 : 5.3;
    const c = camera as THREE.OrthographicCamera;
    c.position.set(kind === "maintenance" ? 4.2 : kind === "finance" ? 0.7 : 4.6, kind === "maintenance" ? 3.6 : kind === "finance" ? 7 : 5.4, 8.5);
    target.set(kind === "maintenance" ? -0.15 : 0, kind === "maintenance" ? 0.52 : kind === "risk" ? 0.65 : 0.25, kind === "inventory" ? -0.45 : kind === "risk" ? -0.4 : kind === "finance" ? 0.45 : 0);
    c.lookAt(target);
    let zoom = Math.min(w / fit, h / viewHeight, 120) * close;
    if (size.width < 768) zoom = Math.min(zoom, floorFit(c, target, size.width, w, h));
    if (fitLog) Object.assign(fitLog, { kind: KINDS.indexOf(kind), zoom, framed: Math.min(w / fit, h / viewHeight, 120) * close });
    // Shift the projection so the scene's centre lands in the middle of the free area, clear of the copy.
    const ox = size.width / 2 - (f.left + w / 2);
    const oy = size.height / 2 - (f.top + h / 2);
    const k = Math.min(dt, 0.05);
    const snap = still || !view.current.set;
    view.current.set = true;
    view.current.x = snap ? ox : THREE.MathUtils.damp(view.current.x, ox, 6, k);
    view.current.y = snap ? oy : THREE.MathUtils.damp(view.current.y, oy, 6, k);
    c.setViewOffset(size.width, size.height, view.current.x, view.current.y, size.width, size.height);
    c.zoom = snap ? zoom : THREE.MathUtils.damp(c.zoom, zoom, 6, k);
    c.updateProjectionMatrix();
  });
  return null;
}

const KINDS: DemoKind[] = ["inventory", "sales", "maintenance", "production", "finance", "risk"];
// Memoised: a chapter or stage change re-renders the world it touches, not all six (a hidden world's
// props never change).
const MODELS: Record<DemoKind, React.ComponentType<SceneProps>> = { inventory: memo(Logistics), production: memo(Production), maintenance: memo(Maintenance), risk: memo(SupplyRisk), sales: memo(DealerNetwork), finance: memo(Finance) };
const REST = { progress: 0, edge: 0 };
/** A hidden world keeps its matrices as they were: three would otherwise walk all six every frame. */
function updateIfShown(this: THREE.Object3D, force?: boolean) {
  if (this.visible) THREE.Group.prototype.updateMatrixWorld.call(this, force);
}
/** The longest a world waits for a pause in the scroll before it builds anyway (ms). */
const BUILD_LATEST = 4000;

/**
 * Every world on the list stays built; only the current one is shown. Switching chapters then costs
 * nothing, where rebuilding a world (geometry, textures, shaders) stalled the scroll for a fifth of a
 * second. A hidden world rests at its opening pose and follows the scroll again once it is shown.
 * The world on screen is built first and shows at once; the others follow one per pause in the scroll
 * (a build mid-scroll was a long task that stuttered it on phones), each sent to the GPU as it arrives
 * and only it: re-warming every built world each time grew to a fifth of a second.
 */
function Stages(props: Props) {
  const list = props.kinds ?? KINDS;
  const [order] = useState(() => [props.kind, ...list.filter((k) => k !== props.kind)]);
  const [count, setCount] = useState(1);
  useEffect(() => {
    if (count >= order.length) return;
    // At most BUILD_LATEST into a scroll that never pauses: otherwise each world built only when its
    // section came up, and the reader met it still while it warmed.
    return whenStill(() => setCount((c) => c + 1), BUILD_LATEST);
  }, [count, order.length]);
  const built = new Set([...order.slice(0, count), props.kind]);
  const groups = useRef(new Map<DemoKind, THREE.Group>());
  const warmed = useRef(new Set<DemoKind>());
  const refs = useMemo(
    () =>
      Object.fromEntries(
        KINDS.map((k) => [
          k,
          (g: THREE.Group | null) => {
            if (!g) return void groups.current.delete(k);
            g.updateMatrixWorld = updateIfShown;
            groups.current.set(k, g);
          },
        ]),
      ) as Record<DemoKind, (g: THREE.Group | null) => void>,
    [],
  );
  // The first warm-up takes the whole scene (studio, ground, light); later ones only the worlds just built.
  const fresh = useCallback(() => {
    const first = warmed.current.size === 0;
    const roots: THREE.Object3D[] = [];
    for (const [k, g] of groups.current) {
      if (warmed.current.has(k)) continue;
      warmed.current.add(k);
      roots.push(g);
    }
    return first ? null : roots;
  }, []);
  const current = useRef(props.kind);
  useLayoutEffect(() => {
    current.current = props.kind;
  }, [props.kind]);
  const motions = useMemo(
    () => Object.fromEntries(KINDS.map((k) => [k, { get current() { return current.current === k ? props.motion.current : REST; } }])) as unknown as Record<DemoKind, Motion>,
    [props.motion],
  );
  return (
    <>
      {list.filter((k) => built.has(k)).map((k) => {
        const Model = MODELS[k];
        const on = k === props.kind;
        return (
          <group key={k} ref={refs[k]} visible={on} dispose={null}>
            <Model motion={motions[k]} step={on ? props.step : 0} still={props.still} pin={props.pin} visible={on} />
          </group>
        );
      })}
      <Warm key={built.size} roots={fresh} />
    </>
  );
}

/** The contact shadow's footprint (world units), softness, strength and reach under the models. */
const CONTACT = { scale: 14, blur: 1.8, opacity: 0.4, far: 1.5 };
/** The shadow plane's opacity alternates by this much on each refresh: far under one 8-bit step, yet
 *  enough for FrameGate to see that the picture changed and draw the new shadow. */
const NUDGE = 2e-5;
/** A world whose scroll position changed this recently (s) is being scrolled. */
const SCROLLING = 0.2;
/** A world still this long (s) has come to rest: its shadow stops following it. */
const SETTLED = 0.8;

/**
 * Contact shadows under the world (drei's ContactShadows, its passes run here so they can be paced): a
 * depth view from below, blurred twice, on a plane under the models. They follow the world while it
 * moves (scroll, a chapter or stage change) and rest once it has been still for a moment, with one
 * refresh on the stop. On a touch screen, while the page is being scrolled, they refresh on every
 * other update: the depth pass draws the whole scene a second time, and a phone's swipe moves the
 * world on every frame. They follow at full rate again as the scroll stops, so no stale shadow stays.
 */
function Ground({ kind, step, motion, active, phone, low, touch }: { kind: DemoKind; step: number; motion: Motion; active: boolean; phone: boolean; low: boolean; touch: boolean }) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const group = useRef<THREE.Group>(null);
  const plane = useRef<THREE.MeshBasicMaterial>(null);
  const cam = useRef<THREE.OrthographicCamera>(null);
  const resolution = phone ? 128 : low ? 256 : 512;
  const { scale, blur, far, opacity } = CONTACT;
  const parts = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(resolution, resolution);
    const targetBlur = new THREE.WebGLRenderTarget(resolution, resolution);
    target.texture.generateMipmaps = targetBlur.texture.generateMipmaps = false;
    const geometry = new THREE.PlaneGeometry(scale, scale).rotateX(Math.PI / 2);
    const blurPlane = new THREE.Mesh(geometry);
    const depth = new THREE.MeshDepthMaterial();
    depth.depthTest = depth.depthWrite = false;
    depth.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ucolor: { value: new THREE.Color(COLORS.shadow) } };
      shader.fragmentShader = shader.fragmentShader.replace("void main() {", "uniform vec3 ucolor;\n           void main() {\n          ");
      // Colours the shadow and multiplies by the falloff, so the centre can stay darker.
      shader.fragmentShader = shader.fragmentShader.replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );", "vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );");
    };
    const hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
    const vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
    hBlur.depthTest = vBlur.depthTest = false;
    return { target, targetBlur, geometry, blurPlane, depth, hBlur, vBlur };
  }, [resolution, scale]);
  useEffect(
    () => () => {
      for (const d of [parts.target, parts.targetBlur, parts.geometry, parts.depth, parts.hBlur, parts.vBlur]) d.dispose();
    },
    [parts],
  );
  const state = useRef({ sig: "", at: 0, want: true, pending: true, odd: false, nudge: false });
  // A new stage, world or visibility asks for one refresh, as a re-render of drei's frames={1} did.
  useLayoutEffect(() => {
    state.current.pending = true;
  }, [kind, step, active]);

  useFrame(({ clock }) => {
    const g = group.current;
    const c = cam.current;
    const mat = plane.current;
    if (!g || !c || !mat) return;
    const st = state.current;
    // The hand-off's edge only fades the page's copy of the world (its tags and the canvas wrapper), not
    // what stands in it: it leaves the shadows as they are.
    const sig = `${kind}:${step}:${motion.current.progress.toFixed(4)}`;
    const now = clock.elapsedTime;
    if (sig !== st.sig) {
      st.sig = sig;
      st.at = now;
    }
    const still = now - st.at;
    // People walk on the clock in the risk world: their shadows follow them at rest too.
    const want = active && (still <= SETTLED || kind === "risk");
    // The stop: one more refresh where the world came to rest.
    if (st.want && !want) st.pending = true;
    st.want = want;
    let due = st.pending;
    if (want) {
      st.odd = !st.odd;
      due = !(touch && still < SCROLLING) || st.odd;
    }
    if (!due) return;
    st.pending = false;
    const { target, targetBlur, blurPlane, depth, hBlur, vBlur } = parts;
    const blurPass = (amount: number) => {
      blurPlane.visible = true;
      blurPlane.material = hBlur;
      hBlur.uniforms.tDiffuse.value = target.texture;
      hBlur.uniforms.h.value = amount / 256;
      gl.setRenderTarget(targetBlur);
      gl.render(blurPlane, c);
      blurPlane.material = vBlur;
      vBlur.uniforms.tDiffuse.value = targetBlur.texture;
      vBlur.uniforms.v.value = amount / 256;
      gl.setRenderTarget(target);
      gl.render(blurPlane, c);
      blurPlane.visible = false;
    };
    const background = scene.background;
    const override = scene.overrideMaterial;
    g.visible = false;
    scene.background = null;
    scene.overrideMaterial = depth;
    gl.setRenderTarget(target);
    gl.render(scene, c);
    blurPass(blur);
    blurPass(blur * 0.4);
    gl.setRenderTarget(null);
    g.visible = true;
    scene.overrideMaterial = override;
    scene.background = background;
    st.nudge = !st.nudge;
    mat.opacity = opacity + (st.nudge ? NUDGE : 0);
  });
  return (
    <group ref={group} position={[0, -0.05, 0]} rotation-x={Math.PI / 2}>
      <mesh geometry={parts.geometry} scale={[1, -1, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial ref={plane} transparent map={parts.target.texture} opacity={opacity} depthWrite={false} />
      </mesh>
      <orthographicCamera ref={cam} args={[-scale / 2, scale / 2, scale / 2, -scale / 2, 0, far]} />
    </group>
  );
}

export default function ApplicationScene(props: Props) {
  // Up to 2x with MSAA, as the story (lib/device.ts); the shadow maps are sized to the scene's on-screen size.
  const q = useMemo(() => canvasQuality(), []);
  // A weak device's density follows its frame time, and its shadow maps are half the size (lib/tier.ts).
  const { dpr, govern } = useGovernedDpr(q.dpr);
  const low = useMemo(() => deviceTier() === "low", []);
  // While it plays, touch screens draw on the phone budget (Pacer, lib/pace.ts).
  const paced = useMemo(() => isTouch(), []);
  const playing = props.active && !props.still;
  const paused = useCallback(() => !props.active || props.still, [props.active, props.still]);
  // When the explorer's view last drew (FrameGate): its Pacer slows once the world rests.
  const drawn = useRef(0);
  const mark = useCallback((t: number) => void (drawn.current = t), []);
  const drawnAt = useCallback(() => drawn.current, []);
  return (
    <Canvas dpr={dpr} shadows="percentage" frameloop={playing ? (paced ? "never" : "always") : "demand"} orthographic camera={{ position: [4.6, 5.4, 8.5], zoom: 80, near: 0.1, far: 50 }}
      gl={{ antialias: q.antialias, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        // As the story (Scene.tsx): no synchronous wait on each program's link in production.
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 0.95;
        probeGl("explorer", gl);
      }}>
      <Suspense fallback={null}>
        <Studio resolution={q.phone ? 256 : 512} />
        <Camera kind={props.kind} motion={props.motion} still={props.still} frame={props.frame} />
        <directionalLight position={[4, 9, 6]} intensity={1.5} castShadow shadow-mapSize={q.phone ? [512, 512] : low ? [1024, 1024] : [2048, 2048]} shadow-normalBias={0.012} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} />
        <Stages {...props} />
        <mesh rotation-x={-Math.PI / 2} position-y={-0.065} receiveShadow><planeGeometry args={[30, 30]} /><shadowMaterial color={COLORS.shadow} opacity={0.12} /></mesh>
        <Ground kind={props.kind} step={props.step} motion={props.motion} active={props.active} phone={q.phone} low={low} touch={paced} />
        {/* The light's map is drawn by the view alone, and only after a caster moved: the contact pass
            re-rendered the scene with the light on, drawing the map a second time every moving frame. */}
        <ShadowGate />
        {/* Drawn only when the picture changed: the hand-off at a chapter's edge only fades the wrapper,
            and a world at the end of its stage stands still while the page sways. */}
        <FrameGate drawn={mark} />
        {props.snap && <Snap to={props.snap} />}
      </Suspense>
      {playing && paced && <Pacer paused={paused} drawnAt={drawnAt} />}
      {playing && govern && <Governor at={dpr} set={govern} />}
    </Canvas>
  );
}
