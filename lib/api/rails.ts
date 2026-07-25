/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getTMDBTrendingPage,
  discoverTMDB,
  getTMDBOnAir,
  getTMDBNowPlaying,
} from "@/lib/api/tmdb";
import { getTopAnime, getSeasonalAnime, getAnimeByGenre } from "@/lib/api/jikan";
import {
  getPopularGames,
  getRecentGames,
  getTopRatedGames,
  getGamesByGenre,
} from "@/lib/api/igdb";
import { fetchBooksBySubject } from "@/lib/api/openlibrary";
import {
  normalizeTMDBMovie,
  normalizeTMDBTV,
  normalizeJikan,
  normalizeIGDB,
} from "@/lib/api/normalize";
import type { MediaItem } from "@/stores/app-store";

/**
 * Every carousel on Home (and the infinite tails on For You) is a "rail":
 * a keyed, pageable feed. Page 1 renders on the server via
 * /api/home-carousels; deeper pages stream in through /api/rail/[key]
 * as the user scrolls, so each row feels nearly endless.
 */
export interface RailDef {
  key: string;
  title: string;
  type: "film" | "tv" | "anime" | "game" | "book";
  /** Jikan rate-limits hard — its rails must be fetched sequentially */
  source: "tmdb" | "jikan" | "igdb" | "openlibrary";
  fetchPage: (page: number) => Promise<MediaItem[]>;
}

/** Rail page → two TMDB pages (40 items), so every page feels substantial */
async function tmdbMoviePages(
  fetcher: (p: number) => Promise<any[]>,
  page: number
): Promise<MediaItem[]> {
  const [a, b] = await Promise.all([fetcher(page * 2 - 1), fetcher(page * 2)]);
  return [...a, ...b].map(normalizeTMDBMovie);
}

async function tmdbTVPages(
  fetcher: (p: number) => Promise<any[]>,
  page: number
): Promise<MediaItem[]> {
  const [a, b] = await Promise.all([fetcher(page * 2 - 1), fetcher(page * 2)]);
  return [...a, ...b].map(normalizeTMDBTV);
}

const GAMES_PER_PAGE = 40;
const BOOKS_PER_PAGE = 40;
const ANIME_PER_PAGE = 25; // Jikan max

