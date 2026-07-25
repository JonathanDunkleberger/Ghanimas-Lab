"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { BrowseEra } from "@/lib/browse-config";

interface EraTimelineProps {
  eras: BrowseEra[];
  activeIndex: number | null;
  onSelect: (index: number | null) => void;
  color: string;
}

/**
 * The lineage strip: a horizontal timeline of curated eras for the medium.
 * Clicking an era filters the grid to that year window and reveals a short
 * "how we got here" blurb — a pocket history lesson per genre.
 */
export function EraTimeline({ eras, activeIndex, onSelect, color }: EraTimelineProps) {
  return (
    <div
      className="mb-5 rounded-2xl border border-white/[0.05] px-5 pb-4 pt-5"
      style={{ background: "rgba(255,255,255,0.015)" }}
    >
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[2px] text-cream/25">
          Walk the eras
        </span>
        {activeIndex != null && (
          <button
            onClick={() => onSelect(null)}
            className="text-[10.5px] font-semibold text-cream/30 transition-colors hover:text-cream/60"
          >
            Clear era ✕
          </button>
        )}
      </div>

      {/* Timeline track */}
      <div className="relative">
        {/* The line */}
        <div
          className="absolute left-0 right-0 top-[calc(50%-22px)] h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}45 12%, ${color}45 88%, transparent)`,
          }}
        />
        <div className="scrollbar-hide flex items-start justify-between gap-1 overflow-x-auto pb-1 pt-2">
          {eras.map((era, i) => {
            const active = activeIndex === i;
            return (
              <button
                key={era.label}
                onClick={() => onSelect(active ? null : i)}
                className="group flex min-w-[110px] flex-1 flex-col items-center gap-1.5 bg-transparent px-1"
              >
                {/* Node */}
                <motion.span
                  className="relative block h-[13px] w-[13px] rounded-full border-2"
                  animate={{
                    scale: active ? 1.25 : 1,
                    borderColor: active ? color : `${color}55`,
                    backgroundColor: active ? color : "rgba(12,12,14,1)",
                    boxShadow: active ? `0 0 14px ${color}80` : "0 0 0 transparent",
                  }}
                  transition={{ duration: 0.25 }}
                />
                <span
                  className="text-[11px] font-bold leading-tight transition-colors"
                  style={{ color: active ? "#f0eeea" : "rgba(240,238,234,0.45)" }}
                >
                  {era.label}
                </span>
                <span
                  className="text-[9.5px] font-medium transition-colors"
                  style={{ color: active ? color : "rgba(240,238,234,0.22)" }}
                >
                  {era.years}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Blurb for the active era */}
      <AnimatePresence mode="wait">
        {activeIndex != null ? (
          <motion.p
            key={activeIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-2 border-t border-white/[0.04] pt-3 text-center text-[12px] leading-relaxed text-cream/50"
          >
            {eras[activeIndex].blurb}
          </motion.p>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 border-t border-white/[0.04] pt-3 text-center text-[11px] text-cream/20"
          >
            Tap an era to filter the shelves to that period — and get the one-line history.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
