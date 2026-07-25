/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getTMDBDetails, getTMDBTrending } from "@/lib/api/tmdb";
import { getAnimeDetails, getAnimeEpisodeCount, getTopAnime } from "@/lib/api/jikan";
import {
  getGameDetails,
  getPopularGames,
  igdbWebsiteLabel,
  secondsToHours,
} from "@/lib/api/igdb";
import { getBookDetails, bookCoverUrl, browseBooks, searchBooks } from "@/lib/api/books";
import { getExternalRatings } from "@/lib/api/omdb";
import { estimateGameHours } from "@/lib/api/openai";
import {
  normalizeTMDBMovie,
  normalizeTMDBTV,
  normalizeJikan,
  normalizeIGDB,
  normalizeBook,
} from "@/lib/api/normalize";
import type { MediaItem } from "@/stores/app-store";
import type { MediaType } from "@/lib/constants";

type OutLink = { label: string; url: string };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const [source, ...idParts] = slug.split("-");
    const sourceId = idParts.join("-");

    if (!source || !sourceId) {
      return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
    }

    let media: any = null;

    if (source === "tmdb") {
      const id = parseInt(sourceId);
      if (isNaN(id)) return NextResponse.json({ error: "Invalid TMDB ID" }, { status: 400 });

      let data: any = await getTMDBDetails(id, "movie");
      if (!data || data.success === false) {
        data = await getTMDBDetails(id, "tv");
        if (data && data.success !== false) {
          media = mapTMDB(data, "tv");
        }
      } else {
        media = mapTMDB(data, data.number_of_seasons ? "tv" : "film");
      }

      // IMDb / Rotten Tomatoes / Metacritic via OMDb (needs OMDB_API_KEY)
      if (media && data) {
        const imdbId: string | undefined =
          data.imdb_id || data.external_ids?.imdb_id;
        if (imdbId) {
          const ext = await getExternalRatings(imdbId);
          if (ext) media.metadata.external_ratings = ext;
          (media.metadata.links as OutLink[]).splice(1, 0, {
            label: "IMDb",
            url: `https://www.imdb.com/title/${imdbId}/`,
          });
        }
        (media.metadata.links as OutLink[]).push({
          label: "Rotten Tomatoes",
          url: `https://www.rottentomatoes.com/search?search=${encodeURIComponent(media.title)}`,
        });
      }
    } else if (source === "mal") {
      const id = parseInt(sourceId);
      if (isNaN(id)) return NextResponse.json({ error: "Invalid MAL ID" }, { status: 400 });

      const data: any = await getAnimeDetails(id);
      if (data?.mal_id) {
        // Airing shows report episodes: null — count the aired ones instead
        let episodeCount: number | undefined = data.episodes;
        if (episodeCount == null) {
          episodeCount = await getAnimeEpisodeCount(id);
        }
        const relatedAnime: any[] = [];
        if (data.relations) {
          for (const rel of data.relations) {
            for (const entry of rel.entry || []) {
              if (entry.type === "anime") {
                relatedAnime.push({
                  id: `mal-${entry.mal_id}`,
                  media_type: "anime",
                  title: entry.name,
                  slug: `mal-${entry.mal_id}`,
                  genres: [],
                });
              }
            }
          }
        }

        media = {
          id: `mal-${data.mal_id}`,
          media_type: "anime",
          title: data.title_english || data.title,
          original_title: data.title_japanese,
          slug: `mal-${data.mal_id}`,
          description: data.synopsis,
          cover_image_url: data.images?.jpg?.large_image_url,
          backdrop_image_url: data.images?.jpg?.large_image_url,
          year: data.year || (data.aired?.from ? new Date(data.aired.from).getFullYear() : undefined),
          rating: (data.score || 0) * 10,
          genres: (data.genres || []).map((g: any) => g.name),
          author: (data.studios || []).map((s: any) => s.name).join(", "),
          mal_id: data.mal_id,
          status_text: data.status,
          runtime: episodeCount,
          cast: (data.characters || []).slice(0, 20).map((c: any) => {
            const va = (c.voice_actors || []).find(
              (v: any) => v.language === "Japanese"
            ) || (c.voice_actors || [])[0];
            return {
              name: c.character?.name || "",
              character: va?.person?.name
                ? `CV: ${va.person.name}`
                : c.role,
              image_url: c.character?.images?.jpg?.image_url,
              role: c.role,
            };
          }),
          videos: data.trailer?.youtube_id
            ? [{
                id: data.trailer.youtube_id,
                title: `${data.title} Trailer`,
                thumbnail: data.trailer.images?.maximum_image_url || `https://i.ytimg.com/vi/${data.trailer.youtube_id}/maxresdefault.jpg`,
                type: "Trailer",
              }]
            : [],
          tags: [
            ...(data.themes || []).map((t: any) => t.name),
            ...(data.demographics || []).map((d: any) => d.name),
          ],
          seasons: episodeCount
            ? [{ number: 1, episode_count: episodeCount, name: "Season 1", air_date: data.aired?.from }]
            : [],
          related: relatedAnime.length > 0 ? relatedAnime : undefined,
          metadata: {
            type_text: data.type,
            source: data.source,
            duration: data.duration,
            // "24 min per ep" → 24, used for binge math
            episode_minutes: (() => {
              const m = /(\d+)\s*min/.exec(data.duration || "");
              return m ? parseInt(m[1]) : undefined;
            })(),
            aired_from: data.aired?.from,
            aired_to: data.aired?.to,
            season: data.season,
            broadcast: data.broadcast?.string,
            producers: (data.producers || []).map((p: any) => p.name),
            licensors: (data.licensors || []).map((l: any) => l.name),
            mal_rank: data.rank,
            mal_popularity: data.popularity,
            mal_members: data.members,
            mal_scored_by: data.scored_by,
            content_rating: data.rating,
            homepage: data.url,
            links: [
              { label: "MyAnimeList", url: `https://myanimelist.net/anime/${data.mal_id}` },
            ] as OutLink[],
          },
        };
      }
    } else if (source === "igdb") {
      const id = parseInt(sourceId);
      if (isNaN(id)) return NextResponse.json({ error: "Invalid IGDB ID" }, { status: 400 });

      const data: any = await getGameDetails(id);
      if (data) {
        const ttRaw = data.game_time_to_beats;
        const tt = Array.isArray(ttRaw) ? ttRaw[0] || {} : ttRaw || {};
        const playtime: {
          hastily?: number;
          normally?: number;
          completely?: number;
          estimated?: boolean;
        } = {
          hastily: secondsToHours(tt.hastily),
          normally: secondsToHours(tt.normally),
          completely: secondsToHours(tt.completely),
        };
        // IGDB has no data for many games — fall back to an AI estimate
        if (playtime.normally == null) {
          const releaseYear = data.first_release_date
            ? new Date(data.first_release_date * 1000).getFullYear()
            : undefined;
          const est = await estimateGameHours(data.name, releaseYear);
          if (est != null) {
            playtime.normally = est;
            playtime.estimated = true;
          }
        }
        const links: OutLink[] = [];
        if (data.url) links.push({ label: "IGDB", url: data.url });
        for (const w of data.websites || []) {
          const label = igdbWebsiteLabel(w.category);
          if (label && w.url) links.push({ label, url: w.url });
        }

        media = {
          id: `igdb-${data.id}`,
          media_type: "game",
          title: data.name,
          slug: `igdb-${data.id}`,
          description: data.summary,
          cover_image_url: data.cover?.url
            ? `https:${data.cover.url.replace("t_thumb", "t_cover_big")}`
            : undefined,
          backdrop_image_url: data.screenshots?.[0]?.url
            ? `https:${data.screenshots[0].url.replace("t_thumb", "t_screenshot_big")}`
            : undefined,
          year: data.first_release_date
            ? new Date(data.first_release_date * 1000).getFullYear()
            : undefined,
          rating: data.total_rating ? Math.round(data.total_rating) : undefined,
          genres: (data.genres || []).map((g: any) => g.name),
          author: (data.involved_companies || [])
            .filter((c: any) => c.developer)
            .map((c: any) => c.company?.name)
            .join(", "),
          igdb_id: data.id,
          // main-story hours for games
          runtime: playtime.normally,
          status_text: data.status
            ? ["Released", "Alpha", "Beta", "Early Access", "Offline", "Cancelled", "Rumored"][data.status]
            : undefined,
          videos: (data.videos || []).map((v: any) => ({
            id: v.video_id,
            title: v.name || "Gameplay",
            thumbnail: `https://i.ytimg.com/vi/${v.video_id}/maxresdefault.jpg`,
            type: "Gameplay",
          })),
          where_to_watch: (data.platforms || []).map((p: any) => ({
            provider: p.name || "Platform",
            type: "buy" as const,
          })),
          tags: (data.themes || []).map((t: any) => t.name),
          related: (data.similar_games || []).slice(0, 15).map((g: any) => ({
            id: `igdb-${g.id}`,
            media_type: "game",
            title: g.name,
            slug: `igdb-${g.id}`,
            cover_image_url: g.cover?.url
              ? `https:${g.cover.url.replace("t_thumb", "t_cover_big")}`
              : undefined,
            genres: [],
          })),
          metadata: {
            game_modes: (data.game_modes || []).map((m: any) => m.name),
            developer: (data.involved_companies || [])
              .filter((c: any) => c.developer)
              .map((c: any) => c.company?.name)
              .join(", "),
            publisher: (data.involved_companies || [])
              .filter((c: any) => c.publisher)
              .map((c: any) => c.company?.name)
              .join(", "),
            igdb_rating: data.rating ? Math.round(data.rating) : undefined,
            aggregated_rating: data.aggregated_rating ? Math.round(data.aggregated_rating) : undefined,
            storyline: data.storyline,
            playtime,
            links,
          },
        };
      }
    } else if (source === "book" || source === "gbook") {
      const data: any = await getBookDetails(sourceId);
      if (data) {
        const vol = data.volumeInfo || {};
        const q = encodeURIComponent(
          [vol.title, (vol.authors || [])[0]].filter(Boolean).join(" ")
        );
        const links: OutLink[] = [];
        links.push({
          label: "Audible",
          url: `https://www.audible.com/search?keywords=${q}`,
        });
        links.push({
          label: "Amazon",
          url: `https://www.amazon.com/s?k=${q}&i=stripbooks`,
        });
        links.push({
          label: "Goodreads",
          url: `https://www.goodreads.com/search?q=${q}`,
        });
        if (vol.previewLink) links.push({ label: "Preview", url: vol.previewLink });
        if (vol.infoLink) links.push({ label: "Google Books", url: vol.infoLink });
        links.push({
          label: "Open Library",
          url: `https://openlibrary.org/search?q=${q}`,
        });

        media = {
          id: `gbook-${sourceId}`,
          media_type: "book",
          title: vol.title || "",
          slug: `gbook-${sourceId}`,
          description: vol.description,
          cover_image_url: bookCoverUrl(vol),
          year: vol.publishedDate ? parseInt(vol.publishedDate) : undefined,
          rating: vol.averageRating ? vol.averageRating * 20 : undefined,
          genres: vol.categories || [],
          author: (vol.authors || []).join(", "),
          isbn: sourceId,
          runtime: vol.pageCount,
          status_text: vol.printType || undefined,
          tags: [
            vol.language ? `Language: ${vol.language.toUpperCase()}` : null,
            vol.maturityRating === "MATURE" ? "Mature" : null,
            ...(vol.categories || []),
          ].filter(Boolean),
          metadata: {
            publisher: vol.publisher,
            publishedDate: vol.publishedDate,
            pageCount: vol.pageCount,
            printType: vol.printType,
            ratingsCount: vol.ratingsCount,
            language: vol.language,
            previewLink: vol.previewLink,
            infoLink: vol.infoLink,
            subtitle: vol.subtitle,
            links,
          },
        };
      }
    }

    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    media.explore_more = await buildExploreMore(media as MediaItem);

    return NextResponse.json(media);
  } catch (error) {
    console.error("Media detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch media details" },
      { status: 500 }
    );
  }
}

