"use client";

// The story's building blocks: the ground pad each of the six systems stands on, the stock tote,
// and the model on each pad. Models live in vehicles.tsx and buildings.tsx.
import * as THREE from "three";
import { useEffect } from "react";
import { TINTS } from "./palette";
import { Tote } from "./parts";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { concrete, plastic } from "./materials";
import { Factory, Globe, ServerRacks, Storefront, SupplierTruck, Warehouse } from "./buildings";

const cache = new Map<string, THREE.MeshPhysicalMaterial>();
/** Soft satin finish for UI-like objects (cards, chart marks). */
export function clay(color: string, rough = 0.5) {
  const key = `${color}-${rough}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat: 0.35, clearcoatRoughness: 0.35 });
    cache.set(key, m);
  }
  return m;
}

export const WHITE = "#FAFBFC";

const pendingDispose = new Map<unknown, number>();
/**
 * Frees `value` (a material, geometry or texture made for one component) once that component has really
 * gone, a tick after the renderer stopped drawing it. React's development double mount (StrictMode, Fast
 * Refresh) cleans up and sets up again at once: the second setup cancels the disposal, so nothing is
 * freed while still on screen, which rebuilt its shader program and deleted the first mid-link.
 */
export function useDisposeOnUnmount<T>(value: T, dispose: (v: T) => void) {
  useEffect(() => {
    const id = pendingDispose.get(value);
    if (id !== undefined) {
      window.clearTimeout(id);
      pendingDispose.delete(value);
    }
    return () => {
      pendingDispose.set(
        value,
        window.setTimeout(() => {
          pendingDispose.delete(value);
          dispose(value);
        }, 0),
      );
    };
    // The disposer is fixed per value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

type G = React.ComponentProps<"group">;

/** A system's yard: a poured concrete slab, 1.9 x 1.6 and a kerb's height thick, with a painted edge line. */
export const PAD = { w: 1.9, d: 1.6, h: 0.034, r: 0.09, line: 0.012, inset: 0.06 };
/** Models stand on the pad's top (lib/scene ISLAND_TOP should match it). */
export const PAD_TOP = PAD.h + 0.002;

function roundRect(w: number, d: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

let padGeo: THREE.BufferGeometry | null = null;
let lineGeo: THREE.BufferGeometry | null = null;
/** The slab: extruded from a rounded rectangle with a small arris, lying flat on the ground. */
const pad = () =>
  (padGeo ??= (() => {
    const bevel = 0.005;
    const g = new THREE.ExtrudeGeometry(roundRect(PAD.w - bevel * 2, PAD.d - bevel * 2, PAD.r), {
      depth: PAD.h - bevel * 2,
      bevelEnabled: true,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 2,
      curveSegments: 8,
    });
    g.rotateX(-Math.PI / 2).translate(0, bevel, 0);
    // Planar UVs in metres-ish units, so the concrete grain keeps its scale on the top face.
    const pos = g.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) uv.set([pos.getX(i) / PAD.w + 0.5, pos.getZ(i) / PAD.d + 0.5], i * 2);
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  })());
/** The painted line: a rounded-rectangle ring inset from the pad's edge, the way a yard bay is marked. */
const line = () =>
  (lineGeo ??= (() => {
    const { w, d, r, line: t, inset } = PAD;
    const outer = roundRect(w - inset * 2, d - inset * 2, Math.max(r - inset, 0.02));
    outer.holes.push(roundRect(w - (inset + t) * 2, d - (inset + t) * 2, Math.max(r - inset - t, 0.012)));
    return new THREE.ShapeGeometry(outer, 8).rotateX(-Math.PI / 2);
  })());

export { pad as padGeometry, line as padLineGeometry };

/** Paints every vertex one colour (linear), so differently coloured parts can share one draw. With
 *  `side`, faces that are not facing up take that colour: the slab's edge reads as a crisp kerb. */
function tint(g: THREE.BufferGeometry, hex: string, side?: string) {
  const c = new THREE.Color(hex);
  const e = new THREE.Color(side ?? hex);
  const n = g.attributes.position.count;
  const nrm = g.attributes.normal;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = side && nrm ? THREE.MathUtils.smoothstep(nrm.getY(i), 0.55, 0.9) : 1;
    a.set([e.r + (c.r - e.r) * k, e.g + (c.g - e.g) * k, e.b + (c.b - e.b) * k], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return g;
}

let yardGeo: THREE.BufferGeometry | null = null;
let yardMat: THREE.MeshStandardMaterial | null = null;
/** Pad and painted line as one mesh: the slab in concrete grey, the line in white, one draw per system. */
const yard = () =>
  (yardGeo ??= mergeGeometries(
    [tint(pad().clone(), "#E6E9ED", "#C9CFD7"), tint(line().clone().toNonIndexed().translate(0, PAD.h + 0.001, 0), "#F7F9FB")],
    false,
  )!);
/** The concrete finish (grain in roughness and bump) taking its colour from the vertices. */
const yardMaterial = () => {
  if (!yardMat) {
    yardMat = (concrete("#FFFFFF") as THREE.MeshStandardMaterial).clone();
    yardMat.vertexColors = true;
  }
  return yardMat;
};

/** One system's ground: a concrete pad with a white painted edge. No colour: the model carries it. */
export function Island({ children, ...p }: G) {
  return (
    <group {...p}>
      <mesh geometry={yard()} material={yardMaterial()} castShadow receiveShadow />
      <group position-y={PAD_TOP}>{children}</group>
    </group>
  );
}

/** A stackable stock tote; closed (lidded) unless `open`. */
export function Crate({ color = TINTS.saffron, material, open = false, children }: { color?: string; material?: THREE.Material; open?: boolean; children?: React.ReactNode }) {
  return (
    <Tote material={material ?? plastic(color, 0.5, true)} open={open}>
      {children}
    </Tote>
  );
}

export { ServerRacks, Storefront, Factory, Warehouse, SupplierTruck, Globe };

/** Model for each system, in SYSTEMS order: ERP, CRM, MES, WMS, suppliers, external. */
export const SYSTEM_MODELS = [ServerRacks, Storefront, Factory, Warehouse, SupplierTruck, Globe];
