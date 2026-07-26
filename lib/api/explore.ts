import { discoverTMDB, getTMDBTrending } from "@/lib/api/tmdb";
import { getAnimeByGenre, getTopAnime } from "@/lib/api/jikan";
import { getGamesByGenre, getTopRatedGames } from "@/lib/api/igdb";
import { fetchBooksBySubject } from "@/lib/api/openlibrary";
import {
  normalizeTMDBMovie,
  normalizeTMDBTV,
  normalizeJikan,
  normalizeIGDB,
} from "@/lib/api/normalize";
import type { MediaItem } from "@/stores/app-store";
import type { MediaType } from "@/lib/constants";

/**
 * Cross-media genre concepts. The seed title's genres/tags are scanned for
 * these (in order — specific before generic), and each concept knows the
 * equivalent shelf in every source's taxonomy. This is what makes One Piece
 * suggest fantasy epics and RPGs instead of whatever's trending this week.
 */
interface Concept {
  match: RegExp;
  tmdbMovie: string; // TMDB movie genre id
  tmdbTv: string; // TMDB tv genre id
  jikan: number; // MAL genre/theme id
  igdb: number; // IGDB genre id
  subject: string; // Open Library subject
}

const CONCEPTS: Concept[] = [
  { match: /sci[- ]?fi|science.?fiction|cyberpunk|space|dystopi/i, tmdbMovie: "878", tmdbTv: "10765", jikan: 24, igdb: 5, subject: "science fiction" },
  { match: /fantasy|magic|isekai|mytholog|dragon|wizard/i, tmdbMovie: "14", tmdbTv: "10765", jikan: 10, igdb: 12, subject: "fantasy" },
  { match: /horror|scary|zombie|ghost/i, tmdbMovie: "27", tmdbTv: "9648", jikan: 14, igdb: 31, subject: "horror" },
  { match: /mystery|detective|noir|whodunit/i, tmdbMovie: "9648", tmdbTv: "9648", jikan: 7, igdb: 31, subject: "mystery" },
  { match: /thriller|suspense|crime|espionage|spy|heist/i, tmdbMovie: "53", tmdbTv: "80", jikan: 41, igdb: 31, subject: "thriller" },
  { match: /romance|love stor/i, tmdbMovie: "10749", tmdbTv: "18", jikan: 22, igdb: 34, subject: "romance" },
  { match: /comedy|humor|satir|parody/i, tmdbMovie: "35", tmdbTv: "35", jikan: 4, igdb: 8, subject: "humor" },
  { match: /\bwar\b|military|battle/i, tmdbMovie: "10752", tmdbTv: "10768", jikan: 38, igdb: 15, subject: "war" },
  { match: /western/i, tmdbMovie: "37", tmdbTv: "37", jikan: 8, igdb: 5, subject: "western" },
  { match: /sport/i, tmdbMovie: "18", tmdbTv: "18", jikan: 30, igdb: 14, subject: "sports" },
  { match: /philosoph|stoic|theolog|religio|psycholog/i, tmdbMovie: "18", tmdbTv: "18", jikan: 40, igdb: 9, subject: "philosophy" },
  { match: /histor|classic|antiquity|epic poetry/i, tmdbMovie: "36", tmdbTv: "18", jikan: 8, igdb: 15, subject: "historical fiction" },
  { match: /action|martial|superhero/i, tmdbMovie: "28", tmdbTv: "10759", jikan: 1, igdb: 5, subject: "adventure" },
  { match: /adventure|quest|surviv|pirate|expedition/i, tmdbMovie: "12", tmdbTv: "10759", jikan: 2, igdb: 31, subject: "adventure" },
  { match: /drama|literary|fiction|novel|biograph|memoir|coming.of.age/i, tmdbMovie: "18", tmdbTv: "18", jikan: 8, igdb: 12, subject: "literary fiction" },
];

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

  const haystack = [...(media.genres || []), ...(media.tags || [])]
    .join(" ")
    .toLowerCase();
  const concept = CONCEPTS.find((c) => c.match.test(haystack));

  const otherTypes: MediaType[] = (
    ["film", "tv", "anime", "game", "book"] as MediaType[]
  ).filter((t) => t !== media.media_type);

  const pools = await Promise.all(
    otherTypes.map(async (type) => {
      try {
        const items = await fetchPoolForType(type, concept);
        return { type, items };
      } catch {
        return { type, items: [] as MediaItem[] };
      }
    })
  );

  // Round-robin across types for diversity. Dedupe by normalized title too,
  // so the same franchise doesn't appear as both the film and the book.
  const titleKey = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  const seenTitles = new Set<string>([titleKey(media.title)]);
  let added = true;
  while (picks.length < MAX_PICKS && added) {
    added = false;
    for (const { items } of pools) {
      if (picks.length >= MAX_PICKS) break;
      const next = items.find(
        (i) =>
          i.cover_image_url &&
          !exclude.has(i.id) &&
          !seenTitles.has(titleKey(i.title))
      );
      if (next) {
        exclude.add(next.id);
        seenTitles.add(titleKey(next.title));
        picks.push(next);
        added = true;
      }
    }
  }

  return picks.slice(0, MAX_PICKS);
}

async function fetchPoolForType(
  type: MediaType,
  concept: Concept | undefined
): Promise<MediaItem[]> {
  switch (type) {
    case "film": {
      if (concept) {
        // vote_count sort = beloved canonical titles, not this week's churn
        const rows = await discoverTMDB("movie", {
          with_genres: concept.tmdbMovie,
          sort_by: "vote_count.desc",
        });
        if (rows.length) return rows.map(normalizeTMDBMovie);
      }
      const rows = await getTMDBTrending("movie", "week");
      return (rows || []).map(normalizeTMDBMovie);
    }
    case "tv": {
      if (concept) {
        const rows = await discoverTMDB("tv", {
          with_genres: concept.tmdbTv,
          sort_by: "vote_count.desc",
        });
        if (rows.length) return rows.map(normalizeTMDBTV);
      }
      const rows = await getTMDBTrending("tv", "week");
      return (rows || []).map(normalizeTMDBTV);
    }
    case "anime": {
      if (concept) {
        const rows = await getAnimeByGenre(concept.jikan, 12);
        if (rows.length) {
          return rows.map((r: Parameters<typeof normalizeJikan>[0]) =>
            normalizeJikan(r, "anime")
          );
        }
      }
      const rows = await getTopAnime("bypopularity", 12);
      return (rows || []).map((r: Parameters<typeof normalizeJikan>[0]) =>
        normalizeJikan(r, "anime")
      );
    }
    case "game": {
      if (concept) {
        // High vote floor: explore should surface Witcher 3, not a cult mod
        const rows = await getGamesByGenre(concept.igdb, 12, 0, 300);
        if (rows.length) return rows.map(normalizeIGDB);
      }
      const rows = await getTopRatedGames(12);
      return (rows || []).map(normalizeIGDB);
    }
    case "book": {
      return fetchBooksBySubject(concept?.subject || "fiction", 10);
    }
    default:
      return [];
  }
}
