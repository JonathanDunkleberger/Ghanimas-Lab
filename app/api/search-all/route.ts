/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { searchTMDB } from "@/lib/api/tmdb";
import { searchAnime, searchManga } from "@/lib/api/jikan";
import { searchGames } from "@/lib/api/igdb";
import { searchBooks, bookCoverUrl, stripHtml } from "@/lib/api/books";
import { searchOpenLibrary, normalizeOpenLibraryDoc } from "@/lib/api/openlibrary";

// TMDB Genre ID → Name Map
const TMDB_GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News",
  10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap",
  10767: "Talk", 10768: "War & Politics",
};

// ─── Relevance helpers ───────────────────────────────────────────────────────

/** Lowercase, strip accents/punctuation → comparable text */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * How well does the query match this title? 0..1
 * Exact > prefix ("dune" → "Dune: Part Two") > all words > some words.
 */
function titleMatch(query: string, rawTitle: string): number {
  const title = norm(rawTitle);
  if (!title || !query) return 0;
  if (title === query) return 1;
  if (title.startsWith(query + " ")) return 0.85;

  const qTokens = query.split(" ");
  const tTokens = new Set(title.split(" "));
  const hits = qTokens.filter((t) => tTokens.has(t)).length;
  if (hits === qTokens.length) return 0.6; // every query word present
  if (title.includes(query)) return 0.45; // substring (mid-title)
  if (hits > 0) return 0.25 * (hits / qTokens.length);
  return 0;
}

/** Author / creator match: lets "frank herbert" surface his novels. 0..1 */
function authorMatch(query: string, rawAuthor: string | undefined): number {
  if (!rawAuthor) return 0;
  const author = norm(rawAuthor);
  if (!author) return 0;
  if (author === query) return 1;
  if (author.includes(query)) return 0.8;
  const qTokens = query.split(" ");
  const aTokens = new Set(author.split(" "));
  const hits = qTokens.filter((t) => aTokens.has(t)).length;
  // Surname-only matches ("herbert") still count, weaker
  return hits > 0 ? 0.5 * (hits / qTokens.length) : 0;
}

/**
 * Popularity 0..1, log-scaled per source so a beloved classic novel and a
 * blockbuster film land on comparable footing. This is what pushes The Force
 * Awakens above fan-made "Star Wars" shovelware with the same exact title.
 */
function popularityOf(item: any): number {
  switch (item.media_type) {
    case "film":
    case "tv": {
      const pop = Math.min(Math.log10((item._tmdb_popularity || 0) + 1) / 3, 1);
      const votes = Math.min(Math.log10((item._vote_count || 0) + 1) / 4.3, 1);
      return 0.4 * pop + 0.6 * votes;
    }
    case "anime":
    case "manga":
      // 2M+ MAL members ≈ 1.0
      return Math.min(Math.log10((item._mal_members || 0) + 1) / 6.3, 1);
    case "game":
      // ~3000+ combined ratings ≈ 1.0
      return Math.min(Math.log10((item._rating_count || 0) + 1) / 3.5, 1);
    case "book":
      return Math.min(Math.log10((item._ratings_count || 0) + 1) / 3.5, 1);
    default:
      return 0;
  }
}

