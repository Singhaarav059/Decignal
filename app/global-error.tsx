"use client";

import { useEffect } from "react";

// Replaces the root layout when it fails, so globals.css and the fonts are not loaded here:
// plain inline styles in the cool neutrals (lib/site.ts BRAND).
const INK = "#0F1217";
const BG = "#F6F7F9";
// The text-safe cobalt (--color-cobalt-ink), as on the accent line of every two-line headline.
const COBALT_INK = "#2A52F0";

const button = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 44,
  padding: "0 20px",
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  textDecoration: "none",
} as const;

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error.digest ? `Decignal error, digest ${error.digest}` : error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          background: BG,
          color: INK,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <title>Decignal</title>
        {/* The site grid (.page-wrap): --gutter clamp(20px, 5vw, 72px), --grid-max 71rem. */}
        <main style={{ width: "min(100% - 2 * clamp(20px, 5vw, 72px), 71rem)", margin: "0 auto", padding: "64px 0" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555D6B" }}>
            Error
          </p>
          <h1 style={{ margin: "20px 0 0", fontSize: "clamp(40px, min(6.2vw, 10.5vh), 96px)", fontWeight: 600, lineHeight: 0.98, letterSpacing: "-0.032em", textWrap: "balance" }}>
            <span style={{ display: "block" }}>Something went wrong.</span>
            <span style={{ display: "block", color: COBALT_INK }}>Try again in a moment.</span>
          </h1>
          <div style={{ marginTop: 40, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" onClick={() => retry()} style={{ ...button, border: 0, background: INK, color: "#FFFFFF" }}>
              Try again
            </button>
            {/* A full document load: the app shell itself failed, so client navigation is not safe. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ ...button, border: "1px solid rgb(15 18 23 / 0.22)", background: "#FFFFFF", color: INK }}>
              Back to the story
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
