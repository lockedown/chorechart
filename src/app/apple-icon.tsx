import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#7c3aed",
          borderRadius: "36px",
          position: "relative",
        }}
      >
        <span style={{ fontSize: 90, fontWeight: 700, color: "white" }}>CC</span>
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#fbbf24",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 700,
            color: "#7c3aed",
          }}
        >
          ✓
        </div>
      </div>
    ),
    { ...size }
  );
}
