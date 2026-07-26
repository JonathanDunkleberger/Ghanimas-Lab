"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/shared/SafeImage";
import {
  X,
  Star,
  TrendingUp,
  Heart,
  Check,
  Clock,
  User,
  Film,
  ChevronDown,
  ExternalLink,
  Play,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MEDIA_TYPES } from "@/lib/constants";
import type { MediaItem } from "@/stores/app-store";
import { useAppStore } from "@/stores/app-store";
import { useMediaStore } from "@/stores/media-store";
import { RatingSlider } from "@/components/reviews/RatingInput";
import { RabbitRoom } from "@/components/room/RabbitRoom";
import { CastCarousel } from "./CastCarousel";
import { ScoreBadges } from "./ScoreBadges";
import type { ExternalRatings } from "@/lib/api/omdb";

// ─── Helpers ────────────────────────────────────────────────────────────────
function getWatchLabel(type: string) {
  switch (type) {
    case "game":
      return "Mark as Played";
    case "book":
      return "Mark as Read";
    default:
      return "Mark as Watched";
  }
}

function getWatchedLabel(type: string) {
  switch (type) {
    case "game":
      return "Played";
    case "book":
      return "Read";
    default:
      return "Watched";
  }
}

function getWatchlistLabel(type: string) {
  switch (type) {
    case "anime":
    case "tv":
    case "film":
      return "Want to Watch";
    case "game":
      return "Want to Play";
    case "book":
      return "Want to Read";
    default:
      return "Add to Watchlist";
  }
}

/** "142" minutes → "2h 22min"; large totals → "~236h" */
function formatHours(totalMinutes: number): string {
  const h = totalMinutes / 60;
  if (h >= 20) return `~${Math.round(h)}h`;
  const rounded = Math.round(h * 10) / 10;
  return `~${rounded}h`;
}

/** 2 340 000 → "2.3M"; 45 200 → "45K" */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

/** Brand accents for outbound link pills */
const LINK_BRAND_COLORS: Record<string, string> = {
  IMDb: "#F5C518",
  "Rotten Tomatoes": "#FA320A",
  Audible: "#F8991C",
  Amazon: "#FF9900",
  Goodreads: "#D7A168",
  Steam: "#66C0F4",
  "Epic Games": "#ababab",
  GOG: "#A855F7",
  MyAnimeList: "#5D8FDB",
  TMDB: "#01B4E4",
  "Google Books": "#8AB4F8",
  "Open Library": "#E1DCC5",
};

