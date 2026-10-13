"use client";

import type { ReactNode } from "react";
import { showApplication } from "@/lib/jump";
import { SectionLink } from "../ui/SectionLink";

/**
 * A row of the hero's decision card: a real link to #applications that, on a plain click, asks the
 * explorer to open this application's chapter (it lands on the chapter, not just the section top).
 * Without the explorer (no 3D) it is a plain section jump to the application cards.
 */
export function MoveLink({ app, className, children }: { app: number; className?: string; children: ReactNode }) {
  return (
    <SectionLink
      href="#applications"
      className={className}
      data-cta="svc-hero-move"
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (!document.querySelector("#applications .application-journey")) return;
        e.preventDefault();
        showApplication(app);
      }}
    >
      {children}
    </SectionLink>
  );
}
