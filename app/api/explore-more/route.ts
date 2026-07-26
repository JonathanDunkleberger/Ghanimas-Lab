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
  // All genres + tags, pipe-joined — the concept matcher scans the whole set
  const genres = (sp.get("genres") || sp.get("genre") || "")
    .split("|")
    .map((g) => g.trim())
    .filter(Boolean);

  if (!id) return NextResponse.json([]);

  try {
    const items = await buildExploreMore({
      id,
      media_type: type,
      title,
      genres,
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Explore-more error:", error);
    return NextResponse.json([]);
  }
}
