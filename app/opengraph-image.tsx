import { ImageResponse } from "next/og";

export const alt = "Decignal · Turn information into decisions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TONES = ["#2E5BFF", "#7C5CFF", "#0FA874", "#FFB21E", "#FF7438", "#FF5FA2"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(180deg, #8EA8D6 0%, #E4E2EC 62%, #F4D6D3 100%)",
          color: "#14213D",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 40, fontWeight: 700 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {TONES.map((c) => (
              <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
            ))}
          </div>
          decignal
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 104, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3 }}>
          <div>Turn information</div>
          <div>into decisions.</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#33415C" }}>
          Turn information from the systems you already run into decisions your teams approve.
        </div>
      </div>
    ),
    size,
  );
}
