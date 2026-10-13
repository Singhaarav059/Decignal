"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Studio } from "./Studio";
import { COLORS } from "./palette";
import type { DemoKind } from "@/lib/application-demos";
import { Logistics, Maintenance, Production, SupplyRisk, Distribution, DealerNetwork, Customer, Finance, type SceneProps } from "./OperationalScenes";
import { phase, type Motion } from "./SceneKit";
import { Warm } from "./Warm";
import { canvasQuality } from "@/lib/device";

/** The part of the canvas the page's copy leaves free, as insets in CSS px from each edge. */
export type Frame = { left: number; top: number; right: number; bottom: number };

type Props = SceneProps & {
  kind: DemoKind;
  active: boolean;
  /** Build only these worlds (a service page's applications). Default: all eight. */
  kinds?: readonly DemoKind[];
  /** Where the subject goes: the canvas is full-bleed and the camera frames the free area. */
  frame?: RefObject<Frame>;
};

const NO_FRAME: Frame = { left: 0, top: 0, right: 0, bottom: 0 };

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
    const viewHeight = kind === "risk" ? 5.8 : kind === "maintenance" ? 5.2 : kind === "finance" ? 4.2 : kind === "customer" ? 4.6 : kind === "inventory" ? 4.6 : 5.3;
    const zoom = Math.min(w / fit, h / viewHeight, 120) * close;
    // Shift the projection so the scene's centre lands in the middle of the free area, clear of the copy.
    const ox = size.width / 2 - (f.left + w / 2);
    const oy = size.height / 2 - (f.top + h / 2);
    const c = camera as THREE.OrthographicCamera;
    const k = Math.min(dt, 0.05);
    const snap = still || !view.current.set;
    view.current.set = true;
    view.current.x = snap ? ox : THREE.MathUtils.damp(view.current.x, ox, 6, k);
    view.current.y = snap ? oy : THREE.MathUtils.damp(view.current.y, oy, 6, k);
    c.setViewOffset(size.width, size.height, view.current.x, view.current.y, size.width, size.height);
    c.zoom = snap ? zoom : THREE.MathUtils.damp(c.zoom, zoom, 6, k);
    c.position.set(kind === "maintenance" ? 4.2 : kind === "finance" ? 0.7 : 4.6, kind === "maintenance" ? 3.6 : kind === "finance" ? 7 : 5.4, 8.5);
    target.set(kind === "maintenance" ? -0.15 : 0, kind === "maintenance" ? 0.52 : kind === "risk" ? 0.65 : kind === "customer" ? 0.45 : 0.25, kind === "inventory" ? -0.45 : kind === "risk" ? -0.4 : kind === "finance" ? 0.45 : 0);
    c.lookAt(target);
    c.updateProjectionMatrix();
  });
  return null;
}

const KINDS: DemoKind[] = ["inventory", "demand", "production", "maintenance", "risk", "sales", "customer", "finance"];
const MODELS: Record<DemoKind, (p: SceneProps) => React.ReactNode> = { inventory: Logistics, demand: Distribution, production: Production, maintenance: Maintenance, risk: SupplyRisk, sales: DealerNetwork, customer: Customer, finance: Finance };
const REST = { progress: 0, edge: 0 };
/** A hidden world keeps its matrices as they were: three would otherwise walk all eight every frame. */
const skipWhenHidden = (g: THREE.Group | null) => {
  if (g) g.updateMatrixWorld = function (force) {
    if (this.visible) THREE.Group.prototype.updateMatrixWorld.call(this, force);
  };
};
/**
 * Every world on the list stays built; only the current one is shown. Switching chapters then costs
 * nothing, where rebuilding a world (geometry, textures, shaders) stalled the scroll for a fifth of a
 * second. A hidden world rests at its opening pose and follows the scroll again once it is shown.
 * The world on screen is built first and shows at once; the others follow one per idle moment, each
 * sent to the GPU as it arrives, so the first picture never waits for all eight.
 */
function Stages(props: Props) {
  const list = props.kinds ?? KINDS;
  const [order] = useState(() => [props.kind, ...list.filter((k) => k !== props.kind)]);
  const [count, setCount] = useState(1);
  useEffect(() => {
    if (count >= order.length) return;
    const next = () => setCount((c) => c + 1);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(next, { timeout: 800 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(next, 200);
    return () => window.clearTimeout(id);
  }, [count, order.length]);
  const built = new Set([...order.slice(0, count), props.kind]);
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
          <group key={k} ref={skipWhenHidden} visible={on} dispose={null}>
            <Model motion={motions[k]} step={on ? props.step : 0} still={props.still} pin={props.pin} />
          </group>
        );
      })}
      <Warm key={built.size} />
    </>
  );
}

/**
 * Contact shadows follow the world while it moves (scroll, a chapter or stage change) and rest once it
 * has been still for a moment. Re-rendering ContactShadows resets its frame count, so frames={1} bakes
 * once more on the stop and then the depth and blur passes stop until the next move.
 */
function Ground({ kind, step, motion, active, phone }: { kind: DemoKind; step: number; motion: Motion; active: boolean; phone: boolean }) {
  const [moving, setMoving] = useState(true);
  const last = useRef({ sig: "", at: 0 });
  useFrame(({ clock }) => {
    const m = motion.current;
    const sig = `${kind}:${step}:${m.progress.toFixed(4)}:${(m.edge ?? 1).toFixed(3)}`;
    const now = clock.elapsedTime;
    if (sig !== last.current.sig) {
      last.current = { sig, at: now };
      if (!moving) setMoving(true);
    } else if (moving && now - last.current.at > 0.8) setMoving(false);
  });
  // People walk on the clock in the demand and risk worlds: their shadows follow them at rest too.
  const live = kind === "demand" || kind === "risk";
  return <ContactShadows position={[0, -0.05, 0]} scale={14} blur={1.8} opacity={0.4} far={1.5} resolution={phone ? 256 : 512} frames={active && (moving || live) ? Infinity : 1} color={COLORS.shadow} />;
}

export default function ApplicationScene(props: Props) {
  // Full device density on phones too; the shadow maps are sized to the scene's on-screen size.
  const q = useMemo(() => canvasQuality(), []);
  return (
    <Canvas dpr={q.dpr} shadows="percentage" frameloop={props.active && !props.still ? "always" : "demand"} orthographic camera={{ position: [4.6, 5.4, 8.5], zoom: 80, near: 0.1, far: 50 }}
      gl={{ antialias: q.antialias, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 0.95;
      }}>
      <Suspense fallback={null}>
        <Studio resolution={512} />
        <Camera kind={props.kind} motion={props.motion} still={props.still} frame={props.frame} />
        <directionalLight position={[4, 9, 6]} intensity={1.5} castShadow shadow-mapSize={q.phone ? [1024, 1024] : [2048, 2048]} shadow-normalBias={0.012} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} />
        <Stages {...props} />
        <mesh rotation-x={-Math.PI / 2} position-y={-0.065} receiveShadow><planeGeometry args={[30, 30]} /><shadowMaterial color={COLORS.shadow} opacity={0.12} /></mesh>
        <Ground kind={props.kind} step={props.step} motion={props.motion} active={props.active} phone={q.phone} />
      </Suspense>
    </Canvas>
  );
}
