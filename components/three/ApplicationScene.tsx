"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Studio } from "./Studio";
import { COLORS } from "./palette";
import type { DemoKind } from "@/lib/application-demos";
import { Logistics, Maintenance, Production, SupplyRisk, Distribution, DealerNetwork, Customer, Finance, type SceneProps } from "./OperationalScenes";
import { phase, type Motion } from "./SceneKit";

type Props=SceneProps&{kind:DemoKind;active:boolean};

function Camera({kind,motion,still}:{kind:DemoKind;motion:Motion;still:boolean}){
  const {camera,size}=useThree();
  const target=useMemo(()=>new THREE.Vector3(),[]);
  useFrame((_,dt)=>{
    const p=motion.current.progress;
    const close = kind === "maintenance" ? 1 + phase(p, 0.15, 0.45) * 0.06 : 1;
    // Phones are width-bound: frame the working area a little tighter so the models and their tags read.
    const fit = (kind === "inventory" ? 10.3 : kind === "maintenance" ? 8.4 : 9) * (size.width < 768 ? 0.9 : 1);
    const viewHeight = kind === "risk" ? 5.8 : kind === "maintenance" ? 5.2 : kind === "finance" ? 4.2 : kind === "customer" ? 4.6 : kind === "inventory" ? 4.6 : 5.3;
    const zoom = Math.min(size.width / fit, size.height / viewHeight, 120) * close;
    const c = camera as THREE.OrthographicCamera;
    c.zoom = still ? zoom : THREE.MathUtils.damp(c.zoom, zoom, 6, Math.min(dt, 0.05));
    c.position.set(kind === "maintenance" ? 4.2 : kind === "finance" ? 0.7 : 4.6, kind === "maintenance" ? 3.6 : kind === "finance" ? 7 : 5.4, 8.5);
    target.set(kind === "maintenance" ? -0.15 : 0, kind === "maintenance" ? 0.52 : kind === "risk" ? 0.65 : 0.25, kind === "inventory" ? -0.45 : kind === "risk" ? -0.4 : 0);
    c.lookAt(target);
    c.updateProjectionMatrix();
  });
  return null;
}
function Stage(props:Props){
  const model=props.kind==="inventory"?<Logistics {...props}/>:props.kind==="maintenance"?<Maintenance {...props}/>:props.kind==="production"?<Production {...props}/>:props.kind==="risk"?<SupplyRisk {...props}/>:props.kind==="customer"?<Customer {...props}/>:props.kind==="finance"?<Finance {...props}/>:props.kind==="sales"?<DealerNetwork {...props}/>:<Distribution {...props}/>;
  return <group dispose={null}>{model}</group>;
}
export default function ApplicationScene(props:Props){
  return <Canvas dpr={[1,2]} shadows="percentage" frameloop={props.active&&!props.still?"always":"demand"} orthographic camera={{position:[4.6,5.4,8.5],zoom:80,near:0.1,far:50}}
    gl={{antialias:true,alpha:true,powerPreference:"high-performance"}}
    onCreated={({gl})=>{gl.toneMapping=THREE.NeutralToneMapping;gl.toneMappingExposure=0.95;}}>
    <Suspense fallback={null}>
      <Studio resolution={512}/><Camera kind={props.kind} motion={props.motion} still={props.still}/>
      <directionalLight position={[4,9,6]} intensity={1.5} castShadow shadow-mapSize={[2048,2048]} shadow-normalBias={0.012} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7}/>
      <Stage key={props.kind} {...props}/>
      <mesh rotation-x={-Math.PI/2} position-y={-0.065} receiveShadow><planeGeometry args={[30,30]}/><shadowMaterial color={COLORS.shadow} opacity={0.12}/></mesh>
      <ContactShadows position={[0,-0.05,0]} scale={14} blur={1.8} opacity={0.36} far={1.5} resolution={512} frames={props.active?Infinity:1} color={COLORS.shadow}/>
    </Suspense>
  </Canvas>;
}
