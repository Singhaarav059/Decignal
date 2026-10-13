"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Keeps a service page whole when the explorer's 3D cannot start (no WebGL, a lost context): the
 * section swaps to the static list of the area's applications instead of taking the page down.
 */
export class ServiceAppsBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") console.warn("Explorer 3D off:", error.message, info.componentStack?.split("\n")[1]?.trim());
    // The pinned stage is gone: everything below it moved up.
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
