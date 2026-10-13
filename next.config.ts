import type { NextConfig } from "next";

const prod = process.env.NODE_ENV === "production";

// Verified against a production build with a full scroll: 0 violations, both canvases render.
// - 'unsafe-inline' (script, style): the page is statically prerendered and nonces would force dynamic
//   rendering; inline <style> and style attributes are used throughout.
// - blob: in script-src and worker-src: drei <Text> (troika) builds its text worker from a blob.
// - connect-src is 'self' only: no 3D string needs troika's jsDelivr glyph fallback any more (checked on a
//   production build: 0 requests to it and 0 violations on a full scroll of home and a service page).
// Production only, so next dev (HMR, React's dev-only eval) keeps working.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(prod
    ? [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Frame-Options", value: "DENY" },
        // No includeSubDomains or preload until the final domain and all its subdomains are HTTPS.
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: security },
      // troika's label fonts. Not content-hashed: rename a file if it ever changes.
      { source: "/fonts/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