function mapTMDB(data: any, type: "film" | "tv") {
  const certifications = data.release_dates?.results || data.content_ratings?.results || [];
  const usCert = certifications.find((c: any) => c.iso_3166_1 === "US");
  const contentRating = type === "film"
    ? usCert?.release_dates?.[0]?.certification
    : usCert?.rating;

  const usProviders = data["watch/providers"]?.results?.US;
  const providerLink = usProviders?.link as string | undefined;
  const flatrate = usProviders?.flatrate || [];

  const links: OutLink[] = [
    {
      label: "TMDB",
      url: `https://www.themoviedb.org/${type === "tv" ? "tv" : "movie"}/${data.id}`,
    },
  ];
  if (data.homepage) links.push({ label: "Official site", url: data.homepage });
  if (providerLink) links.push({ label: "Where to watch", url: providerLink });

  return {
    id: `tmdb-${data.id}`,
    media_type: type,
    title: data.title || data.name || "",
    original_title: data.original_title || data.original_name,
    slug: `tmdb-${data.id}`,
    description: data.overview,
    cover_image_url: data.poster_path
      ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
      : undefined,
    backdrop_image_url: data.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
      : undefined,
    year: (data.release_date || data.first_air_date || "").slice(0, 4),
    rating: data.vote_average ? Math.round(data.vote_average * 10) : undefined,
    genres: (data.genres || []).map((g: any) => g.name),
    author: type === "film"
      ? (data.credits?.crew || []).find((c: any) => c.job === "Director")?.name
      : (data.created_by || []).map((c: any) => c.name).join(", "),
    tmdb_id: data.id,
    status_text: data.status,
    runtime: type === "film" ? data.runtime : data.number_of_episodes,
    // For TV, aggregate_credits spans the whole run (not just the latest season)
    cast: (
      (type === "tv" && data.aggregate_credits?.cast?.length
        ? data.aggregate_credits.cast
        : data.credits?.cast) || []
    )
      .slice(0, 20)
      .map((c: any) => ({
        name: c.name,
        character: c.roles?.[0]?.character || c.character,
        image_url: c.profile_path
          ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
          : undefined,
      })),
    videos: (data.videos?.results || [])
      .filter((v: any) => v.site === "YouTube")
      .slice(0, 8)
      .map((v: any) => ({
        id: v.key,
        title: v.name,
        thumbnail: `https://i.ytimg.com/vi/${v.key}/maxresdefault.jpg`,
        type: v.type,
      })),
    seasons: type === "tv"
      ? (data.seasons || []).map((s: any) => ({
          number: s.season_number,
          episode_count: s.episode_count,
          name: s.name,
          air_date: s.air_date,
        }))
      : undefined,
    where_to_watch: flatrate.map((p: any) => ({
      provider: p.provider_name,
      logo_url: p.logo_path
        ? `https://image.tmdb.org/t/p/w45${p.logo_path}`
        : undefined,
      url: providerLink,
      type: "stream" as const,
    })),
    tags: (data.keywords?.keywords || data.keywords?.results || []).map((k: any) => k.name),
    related: (data.similar?.results || []).slice(0, 15).map((r: any) => ({
      id: `tmdb-${r.id}`,
      media_type: type,
      title: r.title || r.name || "",
      slug: `tmdb-${r.id}`,
      cover_image_url: r.poster_path
        ? `https://image.tmdb.org/t/p/w300${r.poster_path}`
        : undefined,
      year: parseInt((r.release_date || r.first_air_date || "").slice(0, 4)) || undefined,
      rating: r.vote_average ? Math.round(r.vote_average * 10) : undefined,
      genres: [],
    })),
    metadata: {
      content_rating: contentRating || undefined,
      production_companies: (data.production_companies || []).map((c: any) => c.name),
      budget: type === "film" && data.budget > 0 ? data.budget : undefined,
      revenue: type === "film" && data.revenue > 0 ? data.revenue : undefined,
      episode_runtime:
        type === "tv"
          ? data.episode_run_time?.[0] || data.last_episode_to_air?.runtime || undefined
          : undefined,
      networks: type === "tv" ? (data.networks || []).map((n: any) => n.name) : undefined,
      first_air_date: type === "tv" ? data.first_air_date || undefined : undefined,
      last_air_date: type === "tv" ? data.last_air_date || undefined : undefined,
      season_count: type === "tv" ? data.number_of_seasons || undefined : undefined,
      spoken_languages: (data.spoken_languages || []).map((l: any) => l.english_name),
      tagline: data.tagline || undefined,
      vote_count: data.vote_count || undefined,
      homepage: data.homepage || undefined,
      links,
    },
  };
}

