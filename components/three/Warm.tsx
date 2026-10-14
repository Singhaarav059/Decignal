"use client";

import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/**
 * Sends every model, texture and shader in the scene to the GPU once, while the loader is still up,
 * so no object stalls the scroll the first time it comes into view. Hidden and off-camera objects
 * are included; their visibility is restored before the next frame.
 */
export function prewarm(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, roots?: THREE.Object3D[]) {
  const hidden: THREE.Object3D[] = [];
  const culled: THREE.Object3D[] = [];
  const visit = (o: THREE.Object3D) => {
    // Never drawn on this screen (userData.noWarm, such as the Scale glass on a phone): warming it would
    // only build programs nothing uses.
    if (o.userData.noWarm) return;
    // Parts a Bake merged away are never drawn again: leave them hidden.
    if (!o.visible && !o.userData.bakedAway) {
      hidden.push(o);
      o.visible = true;
    }
    if (o.frustumCulled) {
      culled.push(o);
      o.frustumCulled = false;
    }
    for (const c of o.children) visit(c);
  };
  (roots ?? [scene]).forEach(visit);
  // Programs as drawn on screen (tone mapping and colour space included), lit by the scene's lights...
  if (roots) roots.forEach((r) => gl.compile(r, camera, scene));
  else gl.compile(scene, camera);
  // ...then one draw uploads geometry and textures and builds the shadow depth programs. It goes to the
  // canvas, clipped to one pixel: drawn into a render target, every material linked a second program
  // (no tone mapping, linear output) that nothing on screen uses, each link blocking the page (phone
  // 108 programs to 66, desktop 124 to 94).
  const previous = gl.getRenderTarget();
  const scissorTest = gl.getScissorTest();
  gl.getScissor(SCISSOR);
  gl.setRenderTarget(null);
  gl.setScissorTest(true);
  gl.setScissor(0, 0, 1, 1);
  gl.render(scene, camera);
  // The renderer goes back as it was.
  gl.setScissor(SCISSOR);
  gl.setScissorTest(scissorTest);
  hidden.forEach((o) => (o.visible = false));
  culled.forEach((o) => (o.frustumCulled = true));
  // A whole frame at once, in the same task, so the clipped one is never shown.
  gl.render(scene, camera);
  gl.setRenderTarget(previous);
}
const SCISSOR = new THREE.Vector4();

/**
 * Mounted last inside a scene's Suspense: once every model exists, compile its shaders off the main
 * thread where the browser can (KHR_parallel_shader_compile), then upload it all to the GPU in one go.
 * A synchronous compile here stalled the page's scroll for a few hundred milliseconds each time a
 * world was added. The canvas is marked data-ready once the first warm-up is done (it fades in).
 */
export function Warm({ roots }: { roots?: () => THREE.Object3D[] | null }) {
  const { gl, scene, camera, invalidate } = useThree();
  useEffect(() => {
    let live = true;
    // One frame later, so every object has been posed by its first useFrame.
    const id = requestAnimationFrame(() => {
      // Only the parts not yet warmed, when the caller says which (null: the whole scene).
      const only = roots?.() ?? undefined;
      if (only && only.length === 0) return;
      const walk = (fn: (o: THREE.Object3D) => void) => (only ? only.forEach((r) => r.traverse(fn)) : scene.traverse(fn));
      const hidden: THREE.Object3D[] = [];
      walk((o) => {
        if (!o.visible && !o.userData.bakedAway) {
          hidden.push(o);
          o.visible = true;
        }
      });
      let pending: Promise<unknown> = Promise.resolve();
      try {
        pending = only ? Promise.all(only.map((r) => gl.compileAsync(r, camera, scene))) : gl.compileAsync(scene, camera);
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
          prewarm(gl, scene, camera, only);
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
  }, [gl, scene, camera, invalidate, roots]);
  return null;
}
