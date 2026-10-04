"use client";

// ?m=<model>&a=<azimuth deg>&e=<elevation deg>&d=<distance>&y=<target y>&lift=<m>
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useEffect } from "react";
import { KeyLight, Studio } from "@/components/three/Studio";
import { Forklift, SemiTruck, TRUCK } from "@/components/three/vehicles";
import { Bearing, LoadedPallet, Tote } from "@/components/three/parts";
import { plastic } from "@/components/three/materials";
import { COLORS, TINTS } from "@/components/three/palette";
import * as kit from "@/components/three/kit";
import { Plant } from "@/components/three/buildings";

const q = () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);

function Cam() {
  const { camera } = useThree();
  useEffect(() => {
    const p = q();
    const a = THREE.MathUtils.degToRad(+(p.get("a") ?? 30));
    const e = THREE.MathUtils.degToRad(+(p.get("e") ?? 14));
    const d = +(p.get("d") ?? 6);
    const y = +(p.get("y") ?? 0.3);
    const x = +(p.get("x") ?? 0);
    camera.position.set(x + Math.sin(a) * Math.cos(e) * d, y + Math.sin(e) * d, Math.cos(a) * Math.cos(e) * d);
    camera.lookAt(x, y, 0);
  }, [camera]);
  return null;
}

const S = 0.135;

function Model() {
  const p = q();
  const m = p.get("m") ?? "truck";
  const lift = +(p.get("lift") ?? 0);
  const tote = plastic(TINTS.saffron, 0.5, true);
  switch (m) {
    case "truck":
      return (
        <group scale={S} position-x={-0.0}>
          <SemiTruck accent={TINTS.emerald}>
            {TRUCK.slots.map((x) => (
              <group key={x} position={[x, TRUCK.deckY, 0]} rotation-y={Math.PI / 2}>
                <LoadedPallet tote={tote} />
              </group>
            ))}
          </SemiTruck>
        </group>
      );
    case "forklift":
      return (
        <group scale={S * 2}>
          <Forklift color={TINTS.saffron} lift={() => lift}>
            {p.get("load") && (
              <group rotation-y={Math.PI / 2}>
                <LoadedPallet tote={tote} />
              </group>
            )}
          </Forklift>
        </group>
      );
    case "tote":
      return (
        <group>
          <Tote material={tote} open>
            {[-0.15, 0, 0.15].map((x) => (
              <Bearing key={x} position={[x, 0.135, 0]} />
            ))}
          </Tote>
          <group position={[0.8, 0, 0]}>
            <Tote material={tote} />
          </group>
        </group>
      );
    case "islands":
      return (
        <>
          {kit.SYSTEM_MODELS.map((M, i) => (
            <kit.Island key={i} tone={Object.values(TINTS)[i]} position={[(i % 3) * 2.1 - 2.1, 0, Math.floor(i / 3) * 2.2 - 1.1]}>
              <M />
            </kit.Island>
          ))}
        </>
      );
    case "island": {
      const i = +(p.get("s") ?? 0);
      const M = kit.SYSTEM_MODELS[i];
      return (
        <kit.Island tone={Object.values(TINTS)[i]}>
          <M />
        </kit.Island>
      );
    }
    case "plant":
      return (
        <group scale={S}>
          <Plant accent={TINTS.saffron} name="PLANT 02" />
        </group>
      );
    default: {
      const Comp = (kit as unknown as Record<string, React.ComponentType>)[m];
      return Comp ? <Comp /> : null;
    }
  }
}

export default function LabScene() {
  return (
    <Canvas shadows="percentage" dpr={[1, 2]} camera={{ fov: 26, near: 0.05, far: 80 }} gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 0.95;
        gl.setClearColor(0x000000, 0);
      }}>
      <Studio />
      <KeyLight extent={5} />
      <Cam />
      <Model />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial color={COLORS.shadow} opacity={0.2} transparent />
      </mesh>
      <ContactShadows position={[0, 0.001, 0]} scale={10} resolution={1024} blur={1.2} far={0.6} opacity={0.45} color={COLORS.shadow} />
    </Canvas>
  );
}
