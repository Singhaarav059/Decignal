"use client";

// The bay's water. It mirrors the world above it: every frame the scene is drawn once more from a
// camera below the surface (a planar reflection), and the water shows that picture broken up by
// its ripples, so the island, the ships, the mountain and, after dusk, every lamp hang upside down
// in it. Ripples come from one small tiling normal map sampled at three scales, which costs a few
// texture reads per pixel rather than a stack of noise. Over that: Fresnel (the water mirrors more
// the flatter you look across it), a glitter path under the sun or the moon, lighter shallows and a
// line of foam where the swell meets the sea wall, and the far bay settling into mist.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { SKY_GLSL, skyUniforms } from "./sky";
import { daylight } from "@/lib/daylight";

export const WATER_Y = -1.7;

/**
 * Render layer for things too small or too far inland to show in the water (people, the yard's
 * vehicles and pallets, Plant 01's interior): drawn on screen, in the shadow map and in contact
 * shadows, but left out of the reflection pass, which would otherwise draw them twice per frame.
 */
export const DETAIL = 1;

/** Keeps everything inside it out of the water's reflection (see DETAIL). */
export function Unreflected({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  // Runs after every child's own layout effects (Bake's merges included), so it catches them all.
  useLayoutEffect(() => ref.current?.traverse((o) => o.layers.set(DETAIL)), []);
  return <group ref={ref}>{children}</group>;
}

/* ------------------------------------------------------------------ */
/* Ripples: one tiling normal map, built once                          */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let s = seed * 7919 + 13;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * A 256 px tile of small water waves. Each wave has a whole number of cycles across the tile, so
 * the tile repeats without a seam; longer waves are taller, as on real water. Stored as slopes
 * (red: along x, green: along z), 0.5 meaning flat.
 */
function rippleTexture(size = 256) {
  const r = rng(5);
  const waves: { kx: number; kz: number; a: number; ph: number }[] = [];
  for (let i = 0; i < 44; i++) {
    let kx = 0;
    let kz = 0;
    while (kx === 0 && kz === 0) {
      // Mostly across the bay (along x), a few running every other way.
      const reach = 2 + Math.floor(r() * (4 + i * 0.5));
      const ang = (r() - 0.5) * (r() < 0.7 ? 1.4 : Math.PI * 2);
      kx = Math.round(Math.cos(ang) * reach);
      kz = Math.round(Math.sin(ang) * reach);
    }
    const k = Math.hypot(kx, kz);
    waves.push({ kx, kz, a: 1 / Math.pow(k, 1.5), ph: r() * Math.PI * 2 });
  }
  const sx = new Float32Array(size * size);
  const sz = new Float32Array(size * size);
  let max = 0;
  const tau = (Math.PI * 2) / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dx = 0;
      let dz = 0;
      for (const w of waves) {
        // Sharper crests than a sine: the slope of a slightly peaked wave.
        const c = Math.cos((w.kx * x + w.kz * y) * tau + w.ph);
        const s = w.a * c * (1 + 0.35 * Math.sin((w.kx * x + w.kz * y) * tau + w.ph));
        dx += s * w.kx;
        dz += s * w.kz;
      }
      const i = y * size + x;
      sx[i] = dx;
      sz[i] = dz;
      max = Math.max(max, Math.abs(dx), Math.abs(dz));
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = Math.round((sx[i] / max) * 127.5 + 127.5);
    data[i * 4 + 1] = Math.round((sz[i] / max) * 127.5 + 127.5);
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/* ------------------------------------------------------------------ */
/* The reflection                                                       */
/* ------------------------------------------------------------------ */

/**
 * What the water reflects, drawn from below the surface. Marked as an output target, so every
 * material draws into it with exactly the programs (tone mapping, sRGB output) it uses on screen:
 * no second set of shaders to compile, and the reflection is the same picture the screen shows.
 */
const reflection = new THREE.WebGLRenderTarget(16, 16, { depthBuffer: true, stencilBuffer: false });
(reflection as unknown as { isXRRenderTarget: boolean }).isXRRenderTarget = true;
reflection.texture.colorSpace = THREE.SRGBColorSpace;
reflection.texture.generateMipmaps = false;
reflection.texture.minFilter = THREE.LinearFilter;

const mirrorCam = new THREE.PerspectiveCamera();
mirrorCam.matrixAutoUpdate = false;
mirrorCam.matrixWorldAutoUpdate = false;
const texMatrix = new THREE.Matrix4();
const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
const flip = new THREE.Matrix4().makeScale(1, -1, 1);
const lift = new THREE.Matrix4();
const plane = new THREE.Plane();
const clip = new THREE.Vector4();
const q = new THREE.Vector4();
const size = new THREE.Vector2();
let waterMesh: THREE.Mesh | null = null;

/** Share of the screen's CSS pixels the reflection is drawn at: the ripples break it up finer than that. */
const SCALE = 0.75;

/**
 * Draws the reflection for this frame. Call right before the main render, with the scene's world
 * matrices already up to date (it does not update them again).
 */
export function renderReflection(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
  if (!waterMesh) return;
  gl.getSize(size);
  const w = Math.max(64, Math.round(size.x * SCALE));
  const h = Math.max(64, Math.round(size.y * SCALE));
  if (reflection.width !== w || reflection.height !== h) reflection.setSize(w, h);

  // The camera mirrored in the water: reflect its world matrix in the plane y = WATER_Y. A mirror
  // flips handedness, so the picture is flipped back left to right in projection space below.
  lift.makeTranslation(0, WATER_Y, 0);
  mirrorCam.matrixWorld.copy(lift).multiply(flip).multiply(lift.makeTranslation(0, -WATER_Y, 0)).multiply(camera.matrixWorld);
  mirrorCam.matrixWorldInverse.copy(mirrorCam.matrixWorld).invert();
  mirrorCam.projectionMatrix.copy(camera.projectionMatrix);
  mirrorCam.far = camera.far;

  texMatrix.copy(BIAS).multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);

  // Oblique near plane at the water line: nothing under the water is drawn into its reflection.
  plane.set(new THREE.Vector3(0, 1, 0), -WATER_Y).applyMatrix4(mirrorCam.matrixWorldInverse);
  clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
  const p = mirrorCam.projectionMatrix.elements;
  q.x = (Math.sign(clip.x) + p[8]) / p[0];
  q.y = (Math.sign(clip.y) + p[9]) / p[5];
  q.z = -1;
  q.w = (1 + p[10]) / p[14];
  clip.multiplyScalar(2 / clip.dot(q));
  p[2] = clip.x;
  p[6] = clip.y;
  p[10] = clip.z + 1 - 0.003;
  p[14] = clip.w;
  mirrorCam.projectionMatrixInverse.copy(mirrorCam.projectionMatrix).invert();

  // A mirror reverses every triangle's winding, and three chooses the front face from each object's
  // own matrix: invert that choice for this pass, so the faces you would see are the ones drawn.
  const state = gl.state;
  const setMaterial = state.setMaterial;
  state.setMaterial = (m: THREE.Material, frontFaceCW: boolean, clipping: number) => setMaterial.call(state, m, !frontFaceCW, clipping);
  const auto = scene.matrixWorldAutoUpdate;
  const shadows = gl.shadowMap.needsUpdate;
  scene.matrixWorldAutoUpdate = false;
  gl.shadowMap.needsUpdate = false;
  waterMesh.visible = false;
  // Stars are too fine to survive the ripples: they would only scatter specks over the bay.
  const stars = skyUniforms.uStars.value;
  skyUniforms.uStars.value = 0;
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(reflection);
  state.buffers.depth.setMask(true);
  gl.render(scene, mirrorCam);
  gl.setRenderTarget(prev);
  waterMesh.visible = true;
  skyUniforms.uStars.value = stars;
  state.setMaterial = setMaterial;
  gl.shadowMap.needsUpdate = shadows;
  scene.matrixWorldAutoUpdate = auto;
}

/* ------------------------------------------------------------------ */
/* The surface                                                          */
/* ------------------------------------------------------------------ */

/** Places the water shades as shallows and edges with foam: the island, the moored ship, the islet. */
export type Shore = { island: [number, number, number, number]; ship: [number, number, number, number]; islet: [number, number, number, number] };

export function Water({ shore }: { shore: Shore }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...skyUniforms,
          uRipples: { value: rippleTexture() },
          uReflect: { value: reflection.texture },
          uMirror: { value: texMatrix },
          uWater: { value: new THREE.Color() },
          uShallow: { value: new THREE.Color() },
          uGlint: { value: new THREE.Color() },
          uGlintDir: { value: new THREE.Vector3(0, 1, 0) },
          uIsland: { value: new THREE.Vector4(...shore.island) },
          uShip: { value: new THREE.Vector4(...shore.ship) },
          uIslet: { value: new THREE.Vector4(...shore.islet) },
        },
        fog: false,
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          ${SKY_GLSL}
          uniform sampler2D uRipples;
          uniform sampler2D uReflect;
          uniform mat4 uMirror;
          uniform vec3 uWater;
          uniform vec3 uShallow;
          uniform vec3 uGlint;
          uniform vec3 uGlintDir;
          uniform vec4 uIsland;
          uniform vec4 uShip;
          uniform vec4 uIslet;
          uniform float uTime;
          varying vec3 vWorld;

          vec2 slope(vec2 uv) { return texture2D(uRipples, uv).xy * 2.0 - 1.0; }

          // Distance outside an axis-aligned box given as (x0, x1, z0, z1).
          float boxDist(vec2 p, vec4 b) {
            vec2 c = vec2(b.x + b.y, b.z + b.w) * 0.5;
            vec2 e = vec2(b.y - b.x, b.w - b.z) * 0.5;
            vec2 d = abs(p - c) - e;
            return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
          }

          vec3 toLinear(vec3 c) {
            return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
          }

          void main() {
            vec3 toCam = cameraPosition - vWorld;
            float dist = length(toCam);
            vec3 V = toCam / dist;
            vec2 p = vWorld.xz;
            float t = uTime;

            // Three scales of ripple drifting different ways; the finest fade out with distance
            // (their mipmaps would only grey them anyway), so the far bay lies calm.
            float near = 1.0 - smoothstep(40.0, 520.0, dist);
            mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
            vec2 s = slope(p * 0.021 + vec2(t * 0.0045, t * 0.0021))
                   + slope(turn * p * 0.052 - vec2(t * 0.0083, -t * 0.0036)) * 0.62
                   + slope(p * 0.16 + vec2(-t * 0.016, t * 0.012)) * 0.4 * near;
            float rough = mix(0.04, 0.2, near);
            vec3 n = normalize(vec3(-s.x * rough, 1.0, -s.y * rough));
            float ndv = max(dot(n, V), 0.0);
            // Schlick, nudged up a little for the slopes too small to see.
            float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

            // Shallows and foam: how far this point is from the sea wall, the ship's hull and the islet.
            float dWall = boxDist(p, uIsland);
            float dShip = boxDist(p, uShip);
            vec2 io = (p - uIslet.xy) / uIslet.zw;
            float dIslet = (length(io) - 1.0) * min(uIslet.z, uIslet.w);
            float shore = min(min(dWall, dShip), dIslet);

            // The mirror image, shifted by the ripples: more up and down than sideways, the way
            // reflections stretch on water. Closer water breaks the picture up more.
            vec4 rc = uMirror * vec4(vWorld.x, ${WATER_Y.toFixed(2)}, vWorld.z, 1.0);
            vec2 ruv = rc.xy / rc.w;
            float k = 0.0025 + 1.8 / max(dist, 1.0);
            ruv += vec2(s.x * 0.35, s.y * 0.9 + abs(s.x) * 0.2) * k * rough * 6.0;
            ruv = clamp(ruv, vec2(0.001), vec2(0.999));
            vec3 mirror = toLinear(texture2D(uReflect, ruv).rgb);

            // The water's own colour: deeper out in the bay, clearer and lighter by the wall.
            float shallow = exp(-max(shore, 0.0) / 9.0);
            vec3 body = mix(uWater, uShallow, shallow * 0.7);
            vec3 c = mix(body, mirror, clamp(fres * 1.15 + 0.08, 0.0, 1.0));

            // Glitter: the sun (by night the moon) caught on the ripple faces turned towards you.
            vec3 H = normalize(uGlintDir + V);
            float nh = max(dot(n, H), 0.0);
            c += uGlint * (pow(nh, 1400.0) * 9.0 + pow(nh, 160.0) * 0.18) * smoothstep(-0.03, 0.06, uGlintDir.y);

            // Foam lapping at the wall and the hull: a broken line that comes and goes with the swell.
            float swell = 0.5 + 0.5 * sin(t * 0.8 + p.x * 0.11 + p.y * 0.07 + s.x * 2.0);
            float lace = smoothstep(0.15, 0.75, texture2D(uRipples, p * 0.09 + vec2(t * 0.01, 0.0)).x + swell * 0.35);
            float foam = (1.0 - smoothstep(0.0, 0.9 + swell * 0.9, shore)) * lace * near;
            c = mix(c, mix(vec3(0.93, 0.95, 0.98), uHorizon, 0.25) * (1.0 - uNight * 0.7), foam * 0.55);

            // Mist over the far water, the colour of the air.
            vec3 air = mix(uHaze, uHorizon, 0.6);
            c = mix(c, air, smoothstep(260.0, 2600.0, dist) * 0.9);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    // The shore never moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useFrame(({ camera }) => {
    const u = material.uniforms;
    u.uWater.value.copy(daylight.water);
    // Shallows: the same water a little lighter and greener, never sandy.
    u.uShallow.value.copy(daylight.water).lerp(daylight.horizon, 0.28).offsetHSL(-0.03, 0.04, 0.03);
    // The glint follows whichever light is in the sky.
    const night = Math.min(daylight.stars * 1.4, 1);
    if (night > 0.5) {
      u.uGlintDir.value.copy(daylight.moonDir);
      u.uGlint.value.set("#C9D4F4").multiplyScalar(0.55 * night);
    } else {
      u.uGlintDir.value.copy(daylight.sunDir);
      u.uGlint.value.copy(daylight.key).multiplyScalar(daylight.keyPower * (1 - night));
    }
    const m = mesh.current;
    if (!m) return;
    waterMesh = m;
    // A sea that never ends: the plane follows the camera across the bay.
    m.position.set(Math.round(camera.position.x / 50) * 50, WATER_Y, Math.round(camera.position.z / 50) * 50);
  });
  // Drawn after every solid thing on land, so the depth test skips each water pixel they cover.
  return (
    <mesh ref={mesh} material={material} rotation-x={-Math.PI / 2} frustumCulled={false} renderOrder={2}>
      <planeGeometry args={[9000, 9000, 1, 1]} />
    </mesh>
  );
}
