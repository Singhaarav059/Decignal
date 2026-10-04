"use client";

// The story's building blocks: island bases for the six systems, the stock tote, and the
// model that stands on each island. Models live in vehicles.tsx and buildings.tsx.
import * as THREE from "three";
import { ISLAND_TOP } from "@/lib/scene";
import { TINTS } from "./palette";
import { Tote } from "./parts";
import { aluminium, concrete, paint, plastic } from "./materials";
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

export const WHITE = "#FBFAF7";

type G = React.ComponentProps<"group">;

/** One system's ground: a glazed base in its colour, a brushed metal edge, a concrete pad. */
export function Island({ tone, children, ...p }: G & { tone: string }) {
  return (
    <group {...p}>
      <mesh position-y={0.062} castShadow receiveShadow material={paint(tone, 0.28)}>
        <cylinderGeometry args={[0.95, 0.97, 0.124, 96]} />
      </mesh>
      <mesh position-y={0.129} castShadow material={aluminium(0.3)}>
        <cylinderGeometry args={[0.905, 0.94, 0.012, 96]} />
      </mesh>
      <mesh position-y={0.145} receiveShadow material={concrete("#EAE7E1")}>
        <cylinderGeometry args={[0.9, 0.9, 0.02, 96]} />
      </mesh>
      <group position-y={ISLAND_TOP}>{children}</group>
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
