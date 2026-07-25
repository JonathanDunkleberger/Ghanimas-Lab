"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Sparkles,
  TrendingUp,
  Shuffle,
  Heart,
  Loader2,
  BookOpen,
  Film,
  Monitor,
  Tv,
  Gamepad2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MediaCarousel } from "@/components/media/MediaCarousel";
import { useAppStore, type MediaItem } from "@/stores/app-store";
import { useMediaStore } from "@/stores/media-store";
import { CatLogo } from "@/components/shared/CatLogo";
import { MEDIA_TYPES, type MediaType } from "@/lib/constants";
import { buildTasteProfile, scoreMedia, type TasteProfile } from "@/lib/recommendations/engine";

interface CarouselData {
  key: string;
  title: string;
  type: string;
  items: MediaItem[];
}

interface ScoredItem {
  item: MediaItem;
  score: number;
  reasons: string[];
}

const RAIL_ICONS: Record<string, typeof Star> = {
  film: Film,
  tv: Monitor,
  anime: Tv,
  game: Gamepad2,
  book: BookOpen,
};

export default function ForYouPage() {
  const { setSelectedItem } = useAppStore();
  const favorites = useMediaStore((s) => s.favorites);
  const watched = useMediaStore((s) => s.watched);
  const watchlist = useMediaStore((s) => s.watchlist);
  const ratings = useMediaStore((s) => s.ratings);
  const cachedItems = useMediaStore((s) => s.items);
  const history = useMediaStore((s) => s.history);
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  const hasFavorites = favorites.length > 0;

  // Fetch real carousels to power the recommendation pool
  const { data: carousels = [], isLoading } = useQuery<CarouselData[]>({
    queryKey: ["home-carousels"],
    queryFn: async () => {
      const res = await fetch("/api/home-carousels");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
  });

  // ── Real taste profile via the recommendation engine ──
  const tasteProfile: TasteProfile | null = useMemo(() => {
    const allIds = Array.from(
      new Set([...watched, ...favorites, ...watchlist, ...Object.keys(ratings)])
    );
    if (allIds.length === 0) return null;

    // Latest event per id → recency signal for the engine
    const lastTs = new Map<string, number>();
    for (const e of history) lastTs.set(e.id, e.ts);

    const library = allIds
      .filter((id) => cachedItems[id])
      .map((id) => ({
        media: {
          id,
          media_type: cachedItems[id].media_type,
          genres: cachedItems[id].genres,
          tags: (cachedItems[id].tags || []).map((t) => ({ name: t, relevance: 1 })),
        },
        status: watched.includes(id)
          ? "completed"
          : watchlist.includes(id)
            ? "planning"
            : "in_progress",
        rating: ratings[id],
        is_favorite: favorites.includes(id),
        updated_at: new Date(lastTs.get(id) || Date.now()).toISOString(),
      }));
    if (library.length === 0) return null;
    return buildTasteProfile(library);
  }, [watched, favorites, watchlist, ratings, cachedItems, history]);

  // Items the user has already consumed — filtered from recommendations
  const consumedSet = useMemo(
    () => new Set([...favorites, ...watched, ...Object.keys(ratings)]),
    [favorites, watched, ratings]
  );

  // ── Score the whole discovery pool ──
  const scoredPool: ScoredItem[] = useMemo(() => {
    const map = new Map<string, MediaItem>();
    for (const c of carousels) {
      for (const item of c.items) map.set(item.id, item);
    }
    const pool = Array.from(map.values()).filter(
      (i) => !consumedSet.has(i.id) && i.cover_image_url
    );

    if (!tasteProfile) {
      return pool.map((item) => ({ item, score: 0, reasons: [] }));
    }

    return pool
      .map((item) => {
        const { score, reasons } = scoreMedia(tasteProfile, {
          media_type: item.media_type,
          genres: item.genres,
          tags: (item.tags || []).map((t) => ({ name: t, relevance: 1 })),
        });
        return {
          item: score >= 30 ? { ...item, match: score } : item,
          score,
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [carousels, consumedSet, tasteProfile]);

  // Top picks + per-type rails, deduped: an item shown in "Picked for you"
  // never repeats in a genre rail below it.
  const { topPicks, railsByType } = useMemo(() => {
    const used = new Set<string>();
    const picks = scoredPool.slice(0, 20).map((s) => s.item);
    for (const p of picks) used.add(p.id);

    const byType: Record<string, MediaItem[]> = {};
    for (const s of scoredPool) {
      if (used.has(s.item.id)) continue;
      const t = s.item.media_type;
      if (!byType[t]) byType[t] = [];
      if (byType[t].length < 15) {
        byType[t].push(s.item);
        used.add(s.item.id);
      }
    }
    return { topPicks: picks, railsByType: byType };
  }, [scoredPool]);

  // The user's strongest genres (for rail titles)
  const topGenres = useMemo(() => {
    if (!tasteProfile) return [];
    return Object.entries(tasteProfile.genres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([g]) => g);
  }, [tasteProfile]);

  // A favorite title to name-drop in explanations
  const anchorFavorite = useMemo(() => {
    for (const id of [...favorites].reverse()) {
      if (cachedItems[id]?.title) return cachedItems[id];
    }
    return null;
  }, [favorites, cachedItems]);

  // Most recent favorite *of each type* — lets rails say "Because you played
  // The Witcher 3" instead of a generic genre line on every row.
  const anchorByType = useMemo(() => {
    const map: Record<string, MediaItem> = {};
    for (const id of [...favorites].reverse()) {
      const it = cachedItems[id];
      if (it?.title && !map[it.media_type]) map[it.media_type] = it;
    }
    return map;
  }, [favorites, cachedItems]);

  // One title + subtitle per rail, computed together so no two rails repeat
  // the same "Because you love X" genre.
  const railMeta = useMemo(() => {
    const verbs: Record<string, string> = {
      game: "played",
      book: "read",
      manga: "read",
      film: "watched",
      tv: "watched",
      anime: "watched",
    };
    const typeNouns: Record<string, string> = {
      game: "games",
      film: "films",
      tv: "series",
      anime: "anime",
      book: "books",
      manga: "manga",
    };
    const fallbacks: Record<string, string> = {
      film: "Films worth your evening",
      tv: "Series to sink into",
      anime: "Anime picked for you",
      game: "Games for your backlog",
    };

    const usedGenres = new Set<string>();
    const meta: Record<string, { title: string; subtitle?: string }> = {};

    for (const type of ["anime", "game", "film", "tv"]) {
      const rail = railsByType[type] || [];
      if (rail.length === 0) continue;

      const anchor = anchorByType[type];
      // A genre that actually characterizes this rail, not yet used by another
      const genreForType = topGenres.find(
        (g) =>
          !usedGenres.has(g) &&
          rail.filter((i) => i.genres?.includes(g)).length >= 3
      );

      if (anchor) {
        meta[type] = {
          title: `Because you ${verbs[type]} ${anchor.title}`,
          subtitle: genreForType
            ? `${typeNouns[type].charAt(0).toUpperCase() + typeNouns[type].slice(1)} carrying the same ${genreForType} current.`
            : `Scored against your taste profile.`,
        };
      } else if (genreForType) {
        usedGenres.add(genreForType);
        meta[type] = {
          title: `Because you love ${genreForType}`,
          subtitle: anchorFavorite
            ? `You favorited ${anchorFavorite.title} — these ${typeNouns[type]} share its ${genreForType} DNA.`
            : undefined,
        };
      } else {
        meta[type] = { title: fallbacks[type] || `Recommended ${type}` };
      }
    }
    return meta;
  }, [railsByType, anchorByType, topGenres, anchorFavorite]);

  // ── Blended "Surprise Mix" ──
  const blendedMix = useMemo(() => {
    if (scoredPool.length === 0) return [];
    return [...scoredPool]
      .sort(() => Math.random() - 0.5)
      .slice(0, 20)
      .map((s) => s.item);
  }, [scoredPool]);

  const handleSurpriseMe = useCallback(() => {
    if (scoredPool.length === 0) return;
    setSurpriseLoading(true);
    // Weight the dice toward taste-matched items, but keep true randomness
    const pool = scoredPool.slice(0, Math.max(30, Math.floor(scoredPool.length / 2)));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setTimeout(() => {
      if (pick) setSelectedItem(pick.item);
      setSurpriseLoading(false);
    }, 600);
  }, [scoredPool, setSelectedItem]);

  // ── Taste Profile display data ──
  const tasteDisplay = useMemo(() => {
    const favItems = favorites
      .map((id) => cachedItems[id])
      .filter(Boolean) as MediaItem[];
    if (favItems.length === 0) return null;

    const typeCounts: Record<string, number> = {};
    for (const item of favItems) {
      typeCounts[item.media_type] = (typeCounts[item.media_type] || 0) + 1;
    }
    const total = favItems.length;
    const typeBreakdown = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    const ratedItems = Object.values(ratings);
    const avgRating =
      ratedItems.length > 0
        ? (ratedItems.reduce((a, b) => a + b, 0) / ratedItems.length).toFixed(1)
        : "—";

    return {
      typeBreakdown,
      topGenres,
      avgRating,
      totalFavorites: favorites.length,
      totalWatched: watched.length,
    };
  }, [favorites, watched, cachedItems, ratings, topGenres]);

  const bookRail = railsByType["book"] || [];

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles size={20} className="text-gold" />
          <h1 className="text-2xl font-extrabold tracking-tight text-cream">
            For You
          </h1>
        </div>
        <p className="text-[12.5px] text-cream/30">
          {hasFavorites
            ? "Scored against your actual taste — every medium competes for your attention."
            : "Personalized recommendations that evolve with your taste."}
        </p>
      </div>

      <div className="space-y-6">
        {/* Empty state when no favorites */}
        {!hasFavorites && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-gold/[0.08] p-8 text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(18,18,20,0.9), rgba(12,12,14,0.95))",
            }}
          >
            <CatLogo size={64} className="mx-auto mb-3 opacity-30" />
            <h3 className="mb-1 text-[15px] font-bold text-cream">
              Add Favorites to Get Started
            </h3>
            <p className="mb-3 text-[11px] text-cream/30">
              Heart titles you love and the lab starts connecting films to
              books, anime to games — taste travels across mediums.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-gold/10 bg-gold/[0.05] px-4 py-2 text-[11px] font-semibold text-gold">
              <Heart size={13} /> Browse the Home page to start
            </div>
          </motion.div>
        )}

        {/* Surprise Me */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-gold/[0.08] p-6 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(18,18,20,0.9), rgba(12,12,14,0.95))",
          }}
        >
          <Sparkles size={24} className="mx-auto mb-2 text-gold" />
          <h3 className="mb-1 text-[15px] font-bold text-cream">
            What Should I Try Next?
          </h3>
          <p className="mb-4 text-[11px] text-cream/30">
            One roll of the dice, weighted toward your taste.
          </p>
          <motion.button
            onClick={handleSurpriseMe}
            disabled={surpriseLoading || scoredPool.length === 0}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-[12px] font-bold text-fey-black disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #c5c2bc, #8b8882)",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {surpriseLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Shuffle size={14} />
            )}
            {surpriseLoading ? "Finding..." : "Surprise Me"}
          </motion.button>
        </motion.div>

        {/* Loading skeleton for rails */}
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="mb-3 h-5 w-56 animate-pulse rounded bg-white/[0.04]" />
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div
                    key={j}
                    className="aspect-[2/3] w-[172px] shrink-0 animate-pulse rounded-xl bg-white/[0.03]"
                  />
                ))}
              </div>
            </div>
          ))}

        {/* Top picks across all mediums */}
        {hasFavorites && topPicks.length > 0 && (
          <MediaCarousel
            title="Picked for you"
            subtitle="Your highest matches across film, TV, anime, games, and books."
            items={topPicks}
            onItemClick={setSelectedItem}
            icon={Star}
          />
        )}

        {/* From screen to page — the books bridge */}
        {bookRail.length > 0 && (
          <MediaCarousel
            title="From screen to page"
            subtitle={
              topGenres.length > 0
                ? `You love ${topGenres[0]} on screen — these books scratch the same itch, and most are an Audible click away.`
                : "Books that pair with what you already watch and play — most are an Audible click away."
            }
            items={bookRail}
            onItemClick={setSelectedItem}
            icon={BookOpen}
            type="book"
          />
        )}

        {/* Per-type rails */}
        {(["anime", "game", "film", "tv"] as const).map((t) =>
          railsByType[t] && railsByType[t].length > 0 && railMeta[t] ? (
            <MediaCarousel
              key={t}
              title={railMeta[t].title}
              subtitle={railMeta[t].subtitle}
              items={railsByType[t]}
              onItemClick={setSelectedItem}
              icon={RAIL_ICONS[t] || TrendingUp}
              type={t as MediaType}
            />
          ) : null
        )}

        {/* Blended Surprise Mix */}
        {blendedMix.length > 0 && (
          <MediaCarousel
            title="Your Surprise Mix"
            subtitle="No algorithm, just the shuffle — for when you want serendipity."
            items={blendedMix}
            onItemClick={setSelectedItem}
            icon={Shuffle}
          />
        )}

        {/* ── Taste Profile ── */}
        {tasteDisplay && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-6 rounded-2xl border border-white/[0.04]"
            style={{ background: "rgba(255,255,255,0.015)" }}
          >
            <h3 className="text-lg font-bold text-cream mb-4">Your Taste Profile</h3>

            {/* Type breakdown — horizontal bars */}
            <div className="space-y-3 mb-6">
              {tasteDisplay.typeBreakdown.map(({ type, count, percent }) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs w-16 capitalize text-cream/40">{type}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      style={{
                        backgroundColor:
                          MEDIA_TYPES[type as MediaType]?.color || "#c5c2bc",
                      }}
                    />
                  </div>
                  <span className="text-xs text-cream/30 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>

            {/* Top genres */}
            {tasteDisplay.topGenres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {tasteDisplay.topGenres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 text-xs rounded-full border"
                    style={{
                      background: "rgba(197,194,188,0.06)",
                      color: "rgba(197,194,188,0.7)",
                      borderColor: "rgba(197,194,188,0.1)",
                    }}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-2xl font-black text-gold">{tasteDisplay.totalFavorites}</p>
                <p className="text-xs text-cream/30">Favorites</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-2xl font-black" style={{ color: "#8f9e90" }}>{tasteDisplay.totalWatched}</p>
                <p className="text-xs text-cream/30">Consumed</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-2xl font-black text-cream">{tasteDisplay.avgRating}</p>
                <p className="text-xs text-cream/30">Avg Rating</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
