"use client";

// The story's view, drawn only when it can look different. Outside the hero the world rests between
// scrolls: every chapter settles (the damps snap at their end) and then the same picture was drawn
// sixty times a second, at the phone's density. A mid-range phone's GPU spent its whole budget on
// that and heated until it throttled, so the scroll itself stuttered. Here each frame first reads
// what the picture is made of (the camera, and every visible object's matrix, geometry, instances and
// material values) and draws only after a change. Anything that moves, eases or fades still draws on
// every frame it changes; a world at rest costs nothing, and the canvas keeps its last picture.
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/** Frames always drawn after mounting or a lost context: the environment map and first uploads land in them. */
const SETTLE = 30;

/** Smallest change that counts: a world unit of 1e-5 is far under a pixel at any of the story's framings. */
const EPS = 1e-5;

/** The values read this frame, in order; compared one by one with the last drawn frame's (each gate
 *  keeps its own: the story and the explorer both draw through one). */
let cur: Float64Array = new Float64Array(4096);
let n = 0;
type Seen = { prev: Float64Array; prevN: number };
const mix = (v: number) => {
  if (n === cur.length) {
    const next = new Float64Array(cur.length * 2);
    next.set(cur);
    cur = next;
  }
  cur[n++] = v;
};
const color = (c: THREE.Color | undefined) => {
  if (c) {
    mix(c.r);
    mix(c.g);
    mix(c.b);
  }
};
const tex = (t: THREE.Texture | null | undefined) => {
  if (!t) return;
  mix(t.id);
  mix(t.version);
  mix(t.offset.x);
  mix(t.offset.y);
  mix(t.repeat.x);
  mix(t.repeat.y);
  mix(t.rotation);
};

function matHash(m: THREE.Material) {
  const s = m as THREE.MeshPhysicalMaterial & { fg?: THREE.Color; ocean?: THREE.Color };
  mix((m as unknown as { id: number }).id);
  mix(m.version);
  mix(m.visible ? 1 : 0);
  mix(m.opacity);
  color(s.color);
  color(s.emissive);
  color(s.fg);
  color(s.ocean);
  if (s.emissiveIntensity !== undefined) mix(s.emissiveIntensity);
  tex(s.map);
  tex(s.alphaMap);
  tex(s.emissiveMap);
  const u = (m as THREE.ShaderMaterial).uniforms;
  if (u)
    for (const k in u) {
      const v = u[k].value;
      if (typeof v === "number") mix(v);
      else if (v?.isColor) color(v);
      else if (v?.isTexture) tex(v);
      else if (v?.isVector2 || v?.isVector3 || v?.isVector4) {
        mix(v.x);
        mix(v.y);
        mix(v.z ?? 0);
        mix(v.w ?? 0);
      }
    }
}

/** Reads everything the next picture is drawn from; true when any of it differs from the last draw. */
function changed(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, seen: Seen) {
  n = 0;
  const e = camera.matrixWorld.elements;
  for (let k = 0; k < 16; k++) mix(e[k]);
  const p = camera.projectionMatrix.elements;
  for (let k = 0; k < 16; k++) mix(p[k]);
  mix(gl.domElement.width);
  mix(gl.domElement.height);
  mix(gl.toneMappingExposure);
  mix(scene.environment?.id ?? 0);
  mix(scene.background ? 1 : 0);
  // The fog follows the camera and takes the chapter's sky (Scene.tsx Atmosphere).
  const fog = scene.fog as THREE.Fog | null;
  if (fog) {
    color(fog.color);
    mix(fog.near);
    mix(fog.far);
  }
  scene.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    const light = o as THREE.Light;
    if (light.isLight) {
      mix(light.intensity);
      color(light.color);
    }
    if (!m.isMesh && !(o as THREE.Line).isLine && !(o as THREE.Points).isPoints && !(o as THREE.Sprite).isSprite) {
      if (!light.isLight) return;
    }
    mix(o.id);
    const w = o.matrixWorld.elements;
    for (let k = 0; k < 16; k++) mix(w[k]);
    const g = m.geometry;
    if (g) {
      mix(g.id);
      mix(g.drawRange.start);
      mix(g.drawRange.count);
      for (const name in g.attributes) mix((g.attributes[name] as THREE.BufferAttribute).version ?? 0);
      if (g.index) mix(g.index.version);
      mix((g as THREE.InstancedBufferGeometry).instanceCount ?? 0);
    }
    const inst = o as THREE.InstancedMesh;
    if (inst.isInstancedMesh) {
      mix(inst.instanceMatrix.version);
      mix(inst.count);
      if (inst.instanceColor) mix(inst.instanceColor.version);
    }
    if (m.morphTargetInfluences) for (const v of m.morphTargetInfluences) mix(v);
    if (Array.isArray(m.material)) m.material.forEach(matHash);
    else if (m.material) matHash(m.material);
  });
  const prev = seen.prev;
  let diff = n !== seen.prevN;
  // Damped values creep in the last digits long after they look still: a change has to be big enough
  // to move something by a hundredth of a pixel. Drift below that adds up against the last drawn frame
  // until it is. (NaN and Infinity compare as unchanged.)
  for (let k = 0; !diff && k < n; k++) diff = Math.abs(cur[k] - prev[k]) > EPS;
  if (diff) {
    seen.prev = cur;
    cur = prev.length >= cur.length ? prev : new Float64Array(cur.length);
    seen.prevN = n;
  }
  return diff;
}

let drawnAt = 0;
/** performance.now() of the story's last draw: the touch Pacer slows its updates once the world rests. */
export const lastDraw = () => drawnAt;

/**
 * Takes over a canvas's render loop (a positive priority): the scene updates every frame as before,
 * and is drawn only when the picture changed since the last draw. `drawn` hears of each draw; without
 * it the draw is the story's (lastDraw).
 */
export function FrameGate({ drawn }: { drawn?: (t: number) => void } = {}) {
  const gl = useThree((s) => s.gl);
  const settle = useRef(SETTLE);
  const seen = useRef<Seen>({ prev: new Float64Array(4096), prevN: -1 });
  useEffect(() => {
    const again = () => {
      settle.current = SETTLE;
      seen.current.prevN = -1;
    };
    again();
    gl.domElement.addEventListener("webglcontextrestored", again);
    return () => gl.domElement.removeEventListener("webglcontextrestored", again);
  }, [gl]);
  useFrame(({ gl, scene, camera }) => {
    // Matrices as three would bring them up to date for this draw, so the check sees this frame.
    if (scene.matrixWorldAutoUpdate) scene.updateMatrixWorld();
    if (camera.parent === null && camera.matrixWorldAutoUpdate) camera.updateMatrixWorld();
    const diff = changed(gl, scene, camera, seen.current);
    if (settle.current > 0) settle.current--;
    else if (!diff) return;
    const t = performance.now();
    if (drawn) drawn(t);
    else drawnAt = t;
    gl.render(scene, camera);
  }, 1);
  return null;
}