function scoreResult(item: any, query: string): number {
  const tMatch = titleMatch(query, item.title || "");
  const aMatch = authorMatch(query, item.author);
  const match = Math.max(tMatch, aMatch * 0.9);
  const pop = popularityOf(item);

  let score = 0;
  // Base relevance
  score += match * 400;
  // Popularity matters on its own…
  score += pop * 250;
  // …but a popular title that *also* matches the query should dominate.
  // This is the term that orders "dune" → Dune (2021), Dune: Part Two,
  // the Herbert novels, Dune: Awakening — ahead of obscure exact matches.
  score += match * pop * 450;

  // Quality: rating weighted by how much we trust it (vote volume)
  if (item.rating) score += (item.rating / 100) * 40 * Math.max(pop, 0.2);

  // Slight freshness edge for recent, relevant titles
  const year = parseInt(String(item.year));
  const age = new Date().getFullYear() - (year || 0);
  if (year && age <= 3 && match > 0.4) score += 25 - age * 5;

  // Items without artwork look broken in the grid — sink them
  if (!item.cover_image_url) score -= 120;

  // No title or author relation at all → near the bottom
  if (match === 0) score -= 250;

  return score;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const type = searchParams.get("type");

  if (!q || q.trim().length === 0) {
    return NextResponse.json([]);
  }

  try {
    const promises: Promise<any[]>[] = [];

    if (!type || type === "film" || type === "tv") {
      promises.push(
        searchTMDB(q).then((results) =>
          (results as any[]).map((r: any) => ({
            id: `tmdb-${r.id}`,
            media_type: r.media_type === "tv" ? "tv" : "film",
            title: r.title || r.name || "",
            slug: `tmdb-${r.id}`,
            cover_image_url: r.poster_path
              ? `https://image.tmdb.org/t/p/w300${r.poster_path}`
              : undefined,
            backdrop_image_url: r.backdrop_path
              ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}`
              : undefined,
            description: r.overview,
            year: (r.release_date || r.first_air_date || "").slice(0, 4),
            rating: (r.vote_average || 0) * 10,
            genres: (r.genre_ids || []).map((id: number) => TMDB_GENRE_MAP[id] || String(id)),
            tmdb_id: r.id,
            _tmdb_popularity: r.popularity,
            _vote_count: r.vote_count,
          }))
        )
      );
    }

    if (!type || type === "anime") {
      promises.push(
        searchAnime(q).then((results) =>
          (results as any[]).map((r: any) => ({
            id: `mal-${r.mal_id}`,
            media_type: "anime",
            title: r.title_english || r.title || "",
            slug: `mal-${r.mal_id}`,
            cover_image_url: r.images?.jpg?.large_image_url,
            description: r.synopsis,
            year: String(r.year || ""),
            rating: (r.score || 0) * 10,
            genres: (r.genres || []).map((g: any) => g.name),
            mal_id: r.mal_id,
            _mal_members: r.members,
          }))
        )
      );
    }

    if (!type || type === "manga") {
      promises.push(
        searchManga(q).then((results) =>
          (results as any[]).map((r: any) => ({
            id: `mal-manga-${r.mal_id}`,
            media_type: "manga",
            title: r.title_english || r.title || "",
            slug: `mal-manga-${r.mal_id}`,
            cover_image_url: r.images?.jpg?.large_image_url,
            description: r.synopsis,
            year: String(r.published?.from?.slice(0, 4) || ""),
            rating: (r.score || 0) * 10,
            genres: (r.genres || []).map((g: any) => g.name),
            author: (r.authors || []).map((a: any) => a.name).join(", "),
            mal_id: r.mal_id,
            _mal_members: r.members,
          }))
        )
      );
    }

    if (!type || type === "game") {
      promises.push(
        searchGames(q).then((results) =>
          (results as any[]).map((r: any) => ({
            id: `igdb-${r.id}`,
            media_type: "game",
            title: r.name || "",
            slug: `igdb-${r.id}`,
            cover_image_url: r.cover?.url
              ? `https:${r.cover.url.replace("t_thumb", "t_cover_big")}`
              : undefined,
            description: r.summary,
            year: r.first_release_date
              ? new Date(r.first_release_date * 1000).getFullYear().toString()
              : "",
            rating: Math.round(r.total_rating || 0),
            genres: (r.genres || []).map((g: any) => g.name),
            igdb_id: r.id,
            _rating_count: (r.total_rating_count || 0) + (r.rating_count || 0),
          }))
        )
      );
    }

    if (!type || type === "book") {
      promises.push(
        searchBooks(q).then(async (results) => {
          if ((results as any[]).length > 0) {
            return (results as any[]).map((r: any) => {
              const vi = r.volumeInfo || {};
              return {
                id: `gbook-${r.id}`,
                media_type: "book",
                title: vi.title || "",
                slug: `gbook-${r.id}`,
                cover_image_url: bookCoverUrl(vi),
                description: stripHtml(vi.description),
                year: (vi.publishedDate || "").slice(0, 4),
                rating: (vi.averageRating || 0) * 20,
                genres: vi.categories || [],
                author: (vi.authors || []).join(", "),
                isbn: (vi.industryIdentifiers || [])[0]?.identifier,
                _ratings_count: vi.ratingsCount,
              };
            });
          }
          // Google Books down or over quota → Open Library keeps books alive
          const docs = await searchOpenLibrary(q, 20);
          return (docs as any[]).map((doc: any) => ({
            ...normalizeOpenLibraryDoc(doc),
            _ratings_count: doc.ratings_count,
          }));
        })
      );
    }

    const allResults = await Promise.allSettled(promises);
    const combined = allResults
      .filter(
        (r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled"
      )
      .flatMap((r) => r.value);

    const query = norm(q);
    const scored = combined
      .map((item) => ({ item, score: scoreResult(item, query) }))
      .sort((a, b) => b.score - a.score);

    // Strong = query relates to the title or author. If we have enough of
    // those, drop the noise. If we don't (e.g. a typo like "tolkein" that
    // only Google Books quietly corrected), keep everything — the popular
    // corrected results are already sorted to the top.
    const strong = scored.filter(
      ({ item }) =>
        titleMatch(query, item.title || "") > 0 ||
        authorMatch(query, item.author) > 0
    );
    const chosen = strong.length >= 8 ? strong : scored;

    const results = chosen.slice(0, 50).map(({ item }) => {
      // Internal scoring signals don't belong in the payload
      const {
        _tmdb_popularity, _vote_count, _mal_members,
        _rating_count, _ratings_count,
        ...clean
      } = item;
      return clean;
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
