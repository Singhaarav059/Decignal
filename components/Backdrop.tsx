import { bgAt } from "@/lib/scene";

/** One flat cool neutral behind the stage, the same colour as the 3D fog. It never changes with the chapter. */
export function Backdrop() {
  return <div className="pointer-events-none fixed inset-0 -z-10" style={{ backgroundColor: `rgb(${bgAt(0).join(" ")})` }} aria-hidden />;
}
