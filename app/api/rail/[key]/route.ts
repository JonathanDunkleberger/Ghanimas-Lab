import { NextRequest, NextResponse } from "next/server";
import { getRail } from "@/lib/api/rails";
import type { MediaItem } from "@/stores/app-store";

/**
 * Deeper pages for a home/For-You rail — powers the "seemingly endless"
 * horizontal scroll. Page 1 comes from /api/home-carousels; the carousel
 * component pulls 2, 3, 4… from here as the user nears the end of the row.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const rail = getRail(key);
  if (!rail) return NextResponse.json({ items: [] }, { status: 404 });

  const raw = new URL(request.url).searchParams.get("page");
  const page = Math.min(Math.max(parseInt(raw || "2", 10) || 2, 2), 25);

  try {
    const items = (await rail.fetchPage(page)).filter(
      (i: MediaItem) => i.cover_image_url
    );
    return NextResponse.json({ items });
  } catch (error) {
    console.error(`Rail page error (${key} p${page}):`, error);
    return NextResponse.json({ items: [] });
  }
}
