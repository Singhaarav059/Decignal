// Which devices may trade density for frame rate. Award 3D sites (Yuya Film Studio, Ten Pound Feather,
// Houmahani, read 2026-10-15) keep every animation on every device and change only what a frame costs,
// on hardware that cannot hold it. Here a capable device (any Apple GPU, a phone like a Realme 11 Pro
// with a Mali-G68 and 8 cores, a desktop GPU) is "full": the 3D stays at 2x and nothing below runs. A
// weak one is "low": a software renderer, a budget GPU, or 4 cores or 4 GB and under. Only "low" gets
// the frame-time governor (components/three/Governor.tsx) and lighter shadow maps.

export type Tier = "full" | "low";

/** No GPU at all: the browser draws WebGL on the CPU. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;
/** Budget GPUs: older and entry Mali, Adreno 200 to 610s, PowerVR, older Intel integrated graphics. */
const WEAK = /Mali-(4\d\d|T\d+|G31|G51|G52|G57|G71|G72)\b|Adreno \(TM\) ([2-5]\d\d|6[01]\d)\b|PowerVR|Intel\(R\) HD Graphics/i;

let tier: Tier | null = null;
let soft = false;

function renderer() {
  try {
    const c = document.createElement("canvas").getContext("webgl");
    if (!c) return "";
    const e = c.getExtension("WEBGL_debug_renderer_info");
    const name = String(e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER));
    c.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return "";
  }
}

/** The device's tier, read once. `?tier=low` or `?tier=full` forces one, to see what a weak device gets. */
export function deviceTier(): Tier {
  if (tier) return tier;
  if (typeof window === "undefined") return "full";
  const forced = new URLSearchParams(location.search).get("tier");
  if (forced === "low" || forced === "full") return (tier = forced);
  const gpu = renderer();
  soft = SOFTWARE.test(gpu);
  // Every Apple GPU holds the 3D at 2x, and Safari need not report the real core count: the counts
  // only judge other devices. deviceMemory is Chrome's, in GB and capped at 8.
  const nav = navigator as Navigator & { deviceMemory?: number };
  const small = !/Apple/.test(gpu) && ((navigator.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 4);
  return (tier = soft || WEAK.test(gpu) || small ? "low" : "full");
}

/** WebGL drawn on the CPU: the governor starts at its floor instead of finding it frame by frame. */
export const softwareGL = () => (deviceTier(), soft);
