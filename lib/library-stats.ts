import type { MediaItem, WrappedData, ActivityEntry } from "@/stores/app-store";
import type { HistoryEvent } from "@/stores/media-store";
import type { WrappedPeriod } from "@/lib/constants";
import { calculatePersonality } from "@/lib/recommendations/personality";

// ─── Shared input shape (mirrors useMediaStore state) ───────────────────────
export interface LibrarySnapshot {
  favorites: string[];
  watched: string[];
  watchlist: string[];
  ratings: Record<string, number>;
  items: Record<string, MediaItem>;
  history: HistoryEvent[];
}

// ─── Hours estimation ────────────────────────────────────────────────────────
// Falls back to sane per-type defaults when a cached list item has no runtime.
const DEFAULT_HOURS: Record<string, number> = {
  film: 2,
  tv: 12,
  anime: 6,
  game: 25,
  book: 8,
  manga: 6,
};

export function estimateItemHours(item: MediaItem | undefined): number {
  if (!item) return 0;
  const meta = (item.metadata || {}) as Record<string, unknown>;
  const r = item.runtime;

  switch (item.media_type) {
    case "film":
      return r ? r / 60 : DEFAULT_HOURS.film;
    case "tv": {
      if (!r) return DEFAULT_HOURS.tv;
      const epMin = typeof meta.episode_runtime === "number" ? meta.episode_runtime : 45;
      return (r * epMin) / 60;
    }
    case "anime": {
      if (!r) return DEFAULT_HOURS.anime;
      const epMin = typeof meta.episode_minutes === "number" ? meta.episode_minutes : 24;
      return (r * epMin) / 60;
    }
    case "game": {
      const playtime = meta.playtime as { normally?: number } | undefined;
      return playtime?.normally ?? r ?? DEFAULT_HOURS.game;
    }
    case "book":
      // ~40 pages/hour reading pace
      return r ? r / 40 : DEFAULT_HOURS.book;
    default:
      return r ? r / 60 : DEFAULT_HOURS.manga;
  }
}

