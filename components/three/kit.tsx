"use client";

// Procedural models for the story. Studio style: white bodies, one accent colour each,
// soft clay finish under a light clear glaze, and one small idle motion per object.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { CRATE, ISLAND_TOP } from "@/lib/scene";
import { TINTS } from "./palette";

const cache = new Map<string, THREE.MeshPhysicalMaterial>();
/** Shared clay material per colour. */
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
export const SHELL = "#EFECE6";
export const DARK = "#2A2B31";
const GLASS = "#BFD3FF";

const glass = () => {
  const key = "glass";
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({ color: GLASS, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0.1 });
    cache.set(key, m);
  }
  return m;
};

type G = React.ComponentProps<"group">;

/* ------------------------------------------------------------------ */

/** A coloured base with a white top: one system's ground. */
export function Island({ tone, children, ...p }: G & { tone: string }) {
  return (
    <group {...p}>
      <mesh position-y={0.07} castShadow receiveShadow material={clay(tone, 0.45)}>
        <cylinderGeometry args={[0.95, 0.97, 0.14, 72]} />
      </mesh>
      <mesh position-y={0.145} receiveShadow material={clay(WHITE, 0.6)}>
        <cylinderGeometry args={[0.87, 0.87, 0.02, 72]} />
      </mesh>
      <group position-y={ISLAND_TOP}>{children}</group>
    </group>
  );
}

/* ------------------------------------------------------------------ */

/** ERP: two server racks with status lights. */
export function ServerRacks() {
  const ledMats = useMemo(
    () =>
      Array.from(
        { length: 12 },
        (_, i) =>
          new THREE.MeshStandardMaterial({
            color: i % 4 === 0 ? TINTS.emerald : TINTS.cobalt,
            emissive: i % 4 === 0 ? TINTS.emerald : TINTS.cobalt,
            emissiveIntensity: 1.2,
          }),
      ),
    [],
  );
  // Status lights blink at their own rhythm: the system is live.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ledMats.forEach((m, i) => (m.emissiveIntensity = 0.4 + (Math.sin(t * (2 + (i % 3)) + i * 1.7) > 0.2 ? 1.6 : 0)));
  });
  return (
    <group>
      {[-0.22, 0.22].map((x, r) => (
        <group key={x} position={[x, 0, 0]}>
          <RoundedBox args={[0.38, 0.9, 0.5]} radius={0.04} smoothness={4} position-y={0.45} castShadow receiveShadow material={clay(DARK, 0.45)} />
          <RoundedBox args={[0.4, 0.05, 0.52]} radius={0.02} smoothness={3} position-y={0.915} castShadow material={clay(TINTS.cobalt, 0.4)} />
          {Array.from({ length: 6 }, (_, k) => (
            <group key={k} position={[0, 0.14 + k * 0.125, 0.252]}>
              <mesh material={clay("#3A3C44", 0.5)}>
                <boxGeometry args={[0.28, 0.07, 0.01]} />
              </mesh>
              <mesh position={[0.11, 0, 0.008]} material={ledMats[r * 6 + k]}>
                <sphereGeometry args={[0.012, 12, 12]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/** CRM: a storefront, where orders come from. */
export function Storefront() {
  const sign = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (sign.current) sign.current.rotation.z = Math.sin(clock.elapsedTime * 1.4) * 0.04;
  });
  return (
    <group>
      <RoundedBox args={[1.0, 0.55, 0.62]} radius={0.04} smoothness={4} position-y={0.275} castShadow receiveShadow material={clay(WHITE)} />
      <RoundedBox args={[1.08, 0.06, 0.7]} radius={0.025} smoothness={3} position-y={0.58} castShadow material={clay(TINTS.violet, 0.4)} />
      {/* Striped awning */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-0.425 + i * 0.17, 0.47, 0.38]} rotation-x={0.55} castShadow material={clay(i % 2 ? WHITE : TINTS.violet, 0.45)}>
          <boxGeometry args={[0.17, 0.02, 0.22]} />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0.312]} material={clay("#4B3A9E", 0.4)}>
        <boxGeometry args={[0.2, 0.3, 0.01]} />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.24, 0.312]} material={glass()}>
          <boxGeometry args={[0.26, 0.2, 0.01]} />
        </mesh>
      ))}
      {/* Hanging sign */}
      <group ref={sign} position={[0.62, 0.42, 0.3]}>
        <mesh position-y={-0.08} castShadow material={clay(TINTS.violet, 0.4)}>
          <boxGeometry args={[0.02, 0.14, 0.14]} />
        </mesh>
      </group>
    </group>
  );
}

