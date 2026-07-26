"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { SafeImage } from "@/components/shared/SafeImage";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  type?: string;
}

interface VideoCarouselProps {
  videos: Video[];
  title?: string;
}

export function VideoCarousel({ videos, title = "Videos" }: VideoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

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
    scrollRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  if (!videos || videos.length === 0) return null;

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
            paddingBottom: "8px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          {videos.map((video) => (
            <motion.div
              key={video.id}
              className="relative cursor-pointer overflow-hidden rounded-xl"
              style={{
                flex: "0 0 280px",
                scrollSnapAlign: "start",
                height: 158,
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveVideo(video)}
            >
              <SafeImage
                src={video.thumbnail}
                alt={video.title}
                fill
                className="object-cover"
                sizes="280px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-fey-black/80 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/90 text-fey-black shadow-lg">
                  <Play size={16} fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-2 left-3 right-3">
                <div className="truncate text-[11px] font-semibold text-cream">
                  {video.title}
                </div>
                {video.type && (
                  <div className="text-[9px] text-cream/30 uppercase tracking-wider mt-0.5">
                    {video.type}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Video modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveVideo(null)}
          >
            <motion.div
              className="relative w-[90%] max-w-3xl aspect-video rounded-2xl overflow-hidden bg-fey-black"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