// ─── Period helpers ──────────────────────────────────────────────────────────
function periodStart(period: WrappedPeriod, now: Date): number {
  if (period === "weekly") {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay()); // start of week (Sunday)
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (period === "monthly") {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  return new Date(now.getFullYear(), 0, 1).getTime();
}

export function periodLabel(period: WrappedPeriod, now: Date): string {
  if (period === "weekly") {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  if (period === "monthly") {
    return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return String(now.getFullYear());
}

/** Longest run of consecutive days with at least one history event */
function longestStreak(events: HistoryEvent[]): number {
  if (events.length === 0) return 0;
  const days = Array.from(
    new Set(events.map((e) => Math.floor(e.ts / 86_400_000)))
  ).sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** Current run of consecutive days (ending today or yesterday) */
export function currentStreak(events: HistoryEvent[]): number {
  if (events.length === 0) return 0;
  const daySet = new Set(events.map((e) => Math.floor(e.ts / 86_400_000)));
  const today = Math.floor(Date.now() / 86_400_000);
  let day = daySet.has(today) ? today : daySet.has(today - 1) ? today - 1 : -1;
  if (day === -1) return 0;
  let streak = 0;
  while (daySet.has(day)) {
    streak++;
    day--;
  }
  return streak;
}

// ─── Wrapped ─────────────────────────────────────────────────────────────────
export function buildWrappedData(
  snapshot: LibrarySnapshot,
  period: WrappedPeriod,
  now: Date = new Date()
): WrappedData | null {
  const { favorites, watched, watchlist, ratings, items, history } = snapshot;

  if (watched.length === 0 && favorites.length === 0) return null;

  const start = periodStart(period, now);

  // Latest "watched" event per media id
  const watchedEventById = new Map<string, number>();
  for (const e of history) {
    if (e.action === "watched") watchedEventById.set(e.id, e.ts);
  }

  // Which watched items count for this period. Items with no logged event
  // (tracked before history existed) count toward the yearly view only.
  const inPeriod = (id: string) => {
    const ts = watchedEventById.get(id);
    if (ts != null) return ts >= start;
    return period === "yearly";
  };
  let periodWatched = watched.filter(inPeriod);
  // A brand-new visitor's weekly/monthly view shouldn't be empty if they
  // have all-time data — fall back so the slideshow stays meaningful.
  const usedFallback = periodWatched.length === 0 && watched.length > 0;
  if (usedFallback) periodWatched = watched;

  // Hours by item and by type
  const hoursByType: Record<string, number> = {};
  const titleHours: { title: string; type: string; hours: number; cover_image_url?: string }[] = [];
  let totalHours = 0;
  for (const id of periodWatched) {
    const item = items[id];
    if (!item) continue;
    const h = estimateItemHours(item);
    totalHours += h;
    hoursByType[item.media_type] = (hoursByType[item.media_type] || 0) + h;
    titleHours.push({
      title: item.title,
      type: item.media_type,
      hours: Math.round(h),
      cover_image_url: item.cover_image_url,
    });
  }

  const TYPE_LABELS: Record<string, string> = {
    anime: "Anime",
    game: "Games",
    book: "Books",
    tv: "TV",
    film: "Film",
    manga: "Manga",
  };
  const breakdown = Object.entries(hoursByType)
    .map(([type, hours]) => ({
      type,
      label: TYPE_LABELS[type] || type,
      hours: Math.round(hours),
      pct: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  const topTitles = [...titleHours].sort((a, b) => b.hours - a.hours).slice(0, 5);

  // Genres — favorites weigh double
  const genreCounts: Record<string, number> = {};
  const countGenres = (ids: string[], weight: number) => {
    for (const id of ids) {
      for (const g of items[id]?.genres || []) {
        genreCounts[g] = (genreCounts[g] || 0) + weight;
      }
    }
  };
  countGenres(periodWatched, 1);
  countGenres(favorites, 2);
  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const topGenre = sortedGenres[0]?.[0] || "Uncharted";

  // Ratings
  const ratingValues = Object.values(ratings).filter((v) => v > 0);
  const avgRating =
    ratingValues.length > 0
      ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
      : 0;

  // Personality — adapt local store shape to the engine's input
  const allIds = Array.from(
    new Set([...watched, ...favorites, ...watchlist, ...Object.keys(ratings)])
  );
  const personality = calculatePersonality({
    library: allIds
      .filter((id) => items[id])
      .map((id) => ({
        media: {
          media_type: items[id].media_type,
          genres: items[id].genres,
          title: items[id].title,
        },
        status: watched.includes(id)
          ? "completed"
          : watchlist.includes(id)
            ? "planning"
            : "in_progress",
        rating: ratings[id],
        is_favorite: favorites.includes(id),
        progress_current: 0,
      })),
    activity: [],
  });

  const periodEvents = history.filter((e) => e.ts >= start);
  const streakEvents = periodEvents.length > 0 ? periodEvents : history;

  // Peak month (yearly only)
  let topMonth: WrappedData["topMonth"];
  if (period === "yearly") {
    const monthHours: Record<number, number> = {};
    for (const id of periodWatched) {
      const ts = watchedEventById.get(id);
      if (ts == null) continue;
      const m = new Date(ts).getMonth();
      monthHours[m] = (monthHours[m] || 0) + estimateItemHours(items[id]);
    }
    const best = Object.entries(monthHours).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] > 0) {
      topMonth = {
        month: new Date(2000, parseInt(best[0]), 1).toLocaleDateString("en-US", { month: "long" }),
        hours: Math.round(best[1]),
      };
    }
  }

  // Fastest binge — item that went watchlist → watched quickly
  let fastestBinge: WrappedData["fastestBinge"];
  {
    const watchlistedById = new Map<string, number>();
    for (const e of history) {
      if (e.action === "watchlisted" && !watchlistedById.has(e.id)) {
        watchlistedById.set(e.id, e.ts);
      }
    }
    let bestRate = 0;
    for (const id of periodWatched) {
      const wTs = watchedEventById.get(id);
      const lTs = watchlistedById.get(id);
      if (wTs == null || lTs == null || wTs <= lTs) continue;
      const days = Math.max(1, Math.ceil((wTs - lTs) / 86_400_000));
      if (days > 30) continue;
      const hours = Math.round(estimateItemHours(items[id]));
      if (hours < 4) continue;
      const rate = hours / days;
      if (rate > bestRate) {
        bestRate = rate;
        fastestBinge = { title: items[id]?.title || "Unknown", hours, days };
      }
    }
  }

  // Cross-medium favorite — a favorite outside the dominant medium
  let crossMediumFav: WrappedData["crossMediumFav"];
  {
    const typeTotals: Record<string, number> = {};
    for (const id of allIds) {
      const t = items[id]?.media_type;
      if (t) typeTotals[t] = (typeTotals[t] || 0) + 1;
    }
    const dominant = Object.entries(typeTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
    const candidates = favorites
      .filter((id) => items[id] && items[id].media_type !== dominant)
      .sort((a, b) => (ratings[b] || 0) - (ratings[a] || 0));
    if (dominant && candidates.length > 0) {
      crossMediumFav = {
        title: items[candidates[0]].title,
        type: items[candidates[0]].media_type,
      };
    }
  }

  const genreExplored = new Set(
    periodWatched.flatMap((id) => items[id]?.genres || [])
  ).size;

  return {
    period,
    period_label: usedFallback ? "All Time" : periodLabel(period, now),
    totalHours: Math.round(totalHours),
    titlesCompleted: periodWatched.length,
    topGenre,
    longestStreak: longestStreak(streakEvents),
    personality: personality.name,
    personalityDesc: personality.description,
    breakdown,
    topTitles,
    fastestBinge,
    genreExplored,
    avgRating,
    topMonth,
    crossMediumFav,
  };
}

// ─── Activity feed ───────────────────────────────────────────────────────────
const ACTION_LABELS: Record<HistoryEvent["action"], string> = {
  favorited: "Favorited",
  watched: "Completed",
  watchlisted: "Saved for later",
  rated: "Rated",
};

export function buildActivityEntries(
  snapshot: Pick<LibrarySnapshot, "history" | "items">,
  limit = 6
): ActivityEntry[] {
  return [...snapshot.history]
    .reverse()
    .slice(0, limit)
    .map((e, i) => ({
      id: `${e.ts}-${i}`,
      media_id: e.id,
      media: snapshot.items[e.id],
      action_type:
        e.action === "rated" && e.value != null
          ? `Rated ${e.value}/10`
          : ACTION_LABELS[e.action],
      created_at: new Date(e.ts).toISOString(),
    }));
}

// ─── Home dashboard stats ────────────────────────────────────────────────────
export interface HomeStats {
  hoursThisWeek: number;
  titlesCompleted: number;
  streak: number;
  avgRating: number | null;
}

export function buildHomeStats(snapshot: LibrarySnapshot): HomeStats {
  const weekStart = periodStart("weekly", new Date());
  const watchedSet = new Set(snapshot.watched);
  let hoursThisWeek = 0;
  for (const e of snapshot.history) {
    if (e.action === "watched" && e.ts >= weekStart && watchedSet.has(e.id)) {
      hoursThisWeek += estimateItemHours(snapshot.items[e.id]);
    }
  }
  const ratingValues = Object.values(snapshot.ratings).filter((v) => v > 0);
  return {
    hoursThisWeek: Math.round(hoursThisWeek),
    titlesCompleted: snapshot.watched.length,
    streak: currentStreak(snapshot.history),
    avgRating:
      ratingValues.length > 0
        ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
        : null,
  };
}
