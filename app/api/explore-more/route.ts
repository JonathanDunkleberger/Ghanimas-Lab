import { NextRequest, NextResponse } from "next/server";
import { buildExploreMore } from "@/lib/api/explore";

/**
 * Cross-media "Explore more" strip, decoupled from the main detail fetch so
 * opening a title card is instant and this fills in as it arrives.
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const id = sp.get("id") || "";
  const type = sp.get("type") || "film";
  const title = sp.get("title") || "";
  const genre = sp.get("genre") || "";

  if (!id) return NextResponse.json([]);

  try {
    const items = await buildExploreMore({
      id,
      media_type: type,
      title,
      genres: genre ? [genre] : [],
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Explore-more error:", error);
    return NextResponse.json([]);
  }
}