/** MES: a sawtooth-roof factory with a working chimney. */
export function Factory() {
  const tooth = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.38, 0);
    s.lineTo(0, 0.24);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: false });
    g.translate(0, 0, -0.35);
    return g;
  }, []);
  const puffs = useRef<THREE.Mesh[]>([]);
  const puffMats = useMemo(
    () => [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, depthWrite: false })),
    [],
  );
  // Steam rises, swells and thins out: the plant is running.
  useFrame(({ clock }) => {
    puffs.current.forEach((m, i) => {
      const k = (clock.elapsedTime * 0.3 + i / 3) % 1;
      m.position.set(0.42 + k * 0.14, 0.95 + k * 0.5, -0.18);
      m.scale.setScalar(0.05 + k * 0.09);
      puffMats[i].opacity = Math.sin(k * Math.PI) * 0.9;
    });
  });
  return (
    <group>
      <RoundedBox args={[1.15, 0.42, 0.7]} radius={0.04} smoothness={4} position-y={0.21} castShadow receiveShadow material={clay(WHITE)} />
      {[0, 1, 2].map((k) => (
        <mesh key={k} geometry={tooth} position={[-0.57 + k * 0.38, 0.42, 0]} castShadow material={clay(TINTS.emerald, 0.45)} />
      ))}
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[-0.565 + k * 0.38, 0.54, 0]} material={glass()}>
          <boxGeometry args={[0.01, 0.2, 0.62]} />
        </mesh>
      ))}
      <mesh position={[0.42, 0.62, -0.18]} castShadow material={clay(WHITE)}>
        <cylinderGeometry args={[0.065, 0.075, 0.55, 24]} />
      </mesh>
      <mesh position={[0.42, 0.78, -0.18]} material={clay(TINTS.emerald, 0.4)}>
        <cylinderGeometry args={[0.068, 0.068, 0.06, 24]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) puffs.current[i] = el;
          }}
          material={puffMats[i]}
        >
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>
      ))}
      <mesh position={[0.1, 0.13, 0.352]} material={clay("#0B7A55", 0.4)}>
        <boxGeometry args={[0.26, 0.24, 0.01]} />
      </mesh>
    </group>
  );
}

/** A plastic stock tote. */
export function Crate({ color = TINTS.saffron, material }: { color?: string; material?: THREE.Material }) {
  const body = material ?? clay(color, 0.42);
  return (
    <group>
      <RoundedBox args={[CRATE.w, CRATE.h - 0.03, CRATE.d]} radius={0.035} smoothness={3} position-y={-0.015} castShadow receiveShadow material={body} />
      <RoundedBox args={[CRATE.w + 0.03, 0.04, CRATE.d + 0.03]} radius={0.015} smoothness={2} position-y={CRATE.h / 2 - 0.02} castShadow material={body} />
      <mesh position={[0, 0.0, CRATE.d / 2 + 0.002]} material={clay(WHITE, 0.6)}>
        <boxGeometry args={[0.22, 0.09, 0.004]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (CRATE.w / 2 + 0.001), 0.05, 0]} rotation-y={Math.PI / 2} material={clay(DARK, 0.6)}>
          <boxGeometry args={[0.14, 0.04, 0.004]} />
        </mesh>
      ))}
    </group>
  );
}

/** WMS: a warehouse with a roller door and stock outside. */
export function Warehouse({ accent = TINTS.saffron, crates = true }: { accent?: string; crates?: boolean }) {
  const roof = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.39, 0.39, 1.12, 40, 1, false, 0, Math.PI);
    g.rotateZ(Math.PI / 2);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  return (
    <group>
      <group position={[-0.15, 0, -0.08]}>
        <RoundedBox args={[1.1, 0.42, 0.78]} radius={0.03} smoothness={4} position-y={0.21} castShadow receiveShadow material={clay(WHITE)} />
        <mesh geometry={roof} position-y={0.42} castShadow material={clay(accent, 0.45)} />
        <mesh position={[0, 0.17, 0.392]} material={clay(SHELL, 0.5)}>
          <boxGeometry args={[0.42, 0.32, 0.01]} />
        </mesh>
        {[0, 1, 2, 3, 4].map((k) => (
          <mesh key={k} position={[0, 0.05 + k * 0.06, 0.398]} material={clay("#D9D4CB", 0.5)}>
            <boxGeometry args={[0.42, 0.006, 0.004]} />
          </mesh>
        ))}
      </group>
      {crates && (
        <group position={[0.5, CRATE.h / 2, 0.38]}>
          <Crate color={accent} />
          <group position={[0, 0, -0.5]}>
            <Crate color={accent} />
          </group>
        </group>
      )}
    </group>
  );
}

