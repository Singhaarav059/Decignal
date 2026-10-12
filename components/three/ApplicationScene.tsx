"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Studio } from "./Studio";
import { COLORS } from "./palette";
import type { DemoKind } from "@/lib/application-demos";
import { Logistics, Maintenance, Production, SupplyRisk, Distribution, DealerNetwork, Customer, Finance, type SceneProps } from "./OperationalScenes";
import { phase, type Motion } from "./SceneKit";
import { Warm } from "./Warm";
import { canvasQuality } from "@/lib/device";

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
    target.set(kind === "maintenance" ? -0.15 : 0, kind === "maintenance" ? 0.52 : kind === "risk" ? 0.65 : 0.25, kind === "inventory" ? -0.45 : kind === "risk" ? -0.4 : kind === "finance" ? 0.45 : 0);
    c.lookAt(target);
    c.updateProjectionMatrix();
  });
  return null;
}
const KINDS:DemoKind[]=["inventory","demand","production","maintenance","risk","sales","customer","finance"];
const MODELS:Record<DemoKind,(p:SceneProps)=>React.ReactNode>={inventory:Logistics,demand:Distribution,production:Production,maintenance:Maintenance,risk:SupplyRisk,sales:DealerNetwork,customer:Customer,finance:Finance};
const REST={progress:0};
/** A hidden world keeps its matrices as they were: three would otherwise walk all eight every frame. */
const skipWhenHidden=(g:THREE.Group|null)=>{if(g)g.updateMatrixWorld=function(force){if(this.visible)THREE.Group.prototype.updateMatrixWorld.call(this,force);};};
/**
 * All eight worlds stay built; only the current one is shown. Switching chapters then costs nothing,
 * where rebuilding a world (geometry, textures, shaders) stalled the scroll for a fifth of a second.
 * A hidden world rests at its opening pose and follows the scroll again once it is shown.
 */
function Stages(props:Props){
  const current=useRef(props.kind);
  useLayoutEffect(()=>{current.current=props.kind;},[props.kind]);
  const motions=useMemo(()=>Object.fromEntries(KINDS.map((k)=>[k,{get current(){return current.current===k?props.motion.current:REST;}}])) as unknown as Record<DemoKind,Motion>,[props.motion]);
  return <>{KINDS.map((k)=>{const Model=MODELS[k];const on=k===props.kind;return <group key={k} ref={skipWhenHidden} visible={on} dispose={null}><Model motion={motions[k]} step={on?props.step:0} still={props.still} tone={props.tone}/></group>;})}</>;
}
export default function ApplicationScene(props:Props){
  // Full device density on phones too; the shadow maps are sized to the scene's on-screen size.
  const q=useMemo(()=>canvasQuality(),[]);
  return <Canvas dpr={q.dpr} shadows="percentage" frameloop={props.active&&!props.still?"always":"demand"} orthographic camera={{position:[4.6,5.4,8.5],zoom:80,near:0.1,far:50}}
    gl={{antialias:q.antialias,alpha:true,powerPreference:"high-performance"}}
    onCreated={({gl})=>{gl.toneMapping=THREE.NeutralToneMapping;gl.toneMappingExposure=0.95;}}>
    <Suspense fallback={null}>
      <Studio resolution={512}/><Camera kind={props.kind} motion={props.motion} still={props.still}/>
      <directionalLight position={[4,9,6]} intensity={1.5} castShadow shadow-mapSize={q.phone?[1024,1024]:[2048,2048]} shadow-normalBias={0.012} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7}/>
      <Stages {...props}/>
      <mesh rotation-x={-Math.PI/2} position-y={-0.065} receiveShadow><planeGeometry args={[30,30]}/><shadowMaterial color={COLORS.shadow} opacity={0.12}/></mesh>
      <Warm/>
      <ContactShadows position={[0,-0.05,0]} scale={14} blur={1.8} opacity={0.36} far={1.5} resolution={q.phone?256:512} frames={props.active?Infinity:1} color={COLORS.shadow}/>
    </Suspense>
  </Canvas>;
}
