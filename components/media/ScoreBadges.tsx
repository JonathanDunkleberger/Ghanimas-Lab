"use client";

import type { ExternalRatings } from "@/lib/api/omdb";

/** Tiny tomato mark — red when fresh (>=60%), green when rotten. */
function TomatoIcon({ size = 13, fresh = true }: { size?: number; fresh?: boolean }) {
  const body = fresh ? "#FA320A" : "#7BA22A";
  const leaf = fresh ? "#00912D" : "#59702A";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="14" rx="9.5" ry="8.5" fill={body} />
      <path
        d="M12 2c-.4 2-2.6 3.2-4.6 3 1.2 1.4 3 1.9 4.6 1.6 1.6.3 3.4-.2 4.6-1.6-2 .2-4.2-1-4.6-3z"
        fill={leaf}
      />
      <path d="M12 4.5V7" stroke={leaf} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * IMDb / Rotten Tomatoes / Metacritic badges for the detail hero.
 * Renders nothing when there's no external data (e.g. OMDB_API_KEY unset).
 */
export function ScoreBadges({ ratings }: { ratings?: ExternalRatings | null }) {
  if (!ratings) return null;
  const { imdb_rating, imdb_votes, rotten_tomatoes, metacritic } = ratings;
  if (imdb_rating == null && rotten_tomatoes == null && metacritic == null)
    return null;

  return (
    <>
      {imdb_rating != null && (
        <span
          className="flex items-center gap-1.5"
          title={imdb_votes ? `IMDb — ${imdb_votes} votes` : "IMDb rating"}
        >
          <span
            className="rounded-[4px] px-[5px] py-[1px] text-[9px] font-black tracking-tight"
            style={{ background: "#F5C518", color: "#000" }}
          >
            IMDb
          </span>
          <span className="text-[14px] font-extrabold text-[#f0eeea]/60">
            {imdb_rating.toFixed(1)}
          </span>
        </span>
      )}
      {rotten_tomatoes != null && (
        <span
          className="flex items-center gap-1"
          title={`Rotten Tomatoes — ${rotten_tomatoes >= 60 ? "Fresh" : "Rotten"}`}
        >
          <TomatoIcon fresh={rotten_tomatoes >= 60} />
          <span className="text-[14px] font-extrabold text-[#f0eeea]/60">
            {rotten_tomatoes}%
          </span>
        </span>
      )}
      {metacritic != null && (
        <span className="flex items-center gap-1.5" title="Metacritic metascore">
          <span
            className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] text-[9px] font-black text-white"
            style={{
              background:
                metacritic >= 61 ? "#54A72A" : metacritic >= 40 ? "#C9A21A" : "#C33",
            }}
          >
            {metacritic}
          </span>
          <span className="text-[10px] font-semibold uppercase text-[#f0eeea]/35">
            Metascore
          </span>
        </span>
      )}
    </>
  );
}
