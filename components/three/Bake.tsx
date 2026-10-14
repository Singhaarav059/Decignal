"use client";

// Bake: merges the static meshes under it into one mesh per material, once, after they mount. The
// models are built from many small procedural parts (bollards, frames, wheels, lamps); drawn one by
// one they cost a draw call each in the main pass, the shadow pass and the contact-shadow pass.
// Merged, the same picture costs a handful.
//
// Left alone, and still drawn as they are: anything under an object marked LIVE (people, a forklift's
// carriage, anything a component moves each frame), instanced meshes, transparent or custom-shaded
// materials (their shaders may read object-space positions) and meshes marked userData.noBake.
// The originals stay in the tree, hidden, so React can still unmount them; they are restored if the
// Bake unmounts first.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useLayoutEffect, useRef } from "react";

/** Marks a subtree as moving, so Bake leaves it alone. Spread onto a group: <group {...LIVE}>. */
export const LIVE = { userData: { live: true } } as const;

const rel = new THREE.Matrix4();
const noRaycast = () => {};

function isLive(o: THREE.Object3D, root: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) if (p.userData.live) return true;
  return false;
}

function bakeable(m: THREE.Mesh) {
  if (!m.visible || (m as THREE.InstancedMesh).isInstancedMesh || (m as THREE.SkinnedMesh).isSkinnedMesh) return false;
  if (Object.keys(m.geometry.morphAttributes).length || m.userData.noBake || !m.geometry.attributes.position) return false;
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
  return `${a}|${g.index ? "i" : "n"}`;
}

/** A mirrored part (negative scale) turns inside out once its matrix is baked in: reverse its winding. */
function flipWinding(g: THREE.BufferGeometry) {
  if (g.index) {
    const ix = g.index;
    for (let i = 0; i < ix.count; i += 3) {
      const b = ix.getX(i + 1);
      ix.setX(i + 1, ix.getX(i + 2));
      ix.setX(i + 2, b);
    }
    return;
  }
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name] as THREE.BufferAttribute;
    const n = a.itemSize;
    const arr = a.array as Float32Array;
    for (let v = 0; v + 2 < a.count; v += 3) {
      for (let k = 0; k < n; k++) {
        const i1 = (v + 1) * n + k;
        const i2 = (v + 2) * n + k;
        const t = arr[i1];
        arr[i1] = arr[i2];
        arr[i2] = t;
      }
    }
  }
}

type Bucket = { mat: THREE.Material; cast: boolean; receive: boolean; order: number; layers: number; parts: THREE.BufferGeometry[]; meshes: THREE.Mesh[] };

export function Bake({ children, ...props }: React.ComponentProps<"group">) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = root.current;
    if (!g) return;
    const buckets = new Map<string, Bucket>();
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !bakeable(m) || isLive(m, g)) return;
      for (let p: THREE.Object3D | null = m; p && p !== g; p = p.parent) if (!p.visible) return;
      // The part's transform relative to the Bake root, from local matrices only: an ancestor above
      // the root may still be at scale 0 when this runs, which a world-matrix inverse cannot undo.
      rel.identity();
      for (let p: THREE.Object3D | null = m; p && p !== g; p = p.parent) {
        if (p.matrixAutoUpdate) p.updateMatrix();
        rel.premultiply(p.matrix);
      }
      const mat = m.material as THREE.Material;
      const key = `${mat.uuid}|${m.castShadow}|${m.receiveShadow}|${m.renderOrder}|${m.layers.mask}|${signature(m.geometry)}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat, cast: m.castShadow, receive: m.receiveShadow, order: m.renderOrder, layers: m.layers.mask, parts: [], meshes: [] }));
      // A plain copy: clone() first builds a default instance of the geometry's class (a whole rounded
      // box, a 32-sided cylinder) only to overwrite it.
      const part = new THREE.BufferGeometry().copy(m.geometry);
      part.clearGroups();
      part.applyMatrix4(rel);
      if (rel.determinant() < 0) flipWinding(part);
      b.parts.push(part);
      b.meshes.push(m);
    });
    const baked: THREE.Mesh[] = [];
    const hidden: THREE.Mesh[] = [];
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
      merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, b.mat);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      mesh.renderOrder = b.order;
      mesh.layers.mask = b.layers;
      mesh.userData.baked = true;
      // The hidden originals still answer rays (three does not skip invisible meshes), so the merged
      // copy stays out of hit tests and nothing is hit twice.
      mesh.raycast = noRaycast;
      mesh.matrixAutoUpdate = false;
      g.add(mesh);
      baked.push(mesh);
      b.meshes.forEach((m) => {
        m.visible = false;
        m.matrixAutoUpdate = false;
        m.userData.bakedAway = true;
        hidden.push(m);
      });
    }
    return () => {
      baked.forEach((m) => {
        g.remove(m);
        m.geometry.dispose();
      });
      hidden.forEach((m) => {
        m.visible = true;
        m.matrixAutoUpdate = true;
        m.userData.bakedAway = false;
      });
    };
  }, []);
  return (
    <group ref={root} {...props}>
      {children}
    </group>
  );
}