async function buildExploreMore(media: MediaItem): Promise<MediaItem[]> {
  const exclude = new Set<string>([media.id]);
  const picks: MediaItem[] = [];

  const pushUnique = (items: MediaItem[], limit = 99) => {
    for (const item of items) {
      if (picks.length >= 5) break;
      if (!item?.id || exclude.has(item.id)) continue;
      if (!item.cover_image_url) continue;
      exclude.add(item.id);
      picks.push(item);
      if (picks.filter((p) => p.media_type === item.media_type).length >= limit) {
        // soft per-type cap handled by callers
      }
    }
  };

  // 1) Same-type related first (max 2 so room for cross-media)
  const related = (media.related || []).filter((r) => r.cover_image_url);
  pushUnique(related.slice(0, 2));

  const genreHint =
    media.genres?.[0] ||
    media.tags?.[0] ||
    media.title.split(/\s+/).slice(0, 2).join(" ");

  const otherTypes: MediaType[] = (
    ["film", "tv", "anime", "game", "book"] as MediaType[]
  ).filter((t) => t !== media.media_type);

  // 2) Fetch pools for other types in parallel
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
  while (picks.length < 5 && added) {
    added = false;
    for (const { items } of pools) {
      if (picks.length >= 5) break;
      const next = items.find((i) => i.cover_image_url && !exclude.has(i.id));
      if (next) {
        exclude.add(next.id);
        picks.push(next);
        added = true;
      }
    }
  }

  // 3) Top up with more same-type related if still short
  if (picks.length < 5) {
    pushUnique(related.slice(2));
  }

  return picks.slice(0, 5);
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
      let rows = await browseBooks(subject, 10);
      if (!rows.length) rows = await searchBooks(genreHint || "bestseller");
      return (rows || []).map(normalizeBook);
    }
    default:
      return [];
  }
}
