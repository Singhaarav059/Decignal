"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { easing } from "maath";
import { CHAPTERS, blendAt, store, subscribe } from "@/lib/story";
import { bgAt, cameraPose } from "@/lib/scene";
import { Cards, ChartCrates, Islands, SignalCrate, Transfer } from "./Actors";
import { ChartMarks, SignalPing, Threads } from "./Marks";
import { Plinth } from "./Plinth";
import { COLORS, TINTS } from "./palette";

// Portrait only: chapters whose copy fills the top of the screen lower the object into the free space below.
const PORTRAIT_DROP = [0, 0.13, 0.13, 0.12, 0, 0.09, 0.1, 0, 0];
// Desktop frames push objects right of the copy column; a portrait screen centres them instead.
const PORTRAIT_X = [0, 1.0, 0, 1.45, 0, 0.6, 0, 0, 0];

function Rig() {
  const { camera, size } = useThree();
  const axes = useMemo(() => ({ f: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() }), []);
  const look = useRef(new THREE.Vector3());
  const goal = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }), []);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }), []);
  const ready = useRef(false);

  useFrame((_, dt) => {
    const { i, j, local, e } = blendAt(store.g);
    const a = cameraPose(i, local);
    const b = cameraPose(j, 0);
    goal.p.set(...a.p).lerp(tmp.p.set(...b.p), e);
    goal.t.set(...a.t).lerp(tmp.t.set(...b.t), e);

    // Narrow screens: step back along the view ray so the composition still fits.
    const aspect = size.width / size.height;
    store.camK = aspect < 1.25 ? Math.pow(1.25 / aspect, 0.92) : 1;
    if (store.camK > 1) goal.p.sub(goal.t).multiplyScalar(store.camK).add(goal.t);
    if (aspect < 0.9) {
      const drop = THREE.MathUtils.lerp(PORTRAIT_DROP[i], PORTRAIT_DROP[j], e);
      const dx = THREE.MathUtils.lerp(PORTRAIT_X[i], PORTRAIT_X[j], e);
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
    // A few centimetres of parallax: confirms the space is real, nothing more.
    goal.p.x += store.pointer.x * 0.22;
    goal.p.y += store.pointer.y * 0.12;

    const delta = Math.min(dt, 1 / 30);
    if (!ready.current) {
      camera.position.copy(goal.p);
      look.current.copy(goal.t);
      ready.current = true;
    }
    easing.damp3(camera.position, goal.p, 0.12, delta);
    easing.damp3(look.current, goal.t, 0.12, delta);
    camera.lookAt(look.current);
  });
  return null;
}

function Studio() {
  // Studio lighting, built in code: one large top softbox, a key, a rim and a low fill.
  return (
    <Environment resolution={512} frames={1}>
      <color attach="background" args={[COLORS.envBase]} />
      <Lightformer form="rect" intensity={2.4} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
      <Lightformer form="rect" intensity={3.0} position={[-7, 2.5, 3]} rotation-y={Math.PI / 2} scale={[5, 7, 1]} />
      <Lightformer form="rect" intensity={1.6} position={[7, 1.5, -2]} rotation-y={-Math.PI / 2} scale={[3, 6, 1]} />
      <Lightformer form="rect" intensity={0.9} position={[0, 1, 9]} scale={[10, 3, 1]} />
      <Lightformer form="ring" intensity={1.2} position={[3, 5, 6]} scale={2} />
      <Lightformer form="rect" color={TINTS.tangerine} intensity={0.5} position={[-8, 0.6, -4]} rotation-y={Math.PI / 3} scale={[6, 2, 1]} />
      <Lightformer form="rect" color={TINTS.cobalt} intensity={0.4} position={[8, 0.6, 4]} rotation-y={-Math.PI / 1.6} scale={[6, 2, 1]} />
    </Environment>
  );
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
      <directionalLight
        position={[5, 11, 7]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={6}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
      <Suspense fallback={null}>
        <Islands />
        <SignalCrate />
        <ChartCrates />
        <Transfer />
        <Cards />
        <ChartMarks />
      </Suspense>
      <Threads />
      <SignalPing at={[0.55, 0.004, 1.6]} />
      <Plinth />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial color={COLORS.shadow} opacity={0.16} transparent />
      </mesh>
      <ContactShadows position={[0, 0.001, 0]} scale={30} resolution={512} blur={1.8} far={1.4} opacity={0.5} color={COLORS.shadow} />
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
  return (
    <Canvas
      shadows="percentage"
      // Always the screen's full pixel density (capped at 2x): the scene never trades sharpness for speed.
      dpr={[1, 2]}
      camera={{ fov: 26, near: 0.1, far: 80, position: [0, 7, 15] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
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
