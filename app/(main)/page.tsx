"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Tv, Gamepad2, BookOpen, Monitor, Film, Flame, Trophy, Sparkles, Zap, Rocket, Timer, Star, RefreshCw } from "lucide-react";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { MediaCarousel } from "@/components/media/MediaCarousel";
import { useAppStore, type MediaItem } from "@/stores/app-store";
import { useMediaStore } from "@/stores/media-store";
import { buildActivityEntries, buildHomeStats } from "@/lib/library-stats";
import type { MediaType } from "@/lib/constants";

/* Icon map per media type */
const ICON_MAP: Record<string, typeof Tv> = {
  anime: Tv,
  game: Gamepad2,
  book: BookOpen,
  tv: Monitor,
  film: Film,
};

/* Extra icons per carousel key for variety */
const CAROUSEL_ICON: Record<string, typeof Tv> = {
  "trending-movies": Flame,
  "top-rated-films": Trophy,
  "in-theaters": Film,
  "scifi-films": Rocket,
  "crime-films": Zap,
  "comedy-films": Sparkles,
  "trending-tv": Flame,
  "on-air-tv": Monitor,
  "top-rated-tv": Trophy,
  "scifi-fantasy-tv": Rocket,
  "crime-tv": Zap,
  "seasonal-anime": Sparkles,
  "airing-anime": Zap,
  "all-time-anime": Trophy,
  "action-anime": Zap,
  "fantasy-anime": Sparkles,
  "popular-games": Gamepad2,
  "new-games": Rocket,
  "top-rated-games": Trophy,
  "rpg-games": Sparkles,
  "shooter-games": Zap,
  "indie-games": Star,
  "fiction-books": BookOpen,
  "scifi-books": Rocket,
  "fantasy-books": Sparkles,
  "mystery-books": Zap,
  "romance-books": Star,
  "horror-books": Flame,
  "history-books": BookOpen,
};

interface CarouselData {
  key: string;
  title: string;
  type: string;
  items: MediaItem[];
}

export default function HomePage() {
  const { user } = useUser();
  const { setSelectedItem } = useAppStore();

  const firstName = user?.firstName || user?.username || "Explorer";

  const favorites = useMediaStore((s) => s.favorites);
  const watched = useMediaStore((s) => s.watched);
  const watchlist = useMediaStore((s) => s.watchlist);
  const ratings = useMediaStore((s) => s.ratings);
  const items = useMediaStore((s) => s.items);
  const history = useMediaStore((s) => s.history);

  const snapshot = useMemo(
    () => ({ favorites, watched, watchlist, ratings, items, history }),
    [favorites, watched, watchlist, ratings, items, history]
  );
  const homeStats = useMemo(() => buildHomeStats(snapshot), [snapshot]);
  const activities = useMemo(
    () => buildActivityEntries(snapshot, 6),
    [snapshot]
  );

  const statCards = useMemo(
    () => [
      {
        label: "Hours This Week",
        value: homeStats.hoursThisWeek > 0 ? homeStats.hoursThisWeek : "—",
        icon: Timer,
        color: "#c5c2bc",
        sub: homeStats.hoursThisWeek > 0 ? "estimated from completions" : "Mark titles as watched",
      },
      {
        label: "Titles Completed",
        value: homeStats.titlesCompleted,
        icon: Trophy,
        color: "#8f9e90",
        sub: homeStats.titlesCompleted > 0 ? "all time" : "None yet",
      },
      {
        label: "Current Streak",
        value: homeStats.streak,
        icon: Flame,
        color: "#8aa4bc",
        sub: "days in a row",
      },
      {
        label: "Avg Rating",
        value: homeStats.avgRating != null ? homeStats.avgRating.toFixed(1) : "—",
        icon: Star,
        color: "#a66b6b",
        sub: homeStats.avgRating != null ? "across all media" : "Rate something!",
      },
    ],
    [homeStats]
  );

  const { data: carousels = [], isLoading, isError, refetch } = useQuery<CarouselData[]>({
    queryKey: ["home-carousels"],
    queryFn: async () => {
      const res = await fetch("/api/home-carousels");
      if (!res.ok) throw new Error("Failed to fetch carousels");
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 min
    refetchOnWindowFocus: false,
  });

  return (
    <div className="animate-fadeIn">
      <HeroBanner
        userName={firstName}
        activeCount={watchlist.length}
      />

      {/* Carousels */}
      <div className="space-y-2">
        {isError ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.04] bg-white/[0.015] px-6 py-14 text-center">
            <p className="text-[14px] font-semibold text-cream/70">
              The lab shelves didn&apos;t load
            </p>
            <p className="mt-1 max-w-[360px] text-[12px] text-cream/35">
              Something went wrong fetching trending titles. Check your
              connection and try again.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-silver/20 px-4 py-2 text-[11.5px] font-semibold text-silver transition-colors hover:bg-silver/mist"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : isLoading ? (
          /* Skeleton loaders while data loads */
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-8">
              <div className="mb-3 h-5 w-48 animate-pulse rounded bg-white/[0.04]" />
              <div className="flex gap-4" style={{ overflow: "hidden" }}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <div
                    key={j}
                    className="aspect-[2/3] w-[172px] shrink-0 animate-pulse rounded-xl bg-white/[0.03]"
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          carousels.map((c) => (
            <MediaCarousel
              key={c.key}
              title={c.title}
              items={c.items}
              onItemClick={setSelectedItem}
              icon={CAROUSEL_ICON[c.key] || ICON_MAP[c.type] || Sparkles}
              type={c.type as MediaType}
              railKey={c.key}
            />
          ))
        )}
      </div>

      {/* Activity + Stats grid */}
      <div className="mt-0.5 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <ActivityFeed activities={activities} />
        <StatsCards stats={statCards} />
      </div>
    </div>
  );
}
