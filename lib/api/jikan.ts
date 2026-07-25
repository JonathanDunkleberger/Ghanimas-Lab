const JIKAN_BASE = "https://api.jikan.moe/v4";

export async function searchAnime(query: string) {
  const res = await fetch(
    `${JIKAN_BASE}/anime?q=${encodeURIComponent(query)}&order_by=members&sort=desc&limit=20`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

export async function searchManga(query: string) {
  const res = await fetch(
    `${JIKAN_BASE}/manga?q=${encodeURIComponent(query)}&order_by=members&sort=desc&limit=15`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

/**
 * Jikan returns HTTP 200 with an error body ({"status":500,...}) when MAL
 * times out — and Next would cache that bad payload for the full revalidate
 * window. Validate the body; if it's bad, retry once bypassing the cache.
 */
async function jikanJSON(url: string, revalidate: number) {
  const isValid = (json: any) =>
    json && json.data != null && json.status !== 500 && json.status !== 504;
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (res.ok) {
      const json = await res.json();
      if (isValid(json)) return json;
    }
  } catch {
    // fall through to uncached retry
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (isValid(json)) return json;
    }
  } catch {
    // give up
  }
  return null;
}

export async function getMangaDetails(malId: number) {
  const data = await jikanJSON(`${JIKAN_BASE}/manga/${malId}/full`, 86400);
  return data?.data || null;
}

export async function getAnimeDetails(malId: number) {
  // Jikan allows ~3 req/s — keep each parallel batch at 3 or fewer
  const [anime, chars, videos] = await Promise.all([
    jikanJSON(`${JIKAN_BASE}/anime/${malId}/full`, 86400),
    jikanJSON(`${JIKAN_BASE}/anime/${malId}/characters`, 86400),
    jikanJSON(`${JIKAN_BASE}/anime/${malId}/videos`, 604800),
  ]);
  const [streaming, recommendations] = await Promise.all([
    jikanJSON(`${JIKAN_BASE}/anime/${malId}/streaming`, 86400),
    jikanJSON(`${JIKAN_BASE}/anime/${malId}/recommendations`, 86400),
  ]);

  return {
    ...(anime?.data || {}),
    characters: chars?.data || [],
    videos: videos?.data || {},
    streaming: streaming?.data || [],
    recommendations: recommendations?.data || [],
  };
}

/**
 * Exact aired-episode count for shows where Jikan reports `episodes: null`
 * (currently-airing series like One Piece). Reads the paginated episodes
 * list: (pages - 1) * pageSize + episodes on the last page.
 */
export async function getAnimeEpisodeCount(
  malId: number
): Promise<number | undefined> {
  // Jikan sometimes returns 200 with an UpstreamException body when MAL is
  // slow; a quick retry usually hits their cache.
  const fetchPage = async (page: number) => {
    const url = `${JIKAN_BASE}/anime/${malId}/episodes?page=${page}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // First attempt may serve a poisoned cached body — bypass after that
        const res = await fetch(
          url,
          attempt === 0
            ? { next: { revalidate: 86400 } }
            : { cache: "no-store" }
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.data) && json.data.length > 0) return json;
        }
      } catch {
        // fall through to retry
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    return null;
  };

  const first = await fetchPage(1);
  if (!first) return undefined;

  const pageSize = (first.data || []).length;
  const lastPage = first.pagination?.last_visible_page || 1;
  if (!pageSize) return undefined;
  if (lastPage === 1) return pageSize;

  const last = await fetchPage(lastPage);
  if (!last) return undefined;
  return (lastPage - 1) * pageSize + (last.data || []).length;
}

/**
 * Jikan rate-limits hard (~3 req/s) and 429s/504s under parallel load. List
 * endpoints retry once with a short backoff, bypassing the data cache on the
 * retry so a poisoned (rate-limited) cached body can't stick around.
 *
 * Each attempt carries a hard abort timeout: when MAL is having an outage,
 * a rail must fail in ~3s, not hang the whole home page. Missing rails
 * self-heal on the next request.
 */
async function jikanList(url: string, revalidate: number = 3600): Promise<any[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        ...(attempt === 0 ? { next: { revalidate } } : { cache: "no-store" }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.data)) return json.data;
      }
    } catch {
      // retry below
    }
    if (attempt < 1) await new Promise((r) => setTimeout(r, 500));
  }
  return [];
}

export async function getTopAnime(
  filter: "airing" | "upcoming" | "bypopularity" | "favorite" = "bypopularity",
  limit: number = 20,
  page: number = 1
) {
  return jikanList(
    `${JIKAN_BASE}/top/anime?filter=${filter}&limit=${limit}&page=${page}`
  );
}

export async function getSeasonalAnime(
  year: number = new Date().getFullYear(),
  season: "winter" | "spring" | "summer" | "fall" = "winter",
  limit: number = 20,
  page: number = 1
) {
  return jikanList(
    `${JIKAN_BASE}/seasons/${year}/${season}?order_by=score&sort=desc&limit=${limit}&page=${page}`
  );
}

/**
 * Advanced browse for the Anime library section: genre, free text,
 * air-date window (era timelines), and sort.
 */
export async function browseAnime(opts: {
  genre?: string;
  q?: string;
  yearFrom?: number;
  yearTo?: number;
  sort: "members" | "score" | "start_date_desc" | "start_date_asc";
  page: number;
  limit: number;
}) {
  const params = new URLSearchParams({
    limit: String(Math.min(opts.limit, 25)),
    page: String(opts.page),
    sfw: "true",
  });
  if (opts.genre) params.set("genres", opts.genre);
  if (opts.q) params.set("q", opts.q);
  if (opts.yearFrom) params.set("start_date", `${opts.yearFrom}-01-01`);
  if (opts.yearTo) params.set("end_date", `${opts.yearTo}-12-31`);

  switch (opts.sort) {
    case "score":
      params.set("order_by", "score");
      params.set("sort", "desc");
      params.set("min_score", "5");
      break;
    case "start_date_desc":
      params.set("order_by", "start_date");
      params.set("sort", "desc");
      break;
    case "start_date_asc":
      params.set("order_by", "start_date");
      params.set("sort", "asc");
      break;
    default:
      params.set("order_by", "members");
      params.set("sort", "desc");
  }

  return jikanList(`${JIKAN_BASE}/anime?${params}`);
}

export async function getAnimeByGenre(
  genreId: number,
  limit: number = 10,
  page: number = 1
) {
  // min_score keeps deep pages from decaying into unrated shovelware
  return jikanList(
    `${JIKAN_BASE}/anime?genres=${genreId}&order_by=score&sort=desc&limit=${limit}&page=${page}&min_score=6`
  );
}
