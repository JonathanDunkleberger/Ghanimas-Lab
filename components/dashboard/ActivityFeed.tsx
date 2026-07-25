"use client";

import { Clock, Film } from "lucide-react";
import { MEDIA_TYPES } from "@/lib/constants";
import type { ActivityEntry } from "@/stores/app-store";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  activities: ActivityEntry[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.025] p-5"
        style={{ background: "linear-gradient(135deg, rgba(18,18,20,0.85), rgba(12,12,14,0.92))" }}
      >
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-cream">
          <Clock size={14} className="text-gold" /> Recent Activity
        </h3>
        <div className="py-6 text-center text-[12px] text-cream/25">
          No activity yet. Start tracking your media!
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.025] p-5"
      style={{ background: "linear-gradient(135deg, rgba(18,18,20,0.85), rgba(12,12,14,0.92))" }}
    >
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-cream">
        <Clock size={14} className="text-gold" /> Recent Activity
      </h3>
      {activities.map((a) => {
        const mediaType = a.media?.media_type;
        const config = mediaType
          ? MEDIA_TYPES[mediaType as keyof typeof MEDIA_TYPES]
          : undefined;
        const Icon = config?.icon || Film;
        const c = config?.color || "#999";

        const timeAgo = a.created_at
          ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true })
          : "";

        return (
          <div
            key={a.id}
            className="flex items-center gap-2.5 border-b border-white/[0.018] py-2 last:border-b-0"
          >
            <div
              className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-md"
              style={{
                background: `${c}0c`,
                border: `1px solid ${c}12`,
              }}
            >
              <Icon size={12} style={{ color: c }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11.5px] font-medium text-cream/90">
                {`${a.action_type} — ${a.media?.title || "Unknown"}`}
              </div>
              <div className="mt-0.5 text-[9.5px] text-cream/20">{timeAgo}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
