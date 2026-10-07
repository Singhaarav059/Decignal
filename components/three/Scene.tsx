"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { easing } from "maath";
import { CHAPTERS, blendAt, store, subscribe } from "@/lib/story";
import { bgAt, cameraPose } from "@/lib/scene";
import { Cards, ChartCrates, Islands, SignalCrate, Transfer } from "./Actors";
import { ChartMarks, SignalPing, Threads } from "./Marks";
import { Plinth } from "./Plinth";
import { COLORS } from "./palette";
import { KeyLight, Studio } from "./Studio";
import { SystemNetwork } from "./SystemNetwork";
import { canvasQuality, isPhone } from "@/lib/device";

// Portrait only: chapters whose copy fills the top of the screen lower the object into the free space below.
const PORTRAIT_DROP = [-0.055, 0.13, 0.06, 0.12, -0.12, 0.09, -0.1, -0.14, -0.06];
// Desktop frames push objects right of the copy column; a portrait screen centres them instead.
const PORTRAIT_X = [0, 0, 0.3, 1.45, 0, 0.6, 0, 0, 0];
// Leave room for outer source labels and the supplier marker on a phone.
// Signal frames one object, so portrait screens come in close instead of fitting a wide stage.
const MOBILE_FIT = [0.68, 0.62, 0.86, 0.9, 0.58, 1.18, 0.8, 0.62, 0.74];
// Phones only, added to PORTRAIT_X: the signal crate sits on the screen's centre line, and Problem's week of
// crates is centred (its axis labels hang off the right, so the chart as a whole slides left).
const MOBILE_X = [0, -0.07, 0.9, 0, 0, 0, 0, 0, 0];

const PORTRAIT_FIT = [0.68, 0.7, 0.9, 1, 0.78];
// Tablet portrait only: Control's stack sits below the approval widget instead of behind it.
const TABLET_DROP = [0.035, 0, 0, 0, 0, 0.3, 0, 0, 0];
// Phones only: Scale's cards sit lower, in the gap between the subtitle and the function board;
// the signal crate rises into the middle of the gap between its copy and readout; Problem's chart
// drops into the middle of the space under its figures.
const MOBILE_DROP = [0, -0.1, 0.1, 0, 0.05, 0, 0.075, 0, 0];
// Short phones (under 760 tall): the hero sits a touch lower; Control's stack lifts clear of the approval panel.
const SHORT_DROP = [0.009, 0, 0, 0, 0, -0.035, 0, 0, 0];
// Narrow landscape (1024 to 1280 wide): the copy column takes a larger share of the screen, so
// Problem's chart steps back and slides right, clear of the stats beside it. Eased in by width.
// Control's card stack does the same, clear of the approval widget.
const NARROW_FIT = [1, 1, 1.2, 1, 1, 1.32, 1, 1, 1];
const NARROW_X = [0, 0, -0.9, 0, 0, -1.1, 0, 0, 0];
// Tablet portrait only: the hero's six islands step back so they sit under the headline, not over it.
const TABLET_FIT = [1.24, 1, 1, 1, 1, 1, 1, 1, 1];

