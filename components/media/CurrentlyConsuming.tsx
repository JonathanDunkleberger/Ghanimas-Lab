"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Clock, Film } from "lucide-react";
import { MEDIA_TYPES } from "@/lib/constants";
import type { LibraryEntry } from "@/stores/app-store";

interface CurrentlyConsumingProps {
  entries: LibraryEntry[];
  onItemClick?: (entry: LibraryEntry) => void;
}

function CurrentCard({
  entry,
  onClick,
}: {
  entry: LibraryEntry;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const media = entry.media;
  if (!media) return null;

  const config = MEDIA_TYPES[media.media_type as keyof typeof MEDIA_TYPES];
  const tc = config?.color || "#999";
  const TypeIcon = config?.icon || Film;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="flex cursor-pointer gap-3 overflow-hidden rounded-xl p-3 transition-all duration-300"
      style={{
        background:
          "linear-gradient(135deg, rgba(18,18,20,0.9), rgba(12,12,14,0.95))",
        border: hovered
          ? `1px solid ${tc}30`
          : "1px solid rgba(255,255,255,0.035)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 12px 28px rgba(0,0,0,0.3)" : "none",
      }}
    >
      {/* Cover */}
      <div className="relative h-[92px] w-[66px] flex-shrink-0 overflow-hidden rounded-[7px]">
        {media.cover_image_url ? (
          <Image
            src={media.cover_image_url}
            alt={media.title}
            fill
            className="object-cover"
            sizes="66px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-fey-surface">
            <TypeIcon size={20} style={{ color: tc, opacity: 0.3 }} />
          </div>
        )}
        {hovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 transition-all">
            <Play size={18} fill="white" className="text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="mb-0.5 flex items-center gap-1">
            <TypeIcon size={10} style={{ color: tc }} />
            <span
              className="text-[8.5px] font-bold uppercase tracking-[1.2px]"
              style={{ color: tc }}
            >
              {media.media_type}
            </span>
          </div>
          <h4 className="mb-0.5 truncate text-[13.5px] font-bold text-cream">
            {media.title}
          </h4>
          <p className="text-[10.5px] text-cream/30">{media.author}</p>
        </div>

        {/* Progress */}
        <div>
          <div className="mb-[5px] flex items-center justify-between">
            <span className="flex items-center gap-[3px] text-[10px] text-cream/40">
              <Clock size={9} />
              {entry.progress_current}
              {entry.progress_total
                ? ` / ${entry.progress_total}`
                : ""}
            </span>
            <span
              className="text-[10px] font-bold"
              style={{ color: tc }}
            >
              {entry.progress_percent}%
            </span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-sm bg-white/[0.045]">
            <div
              className="h-full rounded-sm transition-[width] duration-1000"
              style={{
                background: `linear-gradient(90deg, ${tc}, ${tc}70)`,
                width: `${entry.progress_percent}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CurrentlyConsuming({
  entries,
  onItemClick,
}: CurrentlyConsumingProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2 pl-0.5">
        <Play size={15} className="text-gold" />
        <h2 className="text-[17px] font-bold tracking-tight text-cream">
          Currently Consuming
        </h2>
        <div
          className="ml-1.5 h-px flex-1"
          style={{
            background:
              "linear-gradient(90deg, rgba(197,194,188,0.12), transparent)",
          }}
        />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-2.5">
        {entries.map((entry) => (
          <CurrentCard
            key={entry.id}
            entry={entry}
            onClick={() => onItemClick?.(entry)}
          />
        ))}
      </div>
    </div>
  );
}
