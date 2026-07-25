import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "My Wrapped";
  const hours = searchParams.get("hours") || "0";
  const titles = searchParams.get("titles") || "0";
  const personality = searchParams.get("personality") || "The Explorer";
  const period = searchParams.get("period") || "2025";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0c0c0e, #18181b, #121214)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "40%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(197,194,188,0.12), transparent 60%)",
          }}
        />

        {/* Cat silhouette icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #c5c2bc, #8b8882)",
            }}
          />
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#c5c2bc",
              letterSpacing: 3,
              textTransform: "uppercase" as const,
            }}
          >
            {"GHANIMA'S LAB"}
          </div>
        </div>

        {/* Period */}
        <div
          style={{
            fontSize: 14,
            color: "rgba(197,194,188,0.5)",
            textTransform: "uppercase" as const,
            letterSpacing: 4,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {`Wrapped ${period}`}
        </div>

        {/* Hours */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            background: "linear-gradient(135deg, #c5c2bc, #f0eeea)",
            backgroundClip: "text",
            color: "transparent",
            lineHeight: 1,
          }}
        >
          {hours}
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#f0eeea",
            fontWeight: 300,
            marginBottom: 16,
          }}
        >
          hours consumed
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#c5c2bc" }}>
              {titles}
            </div>
            <div style={{ fontSize: 11, color: "rgba(240,238,234,0.35)" }}>
              titles
            </div>
          </div>
        </div>

        {/* Personality */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#f0eeea",
            marginBottom: 4,
          }}
        >
          {personality}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            fontSize: 10,
            color: "rgba(240,238,234,0.15)",
            letterSpacing: 2,
          }}
        >
          ghanimaslab.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