function Rig() {
  const { camera, size } = useThree();
  const axes = useMemo(() => ({ f: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() }), []);
  const look = useRef(new THREE.Vector3());
  const goal = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }), []);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }), []);
  const ready = useRef(false);
  const lean = useRef(0);
  const reduced = useRef(false);
  const lastI = useRef(-1);
  const [sa, sb, sc] = useMemo(() => [new THREE.Spherical(), new THREE.Spherical(), new THREE.Spherical()], []);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => (reduced.current = m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);

  useFrame((_, dt) => {
    const { i, j, local, e } = blendAt(store.g);
    const portrait = size.width < 768 || (size.width < 1024 && size.height > size.width * 1.15);
    const a = cameraPose(i, local, portrait);
    const b = cameraPose(j, 0, portrait);
    const still = reduced.current;
    // Reduced motion: no orbit, the camera cuts at the midpoint and settles.
    const k = still ? (e < 0.5 ? 0 : 1) : e;
    goal.t.set(...a.t).lerp(tmp.t.set(...b.t), k);
    if (i < 4 && !still) {
      // Hero -> Signal -> Problem -> Context -> Decision: orbit around the subject instead of
      // sliding in a straight line. Azimuth, elevation and distance ease independently (k is
      // smootherstep), so each move tilts/swings and decelerates into its hold.
      sa.setFromVector3(tmp.p.set(...a.p).sub(tmp.t.set(...a.t)));
      sb.setFromVector3(tmp.p.set(...b.p).sub(tmp.t.set(...b.t)));
      let dth = sb.theta - sa.theta;
      if (dth > Math.PI) dth -= 2 * Math.PI;
      if (dth < -Math.PI) dth += 2 * Math.PI;
      sc.set(
        Math.exp(THREE.MathUtils.lerp(Math.log(sa.radius), Math.log(sb.radius), k)),
        THREE.MathUtils.lerp(sa.phi, sb.phi, k),
        sa.theta + dth * k,
      );
      goal.p.setFromSpherical(sc).add(goal.t);
    } else {
      goal.p.set(...a.p).lerp(tmp.p.set(...b.p), k);
    }

    // Narrow screens: step back along the view ray so the composition still fits.
    const aspect = size.width / size.height;
    const fit = size.width < 768 ? THREE.MathUtils.lerp(MOBILE_FIT[i], MOBILE_FIT[j], e) : portrait ? THREE.MathUtils.lerp(PORTRAIT_FIT[i] ?? 1, PORTRAIT_FIT[j] ?? 1, e) * THREE.MathUtils.lerp(TABLET_FIT[i], TABLET_FIT[j], e) : size.width < 1024 ? THREE.MathUtils.lerp(i===0?1.18:1,j===0?1.18:1,e) : 1;
    const compactHero = size.width < 768 && size.height < 740 ? THREE.MathUtils.lerp(i===0?1.09:1,j===0?1.09:1,e) : 1;
    const narrow = !portrait && size.width >= 1024 ? THREE.MathUtils.clamp((1280 - size.width) / 256, 0, 1) : 0;
    const narrowFit = 1 + (THREE.MathUtils.lerp(NARROW_FIT[i], NARROW_FIT[j], e) - 1) * narrow;
    store.camK = (aspect < 1.5 ? Math.pow(1.5 / aspect, 0.92) : 1) * fit * compactHero * narrowFit;
    if (store.camK > 1) goal.p.sub(goal.t).multiplyScalar(store.camK).add(goal.t);
    if (narrow > 0) {
      const nx = THREE.MathUtils.lerp(NARROW_X[i], NARROW_X[j], e) * narrow;
      goal.p.x += nx;
      goal.t.x += nx;
    }
    if (size.width < 1024) {
      const drop = THREE.MathUtils.lerp(PORTRAIT_DROP[i], PORTRAIT_DROP[j], e) + (size.width >= 768 ? THREE.MathUtils.lerp(TABLET_DROP[i], TABLET_DROP[j], e) : THREE.MathUtils.lerp(MOBILE_DROP[i], MOBILE_DROP[j], e)) + (size.width < 768 && size.height < 760 ? THREE.MathUtils.lerp(SHORT_DROP[i], SHORT_DROP[j], e) : 0);
      const dx = THREE.MathUtils.lerp(PORTRAIT_X[i], PORTRAIT_X[j], e) + (size.width < 768 ? THREE.MathUtils.lerp(MOBILE_X[i], MOBILE_X[j], e) : 0);
      goal.p.x += dx;
      goal.t.x += dx;
      const d = goal.p.distanceTo(goal.t);
      const h = 2 * d * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2));
      // Slide the view up along the screen's own up axis; the scene moves down.
      axes.f.subVectors(goal.t, goal.p).normalize();
      axes.r.crossVectors(axes.f, THREE.Object3D.DEFAULT_UP).normalize();
      axes.u.crossVectors(axes.r, axes.f).multiplyScalar(h * drop);
      goal.p.add(axes.u);
      goal.t.add(axes.u);
    }
    // An opened system docks a panel on the right. The scene steps back a little and slides left
    // into the space that remains, so every island stays in view and a click away.
    lean.current = THREE.MathUtils.damp(lean.current, store.selected >= 0 ? 1 : 0, 3.2, Math.min(dt, 1 / 30));
    if (lean.current > 0.001 && aspect >= 0.9) {
      const k = lean.current;
      goal.p.sub(goal.t).multiplyScalar(1 + 0.24 * k).add(goal.t);
      const d = goal.p.distanceTo(goal.t);
      const viewW = 2 * d * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) * aspect;
      const panelPx = Math.min(400, size.width * 0.3);
      axes.f.subVectors(goal.t, goal.p).normalize();
      axes.r.crossVectors(axes.f, THREE.Object3D.DEFAULT_UP).normalize();
      const shift = (panelPx / 2 / size.width) * viewW * k;
      goal.p.addScaledVector(axes.r, shift);
      goal.t.addScaledVector(axes.r, shift);
    } else if (lean.current > 0.001) {
      // Phones: the panel is a sheet along the bottom, so the scene steps back and rises above it.
      const k = lean.current;
      goal.p.sub(goal.t).multiplyScalar(1 + 0.18 * k).add(goal.t);
      const d = goal.p.distanceTo(goal.t);
      const viewH = 2 * d * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2));
      axes.f.subVectors(goal.t, goal.p).normalize();
      axes.r.crossVectors(axes.f, THREE.Object3D.DEFAULT_UP).normalize();
      axes.u.crossVectors(axes.r, axes.f).normalize();
      const lift = (Math.min(340, size.height * 0.45) / 2 / size.height) * viewH * k;
      goal.p.addScaledVector(axes.u, -lift);
      goal.t.addScaledVector(axes.u, -lift);
    }
    // A few centimetres of parallax: confirms the space is real, nothing more.
    goal.p.x += store.pointer.x * 0.22;
    goal.p.y += store.pointer.y * 0.12;

    const delta = Math.min(dt, 1 / 30);
    const side = e < 0.5 ? i : i + 1;
    const cut = reduced.current && side !== lastI.current;
    lastI.current = side;
    if (!ready.current || cut) {
      camera.position.copy(goal.p);
      look.current.copy(goal.t);
      ready.current = true;
    }
    const velK = Math.min(1, Math.abs(store.velocity) / 22);
    // A touch more lag than before so the orbit lands softly into its hold.
    const dampTime = reduced.current ? 0.05 : THREE.MathUtils.lerp(0.16, 0.06, velK);
    easing.damp3(camera.position, goal.p, dampTime, delta);
    easing.damp3(look.current, goal.t, dampTime, delta);
    camera.lookAt(look.current);
  });
  return null;
}

