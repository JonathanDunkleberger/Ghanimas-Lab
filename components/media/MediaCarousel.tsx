"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Loader2 } from "lucide-react";
import { MediaCard } from "./MediaCard";
import { MEDIA_TYPES, type MediaType } from "@/lib/constants";
import type { MediaItem } from "@/stores/app-store";
import type { LucideIcon } from "lucide-react";

const MAX_RAIL_PAGES = 15; // "seemingly endless", not actually infinite

interface MediaCarouselProps {
  title: string;
  /** Optional one-line explanation shown under the title (e.g. a rec reason) */
  subtitle?: string;
  items: MediaItem[];
  onItemClick?: (item: MediaItem) => void;
  icon?: LucideIcon;
  type?: MediaType;
  onViewAll?: () => void;
  /**
   * When set, scrolling near the end of the row pulls the next page from
   * /api/rail/[railKey] and appends it (deduped) — near-endless carousels.
   */
  railKey?: string;
  /** Ids never to append from deeper pages (e.g. already watched/favorited) */
  excludeIds?: string[];
}

export function MediaCarousel({
  title,
  subtitle,
  items,
  onItemClick,
  icon: IconComp,
  type,
  onViewAll,
  railKey,
  excludeIds,
}: MediaCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [extraItems, setExtraItems] = useState<MediaItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const tc =
    type && MEDIA_TYPES[type] ? MEDIA_TYPES[type].color : "#c5c2bc";

  // Mutable fetch state — keeps the scroll handler stable across renders
  const railState = useRef({ page: 1, ended: false, inFlight: false });

  const allItems = useMemo(() => {
    const seen = new Set<string>();
    const out: MediaItem[] = [];
    for (const it of [...items, ...extraItems]) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(it);
    }
    return out;
  }, [items, extraItems]);

  const allIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    allIdsRef.current = new Set(allItems.map((i) => i.id));
  }, [allItems]);
  const excludeRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    excludeRef.current = new Set(excludeIds || []);
  }, [excludeIds]);

  const maybeLoadMore = useCallback(() => {
    const st = railState.current;
    if (!railKey || st.ended || st.inFlight) return;
    const el = scrollRef.current;
    if (!el) return;
    // Trigger when within ~2.5 viewports of the end
    if (el.scrollLeft < el.scrollWidth - el.clientWidth * 3.5) return;

    st.inFlight = true;
    setLoadingMore(true);
    const next = st.page + 1;
    fetch(`/api/rail/${railKey}?page=${next}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then(({ items: fresh }: { items: MediaItem[] }) => {
        st.page = next;
        const add = (fresh || []).filter(
          (i) => !allIdsRef.current.has(i.id) && !excludeRef.current.has(i.id)
        );
        if (add.length > 0) setExtraItems((prev) => [...prev, ...add]);
        if (!fresh || fresh.length === 0 || next >= MAX_RAIL_PAGES) {
          st.ended = true;
        } else if (add.length < 5) {
          // Page was mostly duplicates — quietly reach for the next one so
          // the user never scrolls into a wall
          st.inFlight = false;
          setTimeout(maybeLoadMore, 50);
          return;
        }
      })
      .catch(() => {
        st.ended = true;
      })
      .finally(() => {
        st.inFlight = false;
        setLoadingMore(false);
      });
  }, [railKey]);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    maybeLoadMore();
  }, [maybeLoadMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      checkScroll();
      return () => el.removeEventListener("scroll", checkScroll);
    }
  }, [checkScroll, allItems]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 188; // card width (172) + gap (16)
    const scrollAmount = cardWidth * 5;
    el.scrollBy({
      left: dir === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!allItems || allItems.length === 0) return null;

  return (
    <section
      className="relative mb-8 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2 pl-0.5">
        {IconComp && <IconComp size={17} style={{ color: tc }} />}
        <h2 className="text-[17px] font-bold tracking-tight text-cream">
          {title}
        </h2>
        <div
          className="ml-1.5 h-px flex-1"
          style={{
            background: `linear-gradient(90deg, ${tc}20, transparent)`,
          }}
        />
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-[3px] bg-transparent text-[11px] font-medium text-cream/30 transition-colors hover:text-cream/50"
          >
            View all <ArrowRight size={12} />
          </button>
        )}
      </div>
      {subtitle && (
        <p className="-mt-2 mb-2.5 pl-0.5 text-[11px] text-cream/25">
          {subtitle}
        </p>
      )}

      {/* Carousel */}
      <div className="relative">
        {/* Left arrow — gradient edge */}
        {canLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-0 bottom-0 z-20 w-12 flex items-center justify-center bg-gradient-to-r from-[#0c0c0e] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <ChevronLeft size={28} className="text-white/80" />
          </button>
        )}

        {/* Right arrow — gradient edge */}
        {canRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-0 bottom-0 z-20 w-12 flex items-center justify-center bg-gradient-to-l from-[#0c0c0e] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <ChevronRight size={28} className="text-white/80" />
          </button>
        )}

        {/* Scrollable track — inline styles guarantee scroll works */}
        <div
          ref={scrollRef}
          className="scrollbar-hide"
          style={{
            display: "flex",
            gap: "16px",
            overflowX: "auto",
            overflowY: "visible",
            scrollBehavior: "smooth",
            scrollSnapType: "x mandatory",
            paddingTop: "8px",
            paddingBottom: "16px",
            paddingLeft: "4px",
            paddingRight: "4px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          {allItems.map((item) => (
            <div
              key={item.id}
              style={{
                flexShrink: 0,
                scrollSnapAlign: "start",
                width: "172px",
                overflow: "visible",
              }}
            >
              <MediaCard
                item={item}
                onClick={() => onItemClick?.(item)}
              />
            </div>
          ))}
          {loadingMore && (
            <div
              style={{ flexShrink: 0, width: "172px" }}
              className="flex aspect-[2/3] items-center justify-center rounded-xl bg-white/[0.02]"
            >
              <Loader2 size={20} className="animate-spin text-cream/25" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
