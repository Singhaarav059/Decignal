"use client";

// Bake: merges the static meshes under it into one mesh per material, once, after they mount. The
// bay is built from hundreds of small procedural parts (lamp heads, bolts, window frames); drawn one
// by one they cost a draw call each in the main pass, the shadow pass and the contact pass. Merged,
// the same picture costs a few dozen calls.
//
// Left alone, and still drawn as they are: anything under an object marked userData.live (people,
// ships, anything a component moves), instanced or skinned meshes, transparent or custom-shaded
// materials (their shaders may read object-space positions), mirrored meshes (their winding would
// flip) and contact-shadow grounds.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useLayoutEffect, useRef } from "react";
import { grounds } from "./sets";

/** Marks a subtree as moving, so Bake leaves it alone. Spread onto a group: <group {...LIVE}>. */
export const LIVE = { userData: { live: true } } as const;

const rel = new THREE.Matrix4();
const inv = new THREE.Matrix4();

function isLive(o: THREE.Object3D, root: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) if (p.userData.live) return true;
  return false;
}

function bakeable(m: THREE.Mesh) {
  if (!m.visible || (m as THREE.InstancedMesh).isInstancedMesh || (m as THREE.SkinnedMesh).isSkinnedMesh) return false;
  if (Object.keys(m.geometry.morphAttributes).length || grounds.has(m) || m.userData.noBake) return false;
  const mat = m.material;
  if (Array.isArray(mat) || mat.transparent || (mat as THREE.ShaderMaterial).isShaderMaterial) return false;
  // A custom shader hook may read object-space positions, which merging would change.
  if (mat.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile && !mat.userData.bakeSafe) return false;
  return true;
}

function signature(g: THREE.BufferGeometry) {
  const a = Object.keys(g.attributes)
    .sort()
    .map((k) => `${k}${g.attributes[k].itemSize}`)
    .join(",");
  return `${a}|${g.index ? "i" : "n"}|${g.groups.length}`;
}

export function Bake({ children }: { children: React.ReactNode }) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = root.current;
    if (!g) return;
    performance.mark("world:bake-start");
    g.updateWorldMatrix(true, true);
    inv.copy(g.matrixWorld).invert();
    const buckets = new Map<string, { mat: THREE.Material; cast: boolean; receive: boolean; order: number; parts: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !bakeable(m) || isLive(m, g)) return;
      for (let p: THREE.Object3D | null = m; p && p !== g; p = p.parent) if (!p.visible) return;
      rel.multiplyMatrices(inv, m.matrixWorld);
      if (rel.determinant() < 0) return;
      const mat = m.material as THREE.Material;
      const key = `${mat.uuid}|${m.castShadow}|${m.receiveShadow}|${m.renderOrder}|${signature(m.geometry)}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat, cast: m.castShadow, receive: m.receiveShadow, order: m.renderOrder, parts: [], meshes: [] }));
      const part = m.geometry.clone();
      part.clearGroups();
      part.applyMatrix4(rel);
      b.parts.push(part);
      b.meshes.push(m);
    });
    const baked: THREE.Mesh[] = [];
    for (const b of buckets.values()) {
      // A material used once gains nothing from merging: leave that mesh as it is.
      if (b.meshes.length < 2) {
        b.parts.forEach((p) => p.dispose());
        continue;
      }
      const merged = mergeGeometries(b.parts, false);
      b.parts.forEach((p) => p.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, b.mat);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      mesh.renderOrder = b.order;
      mesh.userData.baked = true;
      g.add(mesh);
      baked.push(mesh);
      b.meshes.forEach((m) => (m.visible = false));
    }
    performance.mark("world:bake-end");
    return () => {
      baked.forEach((m) => {
        g.remove(m);
        m.geometry.dispose();
      });
      buckets.forEach((b) => b.meshes.forEach((m) => (m.visible = true)));
    };
  }, []);
  return <group ref={root}>{children}</group>;
}
