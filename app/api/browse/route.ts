/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { discoverTMDB, searchTMDBKeywords } from "@/lib/api/tmdb";
import { browseAnime } from "@/lib/api/jikan";
import { browseGames } from "@/lib/api/igdb";
import { browseOpenLibraryAdvanced, normalizeOpenLibraryDoc } from "@/lib/api/openlibrary";
import {
  normalizeTMDBMovie,
  normalizeTMDBTV,
  normalizeJikan,
  normalizeIGDB,
} from "@/lib/api/normalize";
import { BROWSE_CONFIG, type BrowseType, type SortKey } from "@/lib/browse-config";
import type { MediaItem } from "@/stores/app-store";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

/**
 * The library-section grid feed. Combines:
 *  - category (a genre pill; source-specific value from BROWSE_CONFIG)
 *  - q        (free-text theme: "philosophy", "time travel", "soulslike")
 *  - era      (index into the section's era timeline → year window)
 *  - sort     (popular | top | new | old)
 *  - page
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const type = sp.get("type") as BrowseType;
  const config = BROWSE_CONFIG[type];
  if (!config) {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  const category = sp.get("category") || undefined;
  const q = sp.get("q")?.trim() || undefined;
  const sort = (sp.get("sort") as SortKey) || "popular";
  const page = Math.min(Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1), 25);

  const eraIdx = sp.get("era");
  const era =
    eraIdx != null && config.eras[parseInt(eraIdx, 10)]
      ? config.eras[parseInt(eraIdx, 10)]
      : undefined;

  try {
    let items: MediaItem[] = [];

    switch (type) {
      case "book": {
        const sortMap: Record<SortKey, "readinglog" | "rating" | "new" | "old"> = {
          popular: "readinglog",
          top: "rating",
          new: "new",
          old: "old",
        };
        const docs = await browseOpenLibraryAdvanced({
          subject: category,
          q,
          yearFrom: era?.from,
          yearTo: era?.to,
          sort: sortMap[sort],
          page,
          limit: PAGE_SIZE,
        });
        items = docs.map(normalizeOpenLibraryDoc);
        break;
      }

      case "film":
      case "tv": {
        const mediaKind = type === "film" ? "movie" : "tv";
        const dateField =
          type === "film" ? "primary_release_date" : "first_air_date";
        const params: Record<string, string> = { page: String(page) };

        if (category) params.with_genres = category;
        if (q) {
          const keywords = await searchTMDBKeywords(q);
          if (keywords.length === 0) {
            return NextResponse.json({ items: [], hasMore: false });
          }
          params.with_keywords = keywords.join("|");
        }
        if (era) {
          params[`${dateField}.gte`] = `${era.from}-01-01`;
          params[`${dateField}.lte`] = `${era.to}-12-31`;
        }
        switch (sort) {
          case "top":
            params.sort_by = "vote_average.desc";
            params["vote_count.gte"] = "200";
            break;
          case "new":
            params.sort_by = `${dateField}.desc`;
            params["vote_count.gte"] = "20";
            break;
          case "old":
            params.sort_by = `${dateField}.asc`;
            params["vote_count.gte"] = "50";
            break;
          default:
            params.sort_by = "popularity.desc";
            params["vote_count.gte"] = "50";
        }
        const rows = await discoverTMDB(mediaKind, params);
        items = rows.map(type === "film" ? normalizeTMDBMovie : normalizeTMDBTV);
        break;
      }

      case "anime": {
        const sortMap: Record<
          SortKey,
          "members" | "score" | "start_date_desc" | "start_date_asc"
        > = {
          popular: "members",
          top: "score",
          new: "start_date_desc",
          old: "start_date_asc",
        };
        const rows = await browseAnime({
          genre: category,
          q,
          yearFrom: era?.from,
          yearTo: era?.to,
          sort: sortMap[sort],
          page,
          limit: PAGE_SIZE,
        });
        items = rows.map((r: any) => normalizeJikan(r));
        break;
      }

      case "game": {
        const rows = await browseGames({
          genre: category,
          q,
          yearFrom: era?.from,
          yearTo: era?.to,
          sort,
          page,
          limit: PAGE_SIZE,
        });
        items = rows.map(normalizeIGDB);
        break;
      }
    }

    // Cards without artwork look broken in a dense grid
    const withCovers = items.filter((i) => i.cover_image_url);
    return NextResponse.json({
      items: withCovers,
      hasMore: items.length >= PAGE_SIZE * 0.5 && page < 25,
    });
  } catch (error) {
    console.error(`Browse error (${type}):`, error);
    return NextResponse.json({ items: [], hasMore: false });
  }
}
