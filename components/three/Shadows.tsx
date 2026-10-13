"use client";

// The key light's shadow, drawn only when it can have changed. The map is a view of the world from a
// fixed light, so it depends on what stands in the world, not on the camera: a scroll that only moves
// the camera leaves it as it was. Three redrew it on every frame; here the main render checks what the
// map sees (each visible object's world matrix, visibility, geometry and instances) and redraws it
// only after a change. The ground that catches it spans only where shadows can fall.
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { KEY_POS } from "./Studio";

const SLOT = 24;

/** One scene's gate (the story and the explorer each have one). */
type Gate = {
  /** Each caster's state at the last check, SLOT numbers apiece, and how many there were. */
  seen: Float64Array;
  n: number;
  /** The shadow casters in view at the last check, for the floor's footprint. */
  casters: THREE.Object3D[];
  /** 0 once the floor is fitted to the latest check. */
  floorAt: number;
};
const gates = new WeakMap<THREE.Scene, Gate>();
function gateOf(scene: THREE.Scene) {
  let g = gates.get(scene);
  if (!g) gates.set(scene, (g = { seen: new Float64Array(SLOT * 256), n: -1, casters: [], floorAt: -1 }));
  return g;
}

/** True when any shadow caster in view differs from the last main render. Writes the new state. */
function worldMoved(scene: THREE.Scene, gate: Gate) {
  let i = 0;
  let moved = false;
  const casters = gate.casters;
  let seen = gate.seen;
  casters.length = 0;
  scene.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    // Only casters draw into the map.
    if (!o.castShadow || (!m.isMesh && !(o as THREE.Line).isLine && !(o as THREE.Points).isPoints)) return;
    casters.push(o);
    const base = i * SLOT;
    if (base + SLOT > seen.length) {
      const next = new Float64Array(seen.length * 2);
      next.set(seen);
      seen = gate.seen = next;
    }
    const e = o.matrixWorld.elements;
    const g = m.geometry;
    const inst = (o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh) : null;
    const mat = Array.isArray(m.material) ? null : m.material;
    const v0 = o.id;
    const v17 = g?.id ?? 0;
    const v18 = g?.drawRange.count === Infinity ? -1 : (g?.drawRange.count ?? 0);
    const v19 = ((g?.attributes.position as THREE.BufferAttribute | undefined)?.version ?? 0) + (g?.index?.version ?? 0) * 1e-3;
    const v20 = (g as THREE.InstancedBufferGeometry | undefined)?.instanceCount ?? 0;
    const v21 = inst ? inst.instanceMatrix.version + inst.count * 1e-4 : 0;
    const v22 = mat && !mat.visible ? 1 : 0;
    if (!moved) {
      if (seen[base] !== v0 || seen[base + 17] !== v17 || seen[base + 18] !== v18 || seen[base + 19] !== v19 || seen[base + 20] !== v20 || seen[base + 21] !== v21 || seen[base + 22] !== v22) moved = true;
      else
        for (let k = 0; k < 16; k++)
          if (seen[base + 1 + k] !== e[k]) {
            moved = true;
            break;
          }
    }
    seen[base] = v0;
    for (let k = 0; k < 16; k++) seen[base + 1 + k] = e[k];
    seen[base + 17] = v17;
    seen[base + 18] = v18;
    seen[base + 19] = v19;
    seen[base + 20] = v20;
    seen[base + 21] = v21;
    seen[base + 22] = v22;
    i++;
  });
  if (i !== gate.n) moved = true;
  gate.n = i;
  return moved;
}

/** A hidden part keeps its matrices as they were: three would otherwise walk every chapter's models
 *  (and Bake's hidden originals) twice a frame. Shown again, it is brought up to date before it draws. */
function updateIfShown(this: THREE.Object3D, force?: boolean) {
  if (this.visible) THREE.Object3D.prototype.updateMatrixWorld.call(this, force);
}
function skipHidden(root: THREE.Object3D) {
  root.traverse((o) => {
    // Cameras and anything else with its own update keep it.
    if (o.updateMatrixWorld === THREE.Object3D.prototype.updateMatrixWorld) o.updateMatrixWorld = updateIfShown;
  });
}

/**
 * Owns the key light's shadow map: drawn in the main render when the world changed, and not in other
 * renders of the scene. Also keeps hidden parts out of the matrix walk.
 */
