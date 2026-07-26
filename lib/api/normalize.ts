/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MediaItem } from "@/stores/app-store";
import { bookCoverUrl, stripHtml } from "@/lib/api/books";

// ─── TMDB Genre ID → Name Map ──────────────────────────────────────────────
const TMDB_GENRE_MAP: Record<number, string> = {
  // Movie genres
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
  // TV genres
  10759: "Action & Adventure", 10762: "Kids", 10763: "News",
  10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap",
  10767: "Talk", 10768: "War & Politics",
};

/** Convert TMDB genre_ids array to genre name strings */
function mapTMDBGenres(genreIds: number[] | undefined): string[] {
  if (!genreIds) return [];
  return genreIds.map((id) => TMDB_GENRE_MAP[id] || String(id)).filter(Boolean);
}

/** Normalize Jikan anime/manga result → MediaItem */
export function normalizeJikan(r: any, type: "anime" | "manga" = "anime"): MediaItem {
  return {
    id: `mal-${r.mal_id}`,
    media_type: type,
    title: r.title_english || r.title || "",
    original_title: r.title_japanese,
    slug: `mal-${r.mal_id}`,
    cover_image_url: r.images?.jpg?.large_image_url || r.images?.jpg?.image_url,
    backdrop_image_url: r.images?.jpg?.large_image_url,
    description: r.synopsis,
    year: r.year || (r.aired?.from ? new Date(r.aired.from).getFullYear() : undefined),
    rating: r.score ? Math.round(r.score * 10) : undefined,
    genres: (r.genres || []).map((g: any) => g.name),
    author: (r.studios || []).map((s: any) => s.name).join(", ") || undefined,
    mal_id: r.mal_id,
    status_text: r.status,
    runtime: r.episodes,
  };
}

/** Normalize TMDB movie/tv result → MediaItem */
export function normalizeTMDB(r: any): MediaItem {
  const isTV = r.media_type === "tv" || r.first_air_date != null;
  return {
    id: `tmdb-${r.id}`,
    media_type: isTV ? "tv" : "film",
    title: r.title || r.name || "",
    slug: `tmdb-${r.id}`,
    cover_image_url: r.poster_path
      ? `https://image.tmdb.org/t/p/w300${r.poster_path}`
      : undefined,
    backdrop_image_url: r.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}`
      : undefined,
    description: r.overview,
    year: parseInt((r.release_date || r.first_air_date || "").slice(0, 4)) || undefined,
    rating: r.vote_average ? Math.round(r.vote_average * 10) : undefined,
    genres: r.genres ? r.genres.map((g: any) => g.name) : mapTMDBGenres(r.genre_ids),
    tmdb_id: r.id,
  };
}

/** Normalize TMDB trending movie → MediaItem (type=film) */
export function normalizeTMDBMovie(r: any): MediaItem {
  return {
    id: `tmdb-${r.id}`,
    media_type: "film",
    title: r.title || r.name || "",
    slug: `tmdb-${r.id}`,
    cover_image_url: r.poster_path
      ? `https://image.tmdb.org/t/p/w300${r.poster_path}`
      : undefined,
    backdrop_image_url: r.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}`
      : undefined,
    description: r.overview,
    year: parseInt((r.release_date || "").slice(0, 4)) || undefined,
    rating: r.vote_average ? Math.round(r.vote_average * 10) : undefined,
    genres: r.genres ? r.genres.map((g: any) => g.name) : mapTMDBGenres(r.genre_ids),
    tmdb_id: r.id,
  };
}

/** Normalize TMDB trending TV → MediaItem (type=tv) */
export function normalizeTMDBTV(r: any): MediaItem {
  return {
    id: `tmdb-${r.id}`,
    media_type: "tv",
    title: r.name || r.title || "",
    slug: `tmdb-${r.id}`,
    cover_image_url: r.poster_path
      ? `https://image.tmdb.org/t/p/w300${r.poster_path}`
      : undefined,
    backdrop_image_url: r.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}`
      : undefined,
    description: r.overview,
    year: parseInt((r.first_air_date || "").slice(0, 4)) || undefined,
    rating: r.vote_average ? Math.round(r.vote_average * 10) : undefined,
    genres: r.genres ? r.genres.map((g: any) => g.name) : mapTMDBGenres(r.genre_ids),
    tmdb_id: r.id,
  };
}

/** Normalize IGDB game result → MediaItem */
export function normalizeIGDB(r: any): MediaItem {
  return {
    id: `igdb-${r.id}`,
    media_type: "game",
    title: r.name || "",
    slug: `igdb-${r.id}`,
    cover_image_url: r.cover?.url
      ? `https:${r.cover.url.replace("t_thumb", "t_cover_big")}`
      : undefined,
    description: r.summary,
    year: r.first_release_date
      ? new Date(r.first_release_date * 1000).getFullYear()
      : undefined,
    rating: r.rating ? Math.round(r.rating) : undefined,
    genres: (r.genres || []).map((g: any) => g.name),
    author: (r.involved_companies || [])
      .filter((c: any) => c.developer)
      .map((c: any) => c.company?.name)
      .filter(Boolean)
      .join(", ") || undefined,
    igdb_id: r.id,
  };
}

/** Normalize Google Books result → MediaItem */
export function normalizeBook(r: any): MediaItem {
  const vi = r.volumeInfo || {};
  return {
    id: `gbook-${r.id}`,
    media_type: "book",
    title: vi.title || "",
    slug: `gbook-${r.id}`,
    cover_image_url: bookCoverUrl(vi) || undefined,
    description: stripHtml(vi.description),
    year: parseInt((vi.publishedDate || "").slice(0, 4)) || undefined,
    rating: vi.averageRating ? Math.round(vi.averageRating * 20) : undefined,
    genres: vi.categories || [],
    author: (vi.authors || []).join(", ") || undefined,
    isbn: (vi.industryIdentifiers || [])[0]?.identifier,
    runtime: vi.pageCount,
  };
}
