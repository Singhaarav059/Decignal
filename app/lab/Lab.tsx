"use client";

import dynamic from "next/dynamic";

const LabScene = dynamic(() => import("./LabScene"), { ssr: false });

export function Lab() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#FBF6EF" }}>
      <LabScene />
    </div>
  );
}
