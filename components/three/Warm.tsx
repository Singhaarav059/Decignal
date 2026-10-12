"use client";

import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/**
 * Sends every model, texture and shader in the scene to the GPU once, while the loader is still up,
 * so no object stalls the scroll the first time it comes into view. Hidden and off-camera objects
 * are included; their visibility is restored before the next frame.
 */
export function prewarm(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const hidden: THREE.Object3D[] = [];
  const culled: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
    if (o.frustumCulled) {
      culled.push(o);
      o.frustumCulled = false;
    }
  });
  // Programs as drawn on screen (tone mapping and colour space included)...
  gl.compile(scene, camera);
  // ...then one tiny offscreen draw uploads geometry and textures and builds the shadow depth programs.
  const target = new THREE.WebGLRenderTarget(2, 2);
  const previous = gl.getRenderTarget();
  gl.setRenderTarget(target);
  gl.render(scene, camera);
  gl.setRenderTarget(previous);
  target.dispose();
  hidden.forEach((o) => (o.visible = false));
  culled.forEach((o) => (o.frustumCulled = true));
}

/** Mounted last inside a scene's Suspense: once every model exists, upload it all to the GPU in one go. */
export function Warm() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    // One frame later, so every object has been posed by its first useFrame.
    const id = requestAnimationFrame(() => prewarm(gl, scene, camera));
    return () => cancelAnimationFrame(id);
  }, [gl, scene, camera]);
  return null;
}
