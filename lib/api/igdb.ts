// IGDB requires a Twitch OAuth token
let cachedToken: { token: string; expires: number } | null = null;

async function getTwitchToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID || "",
      client_secret: process.env.TWITCH_CLIENT_SECRET || "",
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) throw new Error("Failed to get Twitch token");
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + data.expires_in * 1000 - 60000,
  };
  return data.access_token;
}

async function igdbFetch(endpoint: string, body: string) {
  const token = await getTwitchToken();
  const res = await fetch(`https://api.igdb.com/v4${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID || "",
      Authorization: `Bearer ${token}`,
    },
    body,
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`IGDB request failed (${res.status}) for ${endpoint}:`, errText);
    return [];
  }
  return res.json();
}

export async function searchGames(query: string) {
  // NOTE: IGDB rejects (406) any query combining `search` with `sort` —
  // search results are already ranked by relevance, so no `sort` clause here.
  return igdbFetch(
    "/games",
    `search "${query}";
     fields name,cover.url,first_release_date,genres.name,
            platforms.name,rating,total_rating,total_rating_count,rating_count,
            summary,videos.*,screenshots.url,
            involved_companies.company.name,involved_companies.developer;
     limit 20;`
  );
}

export async function getGameDetails(igdbId: number) {
  const results = await igdbFetch(
    "/games",
    `where id = ${igdbId};
     fields name,url,cover.url,first_release_date,genres.name,
            platforms.name,rating,total_rating,aggregated_rating,
            summary,storyline,
            videos.*,screenshots.url,artworks.url,
            involved_companies.company.name,involved_companies.developer,
            involved_companies.publisher,
            game_modes.name,themes.name,
            franchises.name,game_engines.name,player_perspectives.name,
            collection.games.id,collection.games.name,collection.games.cover.url,
            dlcs.id,dlcs.name,dlcs.cover.url,
            expansions.id,expansions.name,expansions.cover.url,
            remakes.id,remakes.name,remakes.cover.url,
            similar_games.name,similar_games.cover.url,similar_games.id,
            game_time_to_beats.hastily,game_time_to_beats.normally,game_time_to_beats.completely,
            websites.url,websites.category;
     limit 1;`
  );
  return results[0] || null;
}

/** IGDB website category → label */
export function igdbWebsiteLabel(category: number | undefined): string | null {
  switch (category) {
    case 1:
      return "Official site";
    case 13:
      return "Steam";
    case 16:
      return "Epic Games";
    case 17:
      return "GOG";
    case 14:
      return "Reddit";
    case 5:
      return "Twitter";
    case 9:
      return "YouTube";
    case 18:
      return "Discord";
    default:
      return null;
  }
}

/** Convert IGDB seconds → rounded hours */
export function secondsToHours(seconds: number | undefined | null): number | undefined {
  if (seconds == null || seconds <= 0) return undefined;
  return Math.round((seconds / 3600) * 10) / 10;
}

export async function getPopularGames(limit: number = 20, offset: number = 0) {
  return igdbFetch(
    "/games",
    `fields name,cover.url,first_release_date,genres.name,
            rating,summary,involved_companies.company.name;
     where rating > 75 & rating_count > 50;
     sort rating desc;
     limit ${limit};
     offset ${offset};`
  );
}

export async function getRecentGames(limit: number = 20, offset: number = 0) {
  const sixMonthsAgo = Math.floor(
    (Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) / 1000
  );
  return igdbFetch(
    "/games",
    `fields name,cover.url,first_release_date,genres.name,
            rating,summary,involved_companies.company.name;
     where first_release_date > ${sixMonthsAgo} & rating > 60 & rating_count > 5;
     sort rating desc;
     limit ${limit};
     offset ${offset};`
  );
}

export async function getTopRatedGames(limit: number = 20, offset: number = 0) {
  return igdbFetch(
    "/games",
    `fields name,cover.url,first_release_date,genres.name,
            rating,summary,involved_companies.company.name;
     where rating_count > 100;
     sort rating desc;
     limit ${limit};
     offset ${offset};`
  );
}

/** IGDB genre ids: RPG 12, Shooter 5, Indie 32, Strategy 15, Platform 8, Adventure 31 */
export async function getGamesByGenre(
  genreId: number,
  limit: number = 20,
  offset: number = 0,
  minVotes: number = 20
) {
  return igdbFetch(
    "/games",
    `fields name,cover.url,first_release_date,genres.name,
            rating,summary,involved_companies.company.name;
     where genres = (${genreId}) & rating > 70 & rating_count > ${minVotes};
     sort rating desc;
     limit ${limit};
     offset ${offset};`
  );
}

/**
 * Advanced browse for the Games library section: genre, free text,
 * release window (era timelines), and sort. NOTE: IGDB rejects queries
 * combining `search` with `sort`, so free-text results keep IGDB's own
 * relevance order.
 */
export async function browseGames(opts: {
  genre?: string;
  q?: string;
  yearFrom?: number;
  yearTo?: number;
  sort: "popular" | "top" | "new" | "old";
  page: number;
  limit: number;
}) {
  const where: string[] = ["cover != null"];
  if (opts.genre) where.push(`genres = (${opts.genre})`);
  if (opts.yearFrom)
    where.push(
      `first_release_date > ${Math.floor(Date.UTC(opts.yearFrom, 0, 1) / 1000)}`
    );
  if (opts.yearTo)
    where.push(
      `first_release_date < ${Math.floor(Date.UTC(opts.yearTo + 1, 0, 1) / 1000)}`
    );

  let sortClause = "";
  switch (opts.sort) {
    case "top":
      where.push("rating_count > 40");
      sortClause = "sort rating desc;";
      break;
    case "new":
      where.push("rating_count > 3", "first_release_date != null");
      sortClause = "sort first_release_date desc;";
      break;
    case "old":
      where.push("rating_count > 10", "first_release_date != null");
      sortClause = "sort first_release_date asc;";
      break;
    default:
      where.push("rating_count > 10");
      sortClause = "sort rating_count desc;";
  }

  return igdbFetch(
    "/games",
    `fields name,cover.url,first_release_date,genres.name,
            rating,summary,involved_companies.company.name;
     ${opts.q ? `search "${opts.q.replace(/"/g, "")}";` : sortClause}
     where ${where.join(" & ")};
     limit ${opts.limit};
     offset ${(opts.page - 1) * opts.limit};`
  );
}

export function igdbImageUrl(
  url: string | undefined,
  size: string = "cover_big"
): string | undefined {
  if (!url) return undefined;
  return url.replace("t_thumb", `t_${size}`).replace("//", "https://");
}
