/* eslint-disable @typescript-eslint/no-explicit-any */
// OMDb (https://www.omdbapi.com) — free API that returns IMDb rating,
// Rotten Tomatoes %, and Metacritic score for a given IMDb ID.
// Requires OMDB_API_KEY; every helper degrades gracefully without it.

export interface ExternalRatings {
  imdb_id?: string;
  /** IMDb score on a 0–10 scale, e.g. 8.7 */
  imdb_rating?: number;
  /** Formatted vote count, e.g. "1,234,567" */
  imdb_votes?: string;
  /** Rotten Tomatoes tomatometer, 0–100 */
  rotten_tomatoes?: number;
  /** Metacritic metascore, 0–100 */
  metacritic?: number;
  /** Awards blurb, e.g. "Won 4 Oscars. 158 wins & 220 nominations" */
  awards?: string;
}

export async function getExternalRatings(
  imdbId: string | undefined | null
): Promise<ExternalRatings | null> {
  const key = process.env.OMDB_API_KEY;
  if (!key || !imdbId) return null;

  try {
    const res = await fetch(
      `https://www.omdbapi.com/?apikey=${key}&i=${encodeURIComponent(imdbId)}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data.Response === "False") return null;

    const val = (v: unknown) =>
      typeof v === "string" && v !== "N/A" ? v : undefined;

    const rtRaw = (data.Ratings || []).find(
      (r: any) => r.Source === "Rotten Tomatoes"
    )?.Value as string | undefined;

    const imdbRaw = val(data.imdbRating);
    const metaRaw = val(data.Metascore);

    const ratings: ExternalRatings = {
      imdb_id: imdbId,
      imdb_rating: imdbRaw ? parseFloat(imdbRaw) : undefined,
      imdb_votes: val(data.imdbVotes),
      rotten_tomatoes: rtRaw ? parseInt(rtRaw) : undefined,
      metacritic: metaRaw ? parseInt(metaRaw) : undefined,
      awards: val(data.Awards),
    };

    // Nothing useful came back — treat as a miss.
    if (
      ratings.imdb_rating == null &&
      ratings.rotten_tomatoes == null &&
      ratings.metacritic == null
    ) {
      return null;
    }
    return ratings;
  } catch {
    return null;
  }
}
