"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, Check, Bookmark, Heart, Clock, ChevronDown } from "lucide-react";
import { LIBRARY_STATUSES, type LibraryStatus } from "@/lib/constants";
import type { LibraryEntry } from "@/stores/app-store";

interface ProgressUpdaterProps {
  entry?: LibraryEntry | null;
  onStatusChange?: (status: LibraryStatus) => void;
  onProgressUpdate?: (current: number) => void;
  onFavoriteToggle?: () => void;
}

export function ProgressUpdater({
  entry,
  onStatusChange,
  onProgressUpdate,
  onFavoriteToggle,
}: ProgressUpdaterProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const progress = entry?.progress_current || 0;
  const total = entry?.progress_total || 0;
  const pct = entry?.progress_percent || 0;
  const status = entry?.status || "planning";
  const isFavorite = entry?.is_favorite || false;
  const statusConfig = LIBRARY_STATUSES[status];

  return (
    <div
      className="rounded-xl border border-white/[0.04] p-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(18,18,20,0.9), rgba(12,12,14,0.95))",
      }}
    >
      {/* Status selector */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-fey-surface px-3 py-2 text-[12px] font-semibold transition-colors hover:border-gold/10"
            style={{ color: statusConfig.color }}
          >
            <span className="flex items-center gap-1.5">
              <Bookmark size={12} />
              {statusConfig.label}
            </span>
            <ChevronDown size={12} className="text-cream/30" />
          </button>

          {showStatusMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-white/[0.06] bg-fey-elevated py-1 shadow-xl"
            >
              {(Object.entries(LIBRARY_STATUSES) as [LibraryStatus, { label: string; color: string }][]).map(
                ([key, val]) => (
                  <button
                    key={key}
                    onClick={() => {
                      onStatusChange?.(key);
                      setShowStatusMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11.5px] font-medium transition-colors hover:bg-white/[0.03]"
                    style={{ color: key === status ? val.color : "rgba(240,238,234,0.5)" }}
                  >
                    {key === status && <Check size={11} />}
                    {val.label}
                  </button>
                )
              )}
            </motion.div>
          )}
        </div>

        <motion.button
          onClick={onFavoriteToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors"
          style={{
            borderColor: isFavorite ? "rgba(197,194,188,0.3)" : "rgba(255,255,255,0.06)",
            background: isFavorite ? "rgba(197,194,188,0.08)" : "transparent",
            color: isFavorite ? "#c5c2bc" : "rgba(240,238,234,0.3)",
          }}
          whileTap={{ scale: 0.9 }}
        >
          <Heart size={14} fill={isFavorite ? "#c5c2bc" : "none"} />
        </motion.button>
      </div>

      {/* Progress bar */}
      {entry && status === "in_progress" && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] text-cream/40">
              <Clock size={10} />
              Progress
            </span>
            <span className="text-[10px] font-bold text-gold">
              {progress}{total ? ` / ${total}` : ""} ({pct}%)
            </span>
          </div>
          <div className="mb-2 h-[5px] overflow-hidden rounded-full bg-white/[0.04]">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #c5c2bc, #f0eeea)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => onProgressUpdate?.(Math.max(0, progress - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.06] bg-fey-surface text-cream/40 hover:text-cream/70"
              whileTap={{ scale: 0.9 }}
            >
              <Minus size={12} />
            </motion.button>
            <span className="flex-1 text-center text-[13px] font-bold text-cream">
              {progress}
            </span>
            <motion.button
              onClick={() => onProgressUpdate?.(progress + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-gold/15 bg-gold/[0.06] text-gold hover:bg-gold/[0.1]"
              whileTap={{ scale: 0.9 }}
            >
              <Plus size={12} />
            </motion.button>
          </div>
        </div>
      )}

      {/* Add to library button if no entry */}
      {!entry && (
        <motion.button
          onClick={() => onStatusChange?.("planning")}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[12px] font-bold text-fey-black"
          style={{
            background: "linear-gradient(135deg, #c5c2bc, #8b8882)",
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={14} /> Add to Library
        </motion.button>
      )}
    </div>
  );
}
