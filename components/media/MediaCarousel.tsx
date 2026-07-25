"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { MediaCard } from "./MediaCard";
import { MEDIA_TYPES, type MediaType } from "@/lib/constants";
import type { MediaItem } from "@/stores/app-store";
import type { LucideIcon } from "lucide-react";

interface MediaCarouselProps {
  title: string;
  /** Optional one-line explanation shown under the title (e.g. a rec reason) */
  subtitle?: string;
  items: MediaItem[];
  onItemClick?: (item: MediaItem) => void;
  icon?: LucideIcon;
  type?: MediaType;
  onViewAll?: () => void;
}

export function MediaCarousel({
  title,
  subtitle,
  items,
  onItemClick,
  icon: IconComp,
  type,
  onViewAll,
}: MediaCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [hovered, setHovered] = useState(false);
  const tc =
    type && MEDIA_TYPES[type] ? MEDIA_TYPES[type].color : "#c5c2bc";

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      checkScroll();
      return () => el.removeEventListener("scroll", checkScroll);
    }
  }, [checkScroll, items]);

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

  if (!items || items.length === 0) return null;

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
          {items.map((item) => (
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
        </div>
      </div>
    </section>
  );
}