export function buildRails(): RailDef[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const season: "winter" | "spring" | "summer" | "fall" =
    month <= 3 ? "winter" : month <= 6 ? "spring" : month <= 9 ? "summer" : "fall";
  const seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);

  const discoverMovie =
    (extra: Record<string, string>) => (p: number) =>
      discoverTMDB("movie", { ...extra, page: String(p) });
  const discoverTV =
    (extra: Record<string, string>) => (p: number) =>
      discoverTMDB("tv", { ...extra, page: String(p) });

  return [
    // ── Films ────────────────────────────────────────────────────────────
    {
      key: "trending-movies",
      title: "Trending Movies",
      type: "film",
      source: "tmdb",
      fetchPage: (p) =>
        tmdbMoviePages((tp) => getTMDBTrendingPage("movie", "week", tp), p),
    },
    {
      key: "top-rated-films",
      title: "Top Rated Films",
      type: "film",
      source: "tmdb",
      fetchPage: (p) =>
        tmdbMoviePages(
          discoverMovie({
            sort_by: "vote_average.desc",
            "vote_count.gte": "200",
            "primary_release_date.gte": `${year - 2}-01-01`,
          }),
          p
        ),
    },
    {
      key: "in-theaters",
      title: "In Theaters Now",
      type: "film",
      source: "tmdb",
      fetchPage: (p) => tmdbMoviePages((tp) => getTMDBNowPlaying(tp), p),
    },
    {
      key: "scifi-films",
      title: "Sci-Fi & Fantasy Films",
      type: "film",
      source: "tmdb",
      fetchPage: (p) =>
        tmdbMoviePages(
          discoverMovie({
            with_genres: "878|14",
            sort_by: "popularity.desc",
            "vote_count.gte": "100",
          }),
          p
        ),
    },
    {
      key: "crime-films",
      title: "Crime & Thrillers",
      type: "film",
      source: "tmdb",
      fetchPage: (p) =>
        tmdbMoviePages(
          discoverMovie({
            with_genres: "80|53",
            sort_by: "popularity.desc",
            "vote_count.gte": "100",
          }),
          p
        ),
    },
    {
      key: "comedy-films",
      title: "Comedies",
      type: "film",
      source: "tmdb",
      fetchPage: (p) =>
        tmdbMoviePages(
          discoverMovie({
            with_genres: "35",
            sort_by: "popularity.desc",
            "vote_count.gte": "100",
          }),
          p
        ),
    },

    // ── TV ───────────────────────────────────────────────────────────────
    {
      key: "trending-tv",
      title: "Trending TV Shows",
      type: "tv",
      source: "tmdb",
      fetchPage: (p) =>
        tmdbTVPages((tp) => getTMDBTrendingPage("tv", "week", tp), p),
    },
    {
      key: "on-air-tv",
      title: "Currently On Air",
      type: "tv",
      source: "tmdb",
      fetchPage: (p) => tmdbTVPages((tp) => getTMDBOnAir(tp), p),
    },
    {
      key: "top-rated-tv",
      title: "Critically Acclaimed TV",
      type: "tv",
      source: "tmdb",
      fetchPage: (p) =>
        tmdbTVPages(
          discoverTV({
            sort_by: "vote_average.desc",
            "vote_count.gte": "500",
          }),
          p
        ),
    },
    {
      key: "scifi-fantasy-tv",
      title: "Sci-Fi & Fantasy Series",
      type: "tv",
      source: "tmdb",
      fetchPage: (p) =>
        tmdbTVPages(
          discoverTV({
            with_genres: "10765",
            sort_by: "popularity.desc",
            "vote_count.gte": "100",
          }),
          p
        ),
    },
    {
      key: "crime-tv",
      title: "Crime & Mystery Series",
      type: "tv",
      source: "tmdb",
      fetchPage: (p) =>
        tmdbTVPages(
          discoverTV({
            with_genres: "80|9648",
            sort_by: "popularity.desc",
            "vote_count.gte": "100",
          }),
          p
        ),
    },

    // ── Anime (Jikan — sequential on page-1 compose) ─────────────────────
    {
      key: "seasonal-anime",
      title: `${seasonLabel} ${year} Anime`,
      type: "anime",
      source: "jikan",
      fetchPage: async (p) =>
        (await getSeasonalAnime(year, season, ANIME_PER_PAGE, p)).map((r: any) =>
          normalizeJikan(r)
        ),
    },
    {
      key: "airing-anime",
      title: "Top Airing Anime",
      type: "anime",
      source: "jikan",
      fetchPage: async (p) =>
        (await getTopAnime("airing", ANIME_PER_PAGE, p)).map((r: any) =>
          normalizeJikan(r)
        ),
    },
    {
      key: "all-time-anime",
      title: "All-Time Favorite Anime",
      type: "anime",
      source: "jikan",
      fetchPage: async (p) =>
        (await getTopAnime("bypopularity", ANIME_PER_PAGE, p)).map((r: any) =>
          normalizeJikan(r)
        ),
    },
    {
      key: "action-anime",
      title: "Action Anime",
      type: "anime",
      source: "jikan",
      fetchPage: async (p) =>
        (await getAnimeByGenre(1, ANIME_PER_PAGE, p)).map((r: any) =>
          normalizeJikan(r)
        ),
    },
    {
      key: "fantasy-anime",
      title: "Fantasy Anime",
      type: "anime",
      source: "jikan",
      fetchPage: async (p) =>
        (await getAnimeByGenre(10, ANIME_PER_PAGE, p)).map((r: any) =>
          normalizeJikan(r)
        ),
    },

    // ── Games ────────────────────────────────────────────────────────────
    {
      key: "popular-games",
      title: "Popular Games",
      type: "game",
      source: "igdb",
      fetchPage: async (p) =>
        (await getPopularGames(GAMES_PER_PAGE, (p - 1) * GAMES_PER_PAGE)).map(
          normalizeIGDB
        ),
    },
    {
      key: "new-games",
      title: "Recently Released Games",
      type: "game",
      source: "igdb",
      fetchPage: async (p) =>
        (await getRecentGames(GAMES_PER_PAGE, (p - 1) * GAMES_PER_PAGE)).map(
          normalizeIGDB
        ),
    },
    {
      key: "top-rated-games",
      title: "Top Rated Games",
      type: "game",
      source: "igdb",
      fetchPage: async (p) =>
        (await getTopRatedGames(GAMES_PER_PAGE, (p - 1) * GAMES_PER_PAGE)).map(
          normalizeIGDB
        ),
    },
    {
      key: "rpg-games",
      title: "Role-Playing Games",
      type: "game",
      source: "igdb",
      fetchPage: async (p) =>
        (await getGamesByGenre(12, GAMES_PER_PAGE, (p - 1) * GAMES_PER_PAGE)).map(
          normalizeIGDB
        ),
    },
    {
      key: "shooter-games",
      title: "Shooters",
      type: "game",
      source: "igdb",
      fetchPage: async (p) =>
        (await getGamesByGenre(5, GAMES_PER_PAGE, (p - 1) * GAMES_PER_PAGE)).map(
          normalizeIGDB
        ),
    },
    {
      key: "indie-games",
      title: "Indie Gems",
      type: "game",
      source: "igdb",
      fetchPage: async (p) =>
        (await getGamesByGenre(32, GAMES_PER_PAGE, (p - 1) * GAMES_PER_PAGE)).map(
          normalizeIGDB
        ),
    },

    // ── Books (Open Library) ─────────────────────────────────────────────
    {
      key: "fiction-books",
      title: "Popular Fiction",
      type: "book",
      source: "openlibrary",
      fetchPage: (p) => fetchBooksBySubject("fiction", BOOKS_PER_PAGE, p),
    },
    {
      key: "scifi-books",
      title: "Sci-Fi Books",
      type: "book",
      source: "openlibrary",
      fetchPage: (p) => fetchBooksBySubject("science fiction", BOOKS_PER_PAGE, p),
    },
    {
      key: "fantasy-books",
      title: "Fantasy Books",
      type: "book",
      source: "openlibrary",
      fetchPage: (p) => fetchBooksBySubject("fantasy", BOOKS_PER_PAGE, p),
    },
    {
      key: "mystery-books",
      title: "Mystery & Detective",
      type: "book",
      source: "openlibrary",
      fetchPage: (p) => fetchBooksBySubject("mystery", BOOKS_PER_PAGE, p),
    },
    {
      key: "romance-books",
      title: "Romance",
      type: "book",
      source: "openlibrary",
      fetchPage: (p) => fetchBooksBySubject("romance", BOOKS_PER_PAGE, p),
    },
    {
      key: "horror-books",
      title: "Horror & Suspense",
      type: "book",
      source: "openlibrary",
      fetchPage: (p) => fetchBooksBySubject("horror", BOOKS_PER_PAGE, p),
    },
    {
      key: "history-books",
      title: "History & Biography",
      type: "book",
      source: "openlibrary",
      fetchPage: (p) => fetchBooksBySubject("biography", BOOKS_PER_PAGE, p),
    },
  ];
}

export function getRail(key: string): RailDef | undefined {
  return buildRails().find((r) => r.key === key);
}
