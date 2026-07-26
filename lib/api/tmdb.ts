const TMDB_BASE = "https://api.themoviedb.org/3";

function tmdbUrl(path: string, params: Record<string, string> = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY || "");
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function searchTMDB(query: string) {
  const res = await fetch(
    tmdbUrl("/search/multi", { query, include_adult: "false" }),
    { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) {
    console.error(`TMDB search failed: ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  return (data.results || []).filter(
    (r: any) => r.media_type === "movie" || r.media_type === "tv"
  );
}

export async function getTMDBDetails(
  id: number,
  type: "movie" | "tv"
) {
  const appendFields = type === "movie"
    ? "videos,credits,similar,recommendations,watch/providers,keywords,release_dates,external_ids"
    : "videos,credits,aggregate_credits,similar,recommendations,watch/providers,keywords,content_ratings,external_ids";
  const res = await fetch(
    tmdbUrl(`/${type}/${id}`, {
      append_to_response: appendFields,
    }),
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function getTMDBTrending(
  type: "movie" | "tv" = "movie",
  timeWindow: "day" | "week" = "week"
) {
  const res = await fetch(
    tmdbUrl(`/trending/${type}/${timeWindow}`),
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) {
    console.error(`TMDB trending failed: ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  return data.results || [];
}

export async function getTMDBTrendingPage(
  type: "movie" | "tv" = "movie",
  timeWindow: "day" | "week" = "week",
  page: number = 1
) {
  const res = await fetch(
    tmdbUrl(`/trending/${type}/${timeWindow}`, { page: String(page) }),
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

export async function discoverTMDB(
  type: "movie" | "tv",
  params: Record<string, string> = {}
) {
  const res = await fetch(
    tmdbUrl(`/discover/${type}`, params),
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

export async function getTMDBOnAir(page: number = 1) {
  const res = await fetch(
    tmdbUrl("/tv/on_the_air", { page: String(page) }),
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

export async function getTMDBNowPlaying(page: number = 1) {
  const res = await fetch(
    tmdbUrl("/movie/now_playing", { page: String(page), region: "US" }),
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

/** Keyword ids for a free-text theme ("time travel", "heist") → discover */
export async function searchTMDBKeywords(query: string): Promise<number[]> {
  const res = await fetch(
    tmdbUrl("/search/keyword", { query }),
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).slice(0, 4).map((k: { id: number }) => k.id);
}

export function tmdbImageUrl(
  path: string | null | undefined,
  size: string = "w500"
): string | undefined {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
