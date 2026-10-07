"use client";

// The studio the story is shot in: softbox lighting built in code, one key light with a
// sharp shadow. Contact shadows (in the scene) ground every object.
import { Environment, Lightformer } from "@react-three/drei";
import { COLORS } from "./palette";

export function Studio({ resolution = 1024 }: { resolution?: number }) {
  return (
    <Environment resolution={resolution} frames={1}>
      <color attach="background" args={[COLORS.envBase]} />
      {/* Overhead softbox: the broad, even top light of a product studio */}
      <Lightformer form="rect" intensity={1.8} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
      {/* Key strip from the left and a narrower rim from the right: long highlights on paint and glass */}
      <Lightformer form="rect" intensity={2.8} position={[-7, 2.5, 3]} rotation-y={Math.PI / 2} scale={[5, 7, 1]} />
      <Lightformer form="rect" intensity={1.8} position={[7, 1.5, -2]} rotation-y={-Math.PI / 2} scale={[2, 6, 1]} />
      <Lightformer form="rect" intensity={0.9} position={[0, 1, 9]} scale={[10, 3, 1]} />
      <Lightformer form="ring" intensity={1.2} position={[3, 5, 6]} scale={2} />
      {/* A dark studio floor and back wall in the reflections, so chrome and glass read as chrome and glass */}
      <Lightformer form="rect" color="#8C8780" intensity={1} position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
      <Lightformer form="rect" color="#3A3B40" intensity={1} position={[0, 0.6, -10]} scale={[30, 0.8, 1]} />
    </Environment>
  );
}

/** Key light: warm late-morning sun with a crisp, slightly softened shadow, and a cool sky fill. */
export function KeyLight({ extent = 11 }: { extent?: number }) {
  return (
    <>
    <hemisphereLight args={["#DCE6F5", "#F3E6D3", 0.35]} />
    <directionalLight
      position={[6, 10, 7]}
      color="#FFE8CC"
      intensity={1.65}
      castShadow
      shadow-mapSize={[4096, 4096]}
      shadow-bias={-0.0002}
      shadow-normalBias={0.012}
      shadow-radius={3}
      shadow-camera-left={-extent}
      shadow-camera-right={extent}
      shadow-camera-top={extent}
      shadow-camera-bottom={-extent}
      shadow-camera-near={1}
      shadow-camera-far={40}
    />
    </>
  );
}