/** Suppliers: a delivery truck. */
export function Truck({ accent = TINTS.tangerine, cargo }: { accent?: string; cargo?: React.ReactNode }) {
  const body = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const wheels = useRef<(THREE.Group | null)[]>([]);
  const last = useRef<number | null>(null);
  const world = useMemo(() => new THREE.Vector3(), []);
  const lean = useRef(0);
  useFrame(({ clock }, dt) => {
    // Wheels roll exactly as far as the truck travels; the body squats back as it pulls away.
    let dx = 0;
    if (root.current) {
      root.current.getWorldPosition(world);
      if (last.current !== null) dx = world.x - last.current;
      last.current = world.x;
    }
    wheels.current.forEach((w) => w && (w.rotation.z -= dx / 0.09));
    const speed = dt > 0 ? dx / dt : 0;
    lean.current = THREE.MathUtils.damp(lean.current, THREE.MathUtils.clamp(speed * 0.03, -0.05, 0.05), 6, dt);
    if (body.current) {
      body.current.position.y = Math.sin(clock.elapsedTime * 9) * 0.004 * (0.4 + Math.min(Math.abs(speed), 1));
      body.current.rotation.z = lean.current;
    }
  });
  return (
    <group ref={root}>
      <group ref={body}>
        <RoundedBox args={[0.34, 0.34, 0.5]} radius={0.06} smoothness={4} position={[0.42, 0.29, 0]} castShadow material={clay(accent, 0.4)} />
        <mesh position={[0.592, 0.36, 0]} material={glass()}>
          <boxGeometry args={[0.01, 0.13, 0.4]} />
        </mesh>
        <RoundedBox args={[0.74, 0.08, 0.52]} radius={0.02} smoothness={2} position={[-0.12, 0.15, 0]} castShadow material={clay(DARK, 0.5)} />
        {cargo ?? (
          <>
            <RoundedBox args={[0.72, 0.44, 0.52]} radius={0.03} smoothness={4} position={[-0.12, 0.41, 0]} castShadow material={clay(WHITE)} />
            <mesh position={[-0.12, 0.36, 0.261]} material={clay(accent, 0.4)}>
              <boxGeometry args={[0.72, 0.05, 0.004]} />
            </mesh>
          </>
        )}
      </group>
      {[
        [0.42, 0.25],
        [0.42, -0.25],
        [-0.3, 0.25],
        [-0.3, -0.25],
      ].map(([x, z], i) => (
        <group
          key={`${x}${z}`}
          position={[x, 0.09, z]}
          ref={(el) => {
            wheels.current[i] = el;
          }}
        >
          <mesh rotation-x={Math.PI / 2} castShadow material={clay(DARK, 0.6)}>
            <cylinderGeometry args={[0.09, 0.09, 0.07, 32]} />
          </mesh>
          {/* Hub and two bolts, so the roll reads */}
          <mesh position-z={Math.sign(z) * 0.037} rotation-x={Math.PI / 2} material={clay("#C9CCD3", 0.3)}>
            <cylinderGeometry args={[0.042, 0.042, 0.006, 24]} />
          </mesh>
          {[0, Math.PI].map((a) => (
            <mesh key={a} position={[Math.cos(a) * 0.024, Math.sin(a) * 0.024, Math.sign(z) * 0.041]} material={clay(DARK, 0.5)}>
              <boxGeometry args={[0.012, 0.012, 0.004]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** External: the outside world, turning, with weather passing. */
export function Globe() {
  const globe = useRef<THREE.Group>(null);
  const cloud = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (globe.current) globe.current.rotation.y += dt * 0.35;
    if (cloud.current) cloud.current.rotation.y = -clock.elapsedTime * 0.5;
  });
  return (
    <group>
      <mesh position-y={0.025} castShadow receiveShadow material={clay(WHITE)}>
        <cylinderGeometry args={[0.26, 0.3, 0.05, 40]} />
      </mesh>
      <mesh position-y={0.14} material={clay(WHITE)}>
        <cylinderGeometry args={[0.03, 0.03, 0.2, 16]} />
      </mesh>
      <group position-y={0.6}>
        <mesh rotation-z={0.4} material={clay(TINTS.pink, 0.4)}>
          <torusGeometry args={[0.43, 0.018, 12, 64, Math.PI * 1.15]} />
        </mesh>
        <group ref={globe} rotation-z={0.4}>
          <mesh castShadow material={clay(WHITE, 0.45)}>
            <sphereGeometry args={[0.37, 48, 48]} />
          </mesh>
          {[-0.2, 0, 0.2].map((y) => (
            <mesh key={y} position-y={y} rotation-x={Math.PI / 2} material={clay(TINTS.pink, 0.4)}>
              <torusGeometry args={[Math.sqrt(0.372 ** 2 - y * y), 0.008, 8, 64]} />
            </mesh>
          ))}
          {[0, 1, 2].map((k) => (
            <mesh key={k} rotation-y={(k * Math.PI) / 3} material={clay(TINTS.pink, 0.4)}>
              <torusGeometry args={[0.372, 0.008, 8, 64]} />
            </mesh>
          ))}
        </group>
        <group ref={cloud}>
          <group position={[0.5, 0.2, 0]}>
            {[
              [0, 0, 0, 0.08],
              [0.08, 0.02, 0, 0.1],
              [0.17, 0, 0, 0.07],
            ].map(([x, y, z, r], i) => (
              <mesh key={i} position={[x, y, z]} castShadow material={clay("#FFFFFF", 0.7)}>
                <sphereGeometry args={[r, 20, 20]} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}

/** Model for each system, in SYSTEMS order. */
export const SYSTEM_MODELS = [ServerRacks, Storefront, Factory, Warehouse, Truck, Globe];