/** Fog takes the page's chapter tint, so distant objects melt into the background. */
function Atmosphere() {
  const { scene } = useThree();
  const fog = useMemo(() => new THREE.Fog(COLORS.bg, 18, 42), []);
  useEffect(() => {
    scene.fog = fog;
  }, [scene, fog]);
  useFrame(() => {
    const [r, g, b] = bgAt(store.g);
    fog.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
    // The fog travels with the camera, so stepping back on a phone never swallows the scene.
    fog.near = 18 * store.camK;
    fog.far = 42 * store.camK;
  });
  return null;
}

function World() {
  return (
    <>
      <Studio />
      <Atmosphere />
      <KeyLight />
      <Suspense fallback={null}>
        <Islands />
        <SignalCrate />
        <ChartCrates />
        <Transfer />
        <Cards />
        <ChartMarks />
      </Suspense>
      <Threads />
      <SystemNetwork />
      <SignalPing />
      <Plinth />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial color={COLORS.shadow} opacity={0.16} transparent />
      </mesh>
      {/* Tight contact shadows: every object sits on the ground, none of them float */}
      {/* Phones: half the map for a third of the on-screen size, so the shadow is as fine per pixel as on desktop. */}
      <ContactShadows position={[0, 0.001, 0]} scale={30} resolution={isPhone() ? 512 : 1024} blur={1.1} far={0.7} opacity={0.42} color={COLORS.shadow} />
      <Rig />
      <Pause />
    </>
  );
}

/** Once the story has faded out behind the page, stop rendering until the reader scrolls back. */
function Pause() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    let paused = false;
    return subscribe((g) => {
      const off = g > CHAPTERS.length - 0.01;
      if (off !== paused) {
        paused = off;
        setFrameloop(off ? "never" : "always");
      }
    });
  }, [setFrameloop]);
  return null;
}

export default function Scene() {
  const q = useMemo(() => canvasQuality(), []);
  return (
    <Canvas
      shadows="percentage"
      // Always the screen's full pixel density (2x on desktop, up to 3x on a phone): the scene never
      // trades sharpness for speed.
      dpr={q.dpr}
      camera={{ fov: 26, near: 0.1, far: 80, position: [0, 7, 15] }}
      gl={{ antialias: q.antialias, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 0.95;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <World />
    </Canvas>
  );
}