function getRatingSource(mediaType: string): string {
  switch (mediaType) {
    case "anime":
    case "manga":
      return "MAL";
    case "game":
      return "IGDB";
    case "book":
      return "Google";
    default:
      return "TMDB";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export function MediaDetailPanel() {
  const { selectedItem, setSelectedItem } = useAppStore();
  const favorites = useMediaStore((s) => s.favorites);
  const watched = useMediaStore((s) => s.watched);
  const watchlist = useMediaStore((s) => s.watchlist);
  const ratings = useMediaStore((s) => s.ratings);
  const toggleFavorite = useMediaStore((s) => s.toggleFavorite);
  const toggleWatched = useMediaStore((s) => s.toggleWatched);
  const toggleWatchlist = useMediaStore((s) => s.toggleWatchlist);
  const removeFromWatchlist = useMediaStore((s) => s.removeFromWatchlist);
  const setRating = useMediaStore((s) => s.setRating);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [ratingMode, setRatingMode] = useState(false);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedItem(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSelectedItem]);

  // Reset local state when item changes
  useEffect(() => {
    setShowFullDescription(false);
    setRatingMode(false);
  }, [selectedItem?.id]);

  // Fetch enriched detail data — must be above the conditional return (Rules of Hooks)
  const { data: enrichedItem, isPlaceholderData: detailLoading } =
    useQuery<MediaItem>({
      queryKey: ["media-detail", selectedItem?.slug],
      queryFn: async () => {
        const res = await fetch(`/api/media/${selectedItem!.slug}`);
        if (!res.ok) return selectedItem!;
        return res.json();
      },
      enabled: !!selectedItem?.slug,
      staleTime: 24 * 60 * 60 * 1000,
      // placeholderData (NOT initialData): initialData is written to the cache
      // and treated as fresh for the full staleTime, which silently prevented
      // the enrichment fetch from ever firing — no cast, links, or playtimes.
      placeholderData: selectedItem ?? undefined,
    });

  // Cross-media strip loads independently — it fans out to four other APIs
  // and shouldn't hold the main details hostage
  const { data: exploreMore = [] } = useQuery<MediaItem[]>({
    queryKey: ["explore-more", selectedItem?.id],
    queryFn: async () => {
      const it = selectedItem!;
      const params = new URLSearchParams({
        id: it.id,
        type: it.media_type,
        title: it.title,
        genre: it.genres?.[0] || "",
      });
      const res = await fetch(`/api/explore-more?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedItem?.id,
    staleTime: 24 * 60 * 60 * 1000,
  });

  if (!selectedItem) return null;

  const item = selectedItem;
  const config = MEDIA_TYPES[item.media_type as keyof typeof MEDIA_TYPES];
  const tc = config?.color || "#999";
  const TypeIcon = config?.icon || Film;
  const favorited = favorites.includes(item.id);
  const isWatchedItem = watched.includes(item.id);
  const onWatchlist = watchlist.includes(item.id);
  const userRating = ratings[item.id] ?? 0;
  const ratingSource = getRatingSource(item.media_type);

  // Merge enriched data with selected item (enriched takes priority for extended fields)
  const display: MediaItem = {
    ...item,
    ...enrichedItem,
    // Keep the original id and media_type
    id: item.id,
    media_type: item.media_type,
  };

  const onClose = () => setSelectedItem(null);

  const descriptionLong = (display.description?.length || 0) > 250;
  const displayDescription = showFullDescription
    ? display.description
    : display.description?.slice(0, 250);

  const metaLine = (() => {
    const parts: string[] = [];
    // Content rating (PG-13, R, etc.)
    const contentRating = display.metadata?.content_rating as string | undefined;
    if (contentRating) parts.push(contentRating);
    if (display.author) parts.push(display.author);
    if (display.runtime) {
      if (display.media_type === "film") {
        const h = Math.floor(display.runtime / 60);
        const m = display.runtime % 60;
        parts.push(h > 0 ? `${h}h ${m}min` : `${display.runtime}min`);
      } else if (display.media_type === "anime" || display.media_type === "tv")
        parts.push(`${display.runtime} episodes`);
      else if (display.media_type === "book") parts.push(`${display.runtime} pages`);
    }
    if (display.status_text) parts.push(display.status_text);
    // Networks for TV
    const networks = display.metadata?.networks as string[] | undefined;
    if (networks && networks.length > 0) parts.push(networks[0]);
    return parts;
  })();

  // ── Length / time-to-consume chips ──
  const playtime = display.metadata?.playtime as
    | { hastily?: number; normally?: number; completely?: number; estimated?: boolean }
    | undefined;
  const lengthChips = (() => {
    const chips: string[] = [];
    const meta = (display.metadata || {}) as Record<string, unknown>;

    const pushBinge = (episodes: number, minutesPerEp: number) => {
      chips.push(`${episodes} episodes`);
      const totalMin = episodes * minutesPerEp;
      chips.push(`${formatHours(totalMin)} binge`);
      // For the true monsters (One Piece, Monster, ...) show it in days too
      if (totalMin >= 48 * 60) {
        chips.push(`~${Math.round(totalMin / 60 / 24)} days nonstop`);
      }
    };

    switch (display.media_type) {
      case "anime":
        if (display.runtime) {
          const epMin =
            typeof meta.episode_minutes === "number" ? meta.episode_minutes : 24;
          pushBinge(display.runtime, epMin);
        }
        break;
      case "tv":
        if (display.runtime) {
          const epMin =
            typeof meta.episode_runtime === "number" ? meta.episode_runtime : 45;
          pushBinge(display.runtime, epMin);
        }
        break;
      case "film":
        if (display.runtime) {
          const h = Math.floor(display.runtime / 60);
          const m = display.runtime % 60;
          chips.push(h > 0 ? `${h}h ${m}min` : `${display.runtime}min`);
        }
        break;
      case "book":
        if (display.runtime) {
          // ~40 pages/hour reading, ~35 pages/hour narrated audio
          const readH = Math.round((display.runtime / 40) * 10) / 10;
          const listenH = Math.round((display.runtime / 35) * 10) / 10;
          chips.push(`${display.runtime} pages`);
          chips.push(`~${readH}h to read`);
          chips.push(`~${listenH}h audiobook`);
        }
        break;
      case "manga": {
        if (display.runtime) {
          chips.push(`${display.runtime} chapters`);
          // ~8 min per chapter
          chips.push(`${formatHours(display.runtime * 8)} to read`);
        }
        const volumes = meta.volumes;
        if (typeof volumes === "number") chips.push(`${volumes} volumes`);
        break;
      }
      case "game": {
        const est = playtime?.estimated ? " (AI est.)" : "";
        if (playtime?.normally != null)
          chips.push(`~${playtime.normally}h to beat${est}`);
        else if (display.runtime) chips.push(`~${display.runtime}h to beat`);
        if (playtime?.hastily != null) chips.push(`~${playtime.hastily}h rushed`);
        if (playtime?.completely != null)
          chips.push(`~${playtime.completely}h completion`);
        break;
      }
    }
    return chips;
  })();
  const consumeTime = lengthChips[0] || null;

  const outboundLinks = (
    (display.metadata?.links as { label: string; url: string }[] | undefined) ||
    []
  ).filter((l) => l?.url && l?.label);

  // Same-type related titles (franchise, author, fan recs) — own strip
  const relatedItems = (() => {
    const seen = new Set<string>([display.id]);
    return (display.related || [])
      .filter((r) => {
        if (!r.cover_image_url || !r.id || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .slice(0, 12);
  })();

  const relatedHeading = (() => {
    switch (display.media_type) {
      case "book": {
        const first = display.author?.split(",")[0]?.trim();
        return first ? `More by ${first}` : "Related books";
      }
      case "game":
        return "Same universe & similar games";
      case "anime":
        return "Fans also watched";
      case "manga":
        return "Related manga";
      default:
        return "More like this";
    }
  })();

  // Cross-media discovery strip — never repeats the related strip
  const exploreItems = (() => {
    const consumedSet = new Set([...favorites, ...watched, ...watchlist]);
    const shownSet = new Set(relatedItems.map((r) => r.id));
    return exploreMore
      .filter((rel) => !consumedSet.has(rel.id) && !shownSet.has(rel.id))
      .slice(0, 6);
  })();

  // ── Action handlers with cross-list logic ──
  const handleFavorite = () => {
    toggleFavorite(item.id, item);
    // Favoriting = you've consumed it → auto-mark watched, remove from watchlist
    if (!favorited) {
      if (!isWatchedItem) toggleWatched(item.id, item);
      if (onWatchlist) removeFromWatchlist(item.id);
    }
  };

  const handleWatched = () => {
    toggleWatched(item.id, item);
    // Marking watched → remove from watchlist (you've consumed it)
    if (!isWatchedItem && onWatchlist) {
      removeFromWatchlist(item.id);
    }
  };

  const handleWatchlist = () => {
    toggleWatchlist(item.id, item);
  };

  return (
    <motion.div
      onClick={onClose}
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(16px)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/[0.05]"
        style={{
          maxHeight: "95vh",
          background: "#0c0c0e",
          boxShadow: "0 0 80px rgba(0,0,0,0.8)",
          scrollbarWidth: "none",
        }}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ─── 1. HERO ─────────────────────────────────────────────────── */}
        <div
          className="relative w-full overflow-hidden rounded-t-2xl"
          style={{ height: 340 }}
        >
          {(display.backdrop_image_url || display.cover_image_url) ? (
            <SafeImage
              src={display.backdrop_image_url || display.cover_image_url!}
              alt={display.title}
              fill
              className="object-cover"
              sizes="900px"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-fey-surface">
                  <TypeIcon size={56} style={{ color: tc, opacity: 0.2 }} />
                </div>
              }
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-fey-surface">
              <TypeIcon size={56} style={{ color: tc, opacity: 0.2 }} />
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(12,12,14,0.4) 40%, #0c0c0e 100%)",
            }}
          />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/70"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <X size={16} className="text-white/80" />
          </button>

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex items-center gap-[3px] rounded-[5px] px-2 py-[3px]"
                style={{
                  background: `${tc}15`,
                  border: `1px solid ${tc}22`,
                }}
              >
                <TypeIcon size={11} style={{ color: tc }} />
                <span
                  className="text-[9.5px] font-bold uppercase"
                  style={{ color: tc }}
                >
                  {config?.label || display.media_type}
                </span>
              </div>
              {display.year && (
                <span className="text-xs text-[#f0eeea]/40">{display.year}</span>
              )}
              {consumeTime && (
                <span className="text-[10.5px] text-[#f0eeea]/30">
                  {consumeTime}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black leading-tight text-[#f0eeea] mb-2">
              {display.title}
            </h1>
            {display.original_title && display.original_title !== display.title && (
              <div className="mb-2 text-[12px] italic text-[#f0eeea]/30">
                {display.original_title}
              </div>
            )}

            {/* Dual ratings */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {display.rating != null && display.rating > 0 && (
                <span className="flex items-center gap-1 text-[#f0eeea]/50">
                  <span className="text-[10px] font-semibold uppercase text-[#f0eeea]/35">
                    {ratingSource}
                  </span>
                  <Star
                    size={12}
                    className="fill-yellow-500 text-yellow-500"
                  />
                  <span className="text-[14px] font-extrabold text-[#f0eeea]/60">
                    {(display.rating / 10).toFixed(1)}
                  </span>
                </span>
              )}
              <ScoreBadges
                ratings={display.metadata?.external_ratings as ExternalRatings | undefined}
              />
              {userRating > 0 && (
                <span className="flex items-center gap-1 text-[#c5c2bc]">
                  <span className="text-[10px] font-semibold uppercase text-[#c5c2bc]/60">
                    Yours
                  </span>
                  <Star size={12} className="fill-[#c5c2bc] text-[#c5c2bc]" />
                  <span className="text-[14px] font-extrabold">
                    {userRating}
                  </span>
                </span>
              )}
              {display.match != null && display.match > 0 && (
                <span className="flex items-center gap-1 text-[12px] font-semibold text-green-400">
                  <TrendingUp size={13} /> {display.match}% Match
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── BODY ────────────────────────────────────────────────────── */}
        <div className="px-4 pb-6 pt-4">
          {/* 2. METADATA */}
          {metaLine.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#f0eeea]/45">
              <User size={12} className="text-[#f0eeea]/25" />
              {metaLine.map((part, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-[#f0eeea]/15">&middot;</span>}
                  <span className="text-[#f0eeea]/60">{part}</span>
                </span>
              ))}
            </div>
          )}

          {/* 3. GENRES */}
          {display.genres && display.genres.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-[6px]">
              {display.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-[6px] px-[10px] py-[4px] text-[11px] font-medium"
                  style={{
                    background: `${tc}0c`,
                    color: tc,
                    border: `1px solid ${tc}15`,
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* 3b. LENGTH CHIPS */}
          {lengthChips.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {lengthChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1 rounded-md border border-silver/15 bg-silver/mist px-2 py-1 text-[10.5px] font-medium text-cream/55"
                >
                  <Clock size={10} className="text-silver/70" />
                  {chip}
                </span>
              ))}
            </div>
          )}

          {/* 3c. OUTBOUND LINKS */}
          {outboundLinks.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {outboundLinks.map((link) => {
                const brand = LINK_BRAND_COLORS[link.label] || "#c5c2bc";
                return (
                  <a
                    key={`${link.label}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border bg-transparent px-2.5 py-1 text-[10.5px] font-semibold transition-colors hover:bg-silver/mist"
                    style={{ borderColor: `${brand}40`, color: brand }}
                  >
                    <ExternalLink size={10} />
                    {link.label}
                  </a>
                );
              })}
            </div>
          )}

          {/* 4. TAGLINE — italic only; taglines often carry their own quotes */}
          {typeof display.metadata?.tagline === "string" && display.metadata.tagline && (
            <p className="mb-3 text-[13px] italic text-[#f0eeea]/35">
              {display.metadata.tagline}
            </p>
          )}

          {/* 5. DESCRIPTION */}
          {display.description && (
            <div className="mb-4">
              <p className="text-[13px] leading-[1.75] text-[#f0eeea]/55">
                {displayDescription}
                {descriptionLong && !showFullDescription && "..."}
              </p>
              {descriptionLong && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-1 text-[11px] font-semibold text-[#c5c2bc]/60 hover:text-[#c5c2bc] transition-colors"
                >
                  {showFullDescription ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {/* 5. THREE ACTION BUTTONS */}
          <div className="mb-5 flex flex-wrap gap-3">
            {/* Favorite */}
            <button
              onClick={handleFavorite}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold transition-all ${
                favorited
                  ? "border border-red-500/30 bg-red-500/[0.12] text-red-400"
                  : "border border-white/[0.06] bg-white/[0.04] text-[#f0eeea]/60 hover:bg-white/[0.07]"
              }`}
            >
              <Heart
                size={16}
                className={favorited ? "fill-red-400 text-red-400" : ""}
                strokeWidth={favorited ? 0 : 1.5}
              />
              {favorited ? "Favorited" : "Favorite"}
            </button>

            {/* Watched */}
            <button
              onClick={handleWatched}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold transition-all ${
                isWatchedItem
                  ? "border border-green-500/30 bg-green-500/[0.12] text-green-400"
                  : "border border-white/[0.06] bg-white/[0.04] text-[#f0eeea]/60 hover:bg-white/[0.07]"
              }`}
            >
              <div className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${
                isWatchedItem ? "bg-green-500/20 ring-1 ring-green-500/40" : ""
              }`}>
                <Check
                  size={12}
                  className={isWatchedItem ? "text-green-400" : "text-[#f0eeea]/60"}
                  strokeWidth={2.5}
                />
              </div>
              {isWatchedItem
                ? getWatchedLabel(item.media_type)
                : getWatchLabel(item.media_type)}
            </button>

            {/* Watchlist */}
            <button
              onClick={handleWatchlist}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold transition-all ${
                onWatchlist
                  ? "border border-[#c5c2bc]/30 bg-[#c5c2bc]/[0.12] text-[#c5c2bc]"
                  : "border border-white/[0.06] bg-white/[0.04] text-[#f0eeea]/60 hover:bg-white/[0.07]"
              }`}
            >
              <Clock
                size={16}
                className={onWatchlist ? "text-[#c5c2bc]" : ""}
                strokeWidth={1.5}
              />
              {onWatchlist
                ? "On Watchlist"
                : getWatchlistLabel(item.media_type)}
            </button>
          </div>

          {/* 5b. ENRICHMENT SHIMMER — cast/links/details are still on the way */}
          {detailLoading && (
            <div className="mb-5 animate-pulse space-y-2.5">
              <div className="flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-[#c5c2bc]/40" />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#f0eeea]/25">
                  Pulling full details
                </span>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-6 w-24 rounded-md bg-white/[0.04]" />
                ))}
              </div>
              <div className="flex gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 w-16 rounded-full bg-white/[0.03]" />
                ))}
              </div>
            </div>
          )}

          {/* 6. YOUR RATING */}
          <div className="mb-5">
            <button
              onClick={() => setRatingMode(!ratingMode)}
              className="flex items-center gap-1.5 text-[12px] font-bold text-[#f0eeea]/40 hover:text-[#f0eeea]/60 transition-colors"
            >
              <Star size={14} />
              {userRating > 0
                ? `Your rating: ${userRating}/10`
                : "Rate this"}
              <ChevronDown
                size={12}
                className={`transition-transform ${ratingMode ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {ratingMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 overflow-hidden rounded-xl border border-[#c5c2bc]/10 bg-[#c5c2bc]/[0.03] p-4"
                >
                  <RatingSlider
                    value={userRating}
                    onChange={(v) => setRating(item.id, v)}
                    label="Your Rating"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 7. TAGS / THEMES */}
          {display.tags && display.tags.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#f0eeea]/30">
                Themes & Tags
              </h3>
              <div className="flex flex-wrap gap-[5px]">
                {display.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-[10px] py-[3px] text-[10.5px] font-medium text-[#f0eeea]/45 border border-white/[0.06] bg-white/[0.02]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 7b. ADDITIONAL DETAILS (metadata grid) */}
          {(() => {
            if (!display.metadata) return null;
            const meta = display.metadata as Record<string, unknown>;
            const details: { label: string; value: string }[] = [];

            // Film-specific
            if (meta.production_companies && (meta.production_companies as string[]).length > 0)
              details.push({ label: "Production", value: (meta.production_companies as string[]).slice(0, 3).join(", ") });
            if (meta.budget && typeof meta.budget === "number")
              details.push({ label: "Budget", value: `$${(meta.budget / 1_000_000).toFixed(0)}M` });
            if (meta.revenue && typeof meta.revenue === "number")
              details.push({ label: "Box Office", value: `$${(meta.revenue / 1_000_000).toFixed(0)}M` });
            if (meta.spoken_languages && (meta.spoken_languages as string[]).length > 0)
              details.push({ label: "Languages", value: (meta.spoken_languages as string[]).slice(0, 3).join(", ") });

            // Anime-specific
            if (meta.source && typeof meta.source === "string")
              details.push({ label: "Source", value: meta.source });
            if (meta.duration && typeof meta.duration === "string")
              details.push({ label: "Episode Duration", value: meta.duration });
            if (meta.season && typeof meta.season === "string")
              details.push({ label: "Premiered", value: `${meta.season.charAt(0).toUpperCase() + meta.season.slice(1)}${meta.aired_from ? ` ${new Date(meta.aired_from as string).getFullYear()}` : ""}` });
            if (meta.producers && (meta.producers as string[]).length > 0)
              details.push({ label: "Producers", value: (meta.producers as string[]).slice(0, 3).join(", ") });
            if (meta.mal_rank && typeof meta.mal_rank === "number")
              details.push({ label: "MAL Rank", value: `#${meta.mal_rank}` });
            if (meta.mal_popularity && typeof meta.mal_popularity === "number")
              details.push({ label: "MAL Popularity", value: `#${meta.mal_popularity}` });
            if (meta.mal_members && typeof meta.mal_members === "number")
              details.push({ label: "MAL Members", value: formatCount(meta.mal_members) });

            // Game-specific
            if (meta.developer && typeof meta.developer === "string" && meta.developer)
              details.push({ label: "Developer", value: meta.developer });
            if (meta.publisher && typeof meta.publisher === "string" && meta.publisher)
              details.push({ label: "Publisher", value: meta.publisher });
            if (meta.game_modes && (meta.game_modes as string[]).length > 0)
              details.push({ label: "Game Modes", value: (meta.game_modes as string[]).join(", ") });
            if (meta.aggregated_rating && typeof meta.aggregated_rating === "number")
              details.push({ label: "Critic Score", value: `${meta.aggregated_rating}/100` });
            if (meta.franchises && (meta.franchises as string[]).length > 0)
              details.push({ label: "Franchise", value: (meta.franchises as string[]).slice(0, 2).join(", ") });
            if (meta.game_engines && (meta.game_engines as string[]).length > 0)
              details.push({ label: "Engine", value: (meta.game_engines as string[]).slice(0, 2).join(", ") });
            if (meta.player_perspectives && (meta.player_perspectives as string[]).length > 0)
              details.push({ label: "Perspective", value: (meta.player_perspectives as string[]).join(", ") });

            // Book-specific
            if (display.media_type === "book" && meta.publisher && typeof meta.publisher === "string")
              details.push({ label: "Publisher", value: meta.publisher });
            if (display.media_type === "book" && meta.publishedDate && typeof meta.publishedDate === "string")
              details.push({ label: "Published", value: meta.publishedDate });
            if (display.isbn)
              details.push({ label: "ISBN", value: display.isbn });
            if (
              display.media_type === "book" &&
              typeof meta.ratingsCount === "number" &&
              meta.ratingsCount > 0
            )
              details.push({ label: "Ratings", value: formatCount(meta.ratingsCount) });

            // TV-specific
            if (meta.episode_runtime && typeof meta.episode_runtime === "number")
              details.push({ label: "Episode Runtime", value: `${meta.episode_runtime}min` });
            if (meta.first_air_date && typeof meta.first_air_date === "string") {
              const from = (meta.first_air_date as string).slice(0, 4);
              const to =
                typeof meta.last_air_date === "string"
                  ? (meta.last_air_date as string).slice(0, 4)
                  : "";
              details.push({
                label: "Aired",
                value: to && to !== from ? `${from}–${to}` : from,
              });
            }
            if (meta.season_count && typeof meta.season_count === "number")
              details.push({ label: "Seasons", value: `${meta.season_count}` });

            // Anime aired range
            if (display.media_type === "anime" && meta.aired_from && typeof meta.aired_from === "string") {
              const from = new Date(meta.aired_from as string).getFullYear();
              const to =
                typeof meta.aired_to === "string" && meta.aired_to
                  ? new Date(meta.aired_to as string).getFullYear()
                  : null;
              details.push({
                label: "Aired",
                value: to && to !== from ? `${from}–${to}` : `${from}${display.status_text === "Currently Airing" ? "–now" : ""}`,
              });
            }

            // Awards (from OMDb)
            const ext = meta.external_ratings as ExternalRatings | undefined;
            if (ext?.awards)
              details.push({ label: "Awards", value: ext.awards });
            if (ext?.imdb_votes)
              details.push({ label: "IMDb Votes", value: ext.imdb_votes });

            if (details.length === 0) return null;

            return (
              <div className="mb-5">
                <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#f0eeea]/30">
                  Details
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {details.map((d) => (
                    <div key={d.label} className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#f0eeea]/25">
                        {d.label}
                      </span>
                      <span className="text-[12px] text-[#f0eeea]/60">
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 8. CAST */}
          {display.cast && display.cast.length > 0 && display.media_type !== "book" && (
            <div className="mb-2">
              <CastCarousel
                cast={display.cast}
                title={
                  display.media_type === "anime"
                    ? "Characters & Voice Actors"
                    : "Cast"
                }
              />
            </div>
          )}

          {/* 8. WHERE TO WATCH */}
          {display.where_to_watch && display.where_to_watch.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#f0eeea]/30">
                {display.media_type === "game" ? "Platforms" : display.media_type === "book" ? "Where to Read" : "Where to Watch"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {display.where_to_watch.map((w, i) => {
                  const className =
                    "flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-[#f0eeea]/60 transition-colors hover:bg-white/[0.06]";
                  const inner = (
                    <>
                      {w.logo_url && (
                        <SafeImage
                          src={w.logo_url}
                          alt={w.provider}
                          width={20}
                          height={20}
                          className="rounded-[3px]"
                          fallback={null}
                        />
                      )}
                      {w.provider}
                      {w.url && <ExternalLink size={10} className="text-[#f0eeea]/25" />}
                    </>
                  );
                  return w.url ? (
                    <a
                      key={i}
                      href={w.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={className}
                    >
                      {inner}
                    </a>
                  ) : (
                    <span key={i} className={className}>
                      {inner}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 9. VIDEOS */}
          {display.videos && display.videos.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#f0eeea]/30">
                Videos
              </h3>
              <div
                className="scrollbar-hide"
                style={{
                  display: "flex",
                  gap: "12px",
                  overflowX: "auto",
                  overflowY: "visible",
                  scrollBehavior: "smooth",
                  paddingBottom: "8px",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                } as React.CSSProperties}
              >
                {display.videos.slice(0, 6).map((v) => (
                  <a
                    key={v.id}
                    href={`https://www.youtube.com/watch?v=${v.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/vid relative flex-shrink-0 cursor-pointer overflow-hidden rounded-lg"
                    style={{ width: 240, height: 135 }}
                  >
                    <SafeImage
                      src={v.thumbnail}
                      alt={v.title}
                      fill
                      className="object-cover"
                      sizes="240px"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover/vid:bg-black/50">
                      <Play size={32} className="text-white fill-white" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
                      <span className="line-clamp-1 text-[10px] font-medium text-white/80">
                        {v.title}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 10. SEASONS (TV/Anime only) */}
          {display.seasons && display.seasons.length > 0 && display.seasons.some(s => s.number > 0) && (
            <div className="mb-5">
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#f0eeea]/30">
                Seasons
              </h3>
              <div className="space-y-1.5">
                {display.seasons.filter(s => s.number > 0).map((s) => (
                  <div
                    key={s.number}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.03] bg-white/[0.015] px-3 py-2 text-[12px]"
                  >
                    <span className="font-semibold text-[#f0eeea]/60">{s.name || `Season ${s.number}`}</span>
                    {s.air_date && (
                      <span className="text-[#f0eeea]/25">{s.air_date.slice(0, 4)}</span>
                    )}
                    <span className="text-[#f0eeea]/30">{s.episode_count} episodes</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 11. RELATED TITLES — same medium: franchise, author, fan recs */}
          {relatedItems.length > 0 && (
            <PosterStrip
              title={relatedHeading}
              items={relatedItems}
              onSelect={setSelectedItem}
            />
          )}

          {/* 12. EXPLORE MORE — cross-media click-around */}
          {exploreItems.length > 0 && (
            <PosterStrip
              title="Explore more"
              subtitle="Across films, TV, anime, games, and books"
              items={exploreItems}
              onSelect={setSelectedItem}
            />
          )}
          <RabbitRoom media={display} />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Poster strip (Related titles / Explore more) ───────────────────────────
function PosterStrip({
  title,
  subtitle,
  items,
  onSelect,
}: {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
}) {
  return (
    <div className="mb-5">
      <h3 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-[#f0eeea]/30">
        {title}
      </h3>
      {subtitle && (
        <p className="mb-2.5 text-[11px] text-cream/25">{subtitle}</p>
      )}
      <div
        className="scrollbar-hide"
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          overflowY: "visible",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          paddingTop: "4px",
          paddingBottom: "12px",
          paddingLeft: "2px",
          paddingRight: "2px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        } as React.CSSProperties}
      >
        {items.map((rel) => {
          const relCfg =
            MEDIA_TYPES[rel.media_type as keyof typeof MEDIA_TYPES];
          const relColor = relCfg?.color || "#c5c2bc";
          return (
            <div
              key={rel.id}
              style={{
                flexShrink: 0,
                scrollSnapAlign: "start",
                width: "120px",
                overflow: "visible",
              }}
            >
              <button
                onClick={() => onSelect(rel)}
                className="group/rel relative w-full cursor-pointer text-left"
                style={{ overflow: "visible" }}
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden transition-all duration-300 ease-out group-hover/rel:scale-105 group-hover/rel:-translate-y-1 group-hover/rel:shadow-lg">
                  {rel.cover_image_url ? (
                    <SafeImage
                      src={rel.cover_image_url}
                      alt={rel.title}
                      fill
                      className="object-cover"
                      sizes="120px"
                      fallback={
                        <div className="flex h-full w-full items-center justify-center bg-fey-surface text-[10px] text-[#f0eeea]/20">
                          {rel.title}
                        </div>
                      }
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-fey-surface text-[10px] text-[#f0eeea]/20">
                      {rel.title}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                  <span
                    className="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
                    style={{
                      background: "rgba(12,12,14,0.75)",
                      color: relColor,
                      border: `1px solid ${relColor}44`,
                    }}
                  >
                    {relCfg?.label || rel.media_type}
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-white">
                      {rel.title}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
