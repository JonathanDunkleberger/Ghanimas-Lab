import { getTMDBTrending } from "@/lib/api/tmdb";
import { getTopAnime } from "@/lib/api/jikan";
import { getPopularGames } from "@/lib/api/igdb";
import { searchBooks } from "@/lib/api/books";
import { fetchBooksBySubject } from "@/lib/api/openlibrary";
import {
  normalizeTMDBMovie,
  normalizeTMDBTV,
  normalizeJikan,
  normalizeIGDB,
  normalizeBook,
} from "@/lib/api/normalize";
import type { MediaItem } from "@/stores/app-store";
import type { MediaType } from "@/lib/constants";

/**
 * Purely cross-media discovery — same-type related titles get their own
 * "Related titles" strip in the panel, so this one never overlaps it.
 * Served from its own endpoint so the main detail fetch stays fast.
 */
export async function buildExploreMore(media: {
  id: string;
  media_type: string;
  title: string;
  genres?: string[];
  tags?: string[];
  related?: { id: string; cover_image_url?: string }[];
}): Promise<MediaItem[]> {
  const MAX_PICKS = 6;
  const exclude = new Set<string>([
    media.id,
    ...(media.related || []).map((r) => r.id),
  ]);
  const picks: MediaItem[] = [];

  const genreHint =
    media.genres?.[0] ||
    media.tags?.[0] ||
    media.title.split(/\s+/).slice(0, 2).join(" ");

  const otherTypes: MediaType[] = (
    ["film", "tv", "anime", "game", "book"] as MediaType[]
  ).filter((t) => t !== media.media_type);

  const pools = await Promise.all(
    otherTypes.map(async (type) => {
      try {
        const items = await fetchPoolForType(type, genreHint);
        return { type, items };
      } catch {
        return { type, items: [] as MediaItem[] };
      }
    })
  );

  // Round-robin across types for diversity
  let added = true;
  while (picks.length < MAX_PICKS && added) {
    added = false;
    for (const { items } of pools) {
      if (picks.length >= MAX_PICKS) break;
      const next = items.find((i) => i.cover_image_url && !exclude.has(i.id));
      if (next) {
        exclude.add(next.id);
        picks.push(next);
        added = true;
      }
    }
  }

  return picks.slice(0, MAX_PICKS);
}

async function fetchPoolForType(
  type: MediaType,
  genreHint: string
): Promise<MediaItem[]> {
  switch (type) {
    case "film": {
      const rows = await getTMDBTrending("movie", "week");
      return (rows || []).map(normalizeTMDBMovie);
    }
    case "tv": {
      const rows = await getTMDBTrending("tv", "week");
      return (rows || []).map(normalizeTMDBTV);
    }
    case "anime": {
      const rows = await getTopAnime("bypopularity", 12);
      return (rows || []).map((r: Parameters<typeof normalizeJikan>[0]) =>
        normalizeJikan(r, "anime")
      );
    }
    case "game": {
      const rows = await getPopularGames(12);
      return (rows || []).map(normalizeIGDB);
    }
    case "book": {
      const subject = genreHint.split(/[/,&]/)[0]?.trim() || "fiction";
      const items = await fetchBooksBySubject(subject, 10);
      if (items.length) return items;
      const rows = await searchBooks(genreHint || "bestseller");
      return (rows || []).map(normalizeBook);
    }
    default:
      return [];
  }
}
