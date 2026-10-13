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
    // Parts a Bake merged away are never drawn again: leave them hidden.
    if (!o.visible && !o.userData.bakedAway) {
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

/**
 * Mounted last inside a scene's Suspense: once every model exists, compile its shaders off the main
 * thread where the browser can (KHR_parallel_shader_compile), then upload it all to the GPU in one go.
 * A synchronous compile here stalled the page's scroll for a few hundred milliseconds each time a
 * world was added. The canvas is marked data-ready once the first warm-up is done (it fades in).
 */
export function Warm() {
  const { gl, scene, camera, invalidate } = useThree();
  useEffect(() => {
    let live = true;
    // One frame later, so every object has been posed by its first useFrame.
    const id = requestAnimationFrame(() => {
      const hidden: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible && !o.userData.bakedAway) {
          hidden.push(o);
          o.visible = true;
        }
      });
      let pending: Promise<unknown> = Promise.resolve();
      try {
        pending = gl.compileAsync(scene, camera);
      } catch {
        // No compileAsync: prewarm compiles synchronously below.
      } finally {
        // Programs are requested in this synchronous pass: hidden objects go back before any frame draws.
        hidden.forEach((o) => (o.visible = false));
      }
      const cap = new Promise((r) => window.setTimeout(r, 3000));
      const done = () => {
        if (!live) return;
        try {
          prewarm(gl, scene, camera);
        } catch {
          // A lost context: the next frame redraws what it can.
        }
        gl.domElement.dataset.ready = "";
        invalidate();
      };
      Promise.race([pending, cap]).then(done, done);
    });
    return () => {
      live = false;
      cancelAnimationFrame(id);
    };
  }, [gl, scene, camera, invalidate]);
  return null;
}