export function ShadowGate() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const frames = useRef(0);
  useEffect(() => {
    const sm = gl.shadowMap;
    const gate = gateOf(scene);
    sm.autoUpdate = false;
    sm.needsUpdate = true;
    gate.n = -1;
    const before = scene.onBeforeRender;
    scene.onBeforeRender = (...args) => {
      before.apply(scene, args);
      // Only the view itself decides; any other render of the scene (a contact-shadow pass) reuses the map.
      if (args[2] !== camera) return;
      if (worldMoved(scene, gate)) {
        sm.needsUpdate = true;
        gate.floorAt = -1;
      }
    };
    const restored = () => {
      gate.n = -1;
      sm.needsUpdate = true;
    };
    gl.domElement.addEventListener("webglcontextrestored", restored);
    return () => {
      scene.onBeforeRender = before;
      sm.autoUpdate = true;
      gl.domElement.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl, scene, camera]);
  // Parts mount as the scene loads and its chapters or worlds build: new ones join the skip twice a second.
  useFrame(() => {
    if (frames.current++ % 30 === 0) skipHidden(scene);
  });
  return null;
}

/** The world-space corners of o's bounds, one at a time, into `corner`. */
function eachCorner(o: THREE.Object3D, fn: () => void) {
  const g = (o as THREE.Mesh).geometry;
  if (!g) return;
  if ((o as THREE.InstancedMesh).isInstancedMesh) {
    // Its instances move (wheels): their bounds are taken afresh.
    const im = o as THREE.InstancedMesh;
    im.computeBoundingBox();
    box3.copy(im.boundingBox!);
  } else {
    if (!g.boundingBox) g.computeBoundingBox();
    box3.copy(g.boundingBox!);
  }
  for (let c = 0; c < 8; c++) {
    corner.set(c & 1 ? box3.max.x : box3.min.x, c & 2 ? box3.max.y : box3.min.y, c & 4 ? box3.max.z : box3.min.z).applyMatrix4(o.matrixWorld);
    fn();
  }
}

/** Light direction, from the key light toward the origin it aims at. */
const LIGHT = new THREE.Vector3(...KEY_POS).negate().normalize();
const box3 = new THREE.Box3();
const corner = new THREE.Vector3();
/** Shadow-map reach on the ground: the key light's box (Studio KeyLight extent 11) never casts beyond it. */
const REACH = 20;
/** Clear ground around the shadows: their soft edge (PCF radius), the bias, and a frame's travel of a
 *  fast caster (the floor is fitted to the last frame's positions). */
const PAD = 0.6;

/**
 * The ground that catches the key light's shadow. Fully clear wherever nothing shades it, so it only
 * spans the ground the visible casters' shadows can reach: drawn across the whole screen it shaded
 * every pixel (five shadow taps each) at the phone's full density, mostly to draw nothing. Re-fitted
 * after the world changes; hidden when nothing casts a shadow.
 */
export function ShadowFloor({ color, opacity }: { color: THREE.ColorRepresentation; opacity: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    const m = ref.current;
    const gate = gateOf(scene);
    if (!m || gate.floorAt === 0) return;
    gate.floorAt = 0;
    let x0 = Infinity;
    let z0 = Infinity;
    let x1 = -Infinity;
    let z1 = -Infinity;
    for (const o of gate.casters)
      eachCorner(o, () => {
        // Where this corner's shadow meets the ground (y = 0), and the corner itself.
        const t = Math.max(corner.y, 0) / -LIGHT.y;
        const sx = corner.x + LIGHT.x * t;
        const sz = corner.z + LIGHT.z * t;
        x0 = Math.min(x0, sx, corner.x);
        x1 = Math.max(x1, sx, corner.x);
        z0 = Math.min(z0, sz, corner.z);
        z1 = Math.max(z1, sz, corner.z);
      });
    x0 = Math.max(x0 - PAD, -REACH);
    z0 = Math.max(z0 - PAD, -REACH);
    x1 = Math.min(x1 + PAD, REACH);
    z1 = Math.min(z1 + PAD, REACH);
    if (!(x1 > x0 && z1 > z0)) {
      m.visible = false;
      return;
    }
    m.visible = true;
    m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    m.scale.set(x1 - x0, z1 - z0, 1);
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} receiveShadow userData={{ shadowPlane: true }} visible={false}>
      <planeGeometry args={[1, 1]} />
      <shadowMaterial color={color} opacity={opacity} transparent />
    </mesh>
  );
}
