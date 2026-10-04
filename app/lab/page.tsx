import { notFound } from "next/navigation";
import { Lab } from "./Lab";

// Development only: a turntable for inspecting each 3D model close up.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Lab />;
}
