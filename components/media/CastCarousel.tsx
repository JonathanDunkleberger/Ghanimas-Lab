"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { SafeImage } from "@/components/shared/SafeImage";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { motion } from "framer-motion";

interface CastMember {
  name: string;
  character?: string;
  image_url?: string;
  role?: string;
}

interface CastCarouselProps {
  cast: CastMember[];
  title?: string;
}

export function CastCarousel({ cast, title = "Cast & Crew" }: CastCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

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
  }, [checkScroll]);

  const scroll = (dir: number) =>
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  if (!cast || cast.length === 0) return null;

  return (
    <div className="relative mb-6">
      <h3 className="mb-3 text-[14px] font-bold text-cream">{title}</h3>

      <div className="relative">
        {canLeft && (
          <button
            onClick={() => scroll(-1)}
            className="absolute -left-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-fey-black/90 border border-gold/10 text-gold"
          >
            <ChevronLeft size={14} />
          </button>
        )}
        {canRight && (
          <button
            onClick={() => scroll(1)}
            className="absolute -right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-fey-black/90 border border-gold/10 text-gold"
          >
            <ChevronRight size={14} />
          </button>
        )}

        <div
          ref={scrollRef}
          className="scrollbar-hide"
          style={{
            display: "flex",
            gap: "12px",
            overflowX: "auto",
            overflowY: "visible",
            scrollSnapType: "x mandatory",
            scrollBehavior: "smooth",
            paddingTop: "4px",
            paddingBottom: "4px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          {cast.map((member, idx) => (
            <motion.div
              key={`${member.name}-${idx}`}
              className="flex flex-col items-center"
              style={{ flex: "0 0 88px", scrollSnapAlign: "start" }}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative mb-2 h-[72px] w-[72px] overflow-hidden rounded-full border border-white/[0.04]">
                {member.image_url ? (
                  <SafeImage
                    src={member.image_url}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="72px"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center bg-fey-surface">
                        <User size={24} className="text-cream/15" />
                      </div>
                    }
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-fey-surface">
                    <User size={24} className="text-cream/15" />
                  </div>
                )}
              </div>
              <div className="w-full truncate text-center text-[10.5px] font-semibold text-cream/80">
                {member.name}
              </div>
              {member.character && (
                <div className="w-full truncate text-center text-[9px] text-cream/30">
                  {member.character}
                </div>
              )}
              {member.role && !member.character && (
                <div className="w-full truncate text-center text-[9px] text-cream/25 italic">
                  {member.role}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
