/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getTMDBTrending, getTMDBTrendingPage, discoverTMDB, getTMDBOnAir } from "@/lib/api/tmdb";
import { getTopAnime, getSeasonalAnime, getAnimeByGenre } from "@/lib/api/jikan";
import { getPopularGames, getRecentGames, getTopRatedGames } from "@/lib/api/igdb";
import { fetchBooksBySubject } from "@/lib/api/openlibrary";
import {
  normalizeTMDBMovie,
  normalizeTMDBTV,
  normalizeJikan,
  normalizeIGDB,
} from "@/lib/api/normalize";
import type { MediaItem } from "@/stores/app-store";

// Recompute on every request instead of caching the route output: each
// upstream fetch has its own data-cache window, so this stays fast — but a
// one-off upstream failure (rate limit, quota) no longer freezes a missing
// carousel into the response for a full hour.
export const dynamic = "force-dynamic";

interface CarouselData {
  key: string;
  title: string;
  type: string;
  items: any[];
}

export async function GET() {
  // Determine current anime season
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const season: "winter" | "spring" | "summer" | "fall" =
    month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "fall";
  const seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);

  // Jikan hard rate-limits (~3 req/s), so its three calls run sequentially
  // inside one task; everything else fans out in parallel.
  const jikanTask = (async () => {
    const seasonal = await getSeasonalAnime(year, season, 25);
    const airing = await getTopAnime("airing", 25);
    const action = await getAnimeByGenre(1, 25);
    return { seasonal, airing, action };
  })();

  const results = await Promise.allSettled([
    // 0: Trending Movies (TMDB) — fetch pages 1+2 = 40 results
    Promise.all([
      getTMDBTrending("movie", "week"),
      getTMDBTrendingPage("movie", "week", 2),
    ]).then(([a, b]) => [...a, ...b]),
    // 1: Trending TV (TMDB) — fetch pages 1+2
    Promise.all([
      getTMDBTrending("tv", "week"),
      getTMDBTrendingPage("tv", "week", 2),
    ]).then(([a, b]) => [...a, ...b]),
    // 2: All anime rows (Jikan, sequential)
    jikanTask,
    // 3: Popular Games (IGDB)
    getPopularGames(50),
    // 4: Recently Released Games (IGDB)
    getRecentGames(50),
    // 5: Popular Fiction (Open Library → Google Books fallback)
    fetchBooksBySubject("fiction", 40),
    // 6: Sci-Fi & Fantasy Books
    fetchBooksBySubject("science fiction", 40),
    // 7: Fantasy Books
    fetchBooksBySubject("fantasy", 40),
    // 8: Top Rated Films (TMDB discover: high vote, recent)
    discoverTMDB("movie", {
      sort_by: "vote_average.desc",
      "vote_count.gte": "200",
      "primary_release_date.gte": `${year - 2}-01-01`,
    }),
    // 9: Currently On Air TV (TMDB)
    getTMDBOnAir(),
    // 10: Top Rated Games (IGDB)
    getTopRatedGames(50),
  ]);

  function extract<T = any[]>(index: number, fallback: T): T {
    const r = results[index];
    return r.status === "fulfilled" ? ((r.value as T) ?? fallback) : fallback;
  }

  const anime = extract(2, { seasonal: [], airing: [], action: [] } as {
    seasonal: any[];
    airing: any[];
    action: any[];
  });

  // Cards without artwork look broken — never ship them to the UI
  const withCovers = (items: MediaItem[]) =>
    items.filter((i) => i.cover_image_url);

  const carousels: CarouselData[] = [
    {
      key: "trending-movies",
      title: "Trending Movies",
      type: "film",
      items: withCovers(extract(0, []).slice(0, 40).map(normalizeTMDBMovie)),
    },
    {
      key: "trending-tv",
      title: "Trending TV Shows",
      type: "tv",
      items: withCovers(extract(1, []).slice(0, 40).map(normalizeTMDBTV)),
    },
    {
      key: "seasonal-anime",
      title: `${seasonLabel} ${year} Anime`,
      type: "anime",
      items: withCovers(anime.seasonal.slice(0, 25).map((r: any) => normalizeJikan(r))),
    },
    {
      key: "airing-anime",
      title: "Top Airing Anime",
      type: "anime",
      items: withCovers(anime.airing.slice(0, 25).map((r: any) => normalizeJikan(r))),
    },
    {
      key: "popular-games",
      title: "Popular Games",
      type: "game",
      items: withCovers(extract(3, []).slice(0, 50).map(normalizeIGDB)),
    },
    {
      key: "new-games",
      title: "Recently Released Games",
      type: "game",
      items: withCovers(extract(4, []).slice(0, 50).map(normalizeIGDB)),
    },
    {
      key: "fiction-books",
      title: "Popular Fiction",
      type: "book",
      items: extract<MediaItem[]>(5, []).slice(0, 40),
    },
    {
      key: "scifi-books",
      title: "Sci-Fi Books",
      type: "book",
      items: extract<MediaItem[]>(6, []).slice(0, 40),
    },
    {
      key: "fantasy-books",
      title: "Fantasy Books",
      type: "book",
      items: extract<MediaItem[]>(7, []).slice(0, 40),
    },
    {
      key: "top-rated-films",
      title: "Top Rated Films",
      type: "film",
      items: withCovers(extract(8, []).map(normalizeTMDBMovie)),
    },
    {
      key: "on-air-tv",
      title: "Currently On Air",
      type: "tv",
      items: withCovers(extract(9, []).map(normalizeTMDBTV)),
    },
    {
      key: "top-rated-games",
      title: "Top Rated Games",
      type: "game",
      items: withCovers(extract(10, []).slice(0, 50).map(normalizeIGDB)),
    },
    {
      key: "action-anime",
      title: "Action Anime",
      type: "anime",
      items: withCovers(anime.action.slice(0, 25).map((r: any) => normalizeJikan(r))),
    },
  ];

  // The same blockbusters (Harry Potter…) top multiple Open Library subjects —
  // keep each book only in the first row it appears in.
  const seenBooks = new Set<string>();
  for (const c of carousels) {
    if (c.type !== "book") continue;
    c.items = c.items.filter((i: MediaItem) => {
      if (seenBooks.has(i.id)) return false;
      seenBooks.add(i.id);
      return true;
    });
  }

  // Books deserve shelf space near the top, not the basement — interleave
  // them after games instead of dumping every book row at the end.
  const order = [
    "trending-movies",
    "trending-tv",
    "seasonal-anime",
    "airing-anime",
    "popular-games",
    "fiction-books",
    "new-games",
    "scifi-books",
    "top-rated-films",
    "on-air-tv",
    "fantasy-books",
    "top-rated-games",
    "action-anime",
  ];
  carousels.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  // Filter out carousels with no items (API failed)
  const valid = carousels.filter((c) => c.items.length > 0);

  return NextResponse.json(valid);
}
