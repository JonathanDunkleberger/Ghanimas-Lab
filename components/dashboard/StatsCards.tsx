"use client";

import { Timer, Trophy, Flame, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatCardData {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  sub: string;
}

interface StatsCardsProps {
  stats?: StatCardData[];
}

const DEFAULT_STATS: StatCardData[] = [
  {
    label: "Hours This Week",
    value: "—",
    icon: Timer,
    color: "#c5c2bc",
    sub: "Start tracking!",
  },
  {
    label: "Titles Completed",
    value: "0",
    icon: Trophy,
    color: "#a0c4a8",
    sub: "None yet",
  },
  {
    label: "Current Streak",
    value: "0",
    icon: Flame,
    color: "#7b9ec9",
    sub: "days in a row",
  },
  {
    label: "Avg Rating",
    value: "—",
    icon: Star,
    color: "#c97b9e",
    sub: "across all media",
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  const data = stats || DEFAULT_STATS;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {data.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="flex flex-col justify-center rounded-xl border border-white/[0.025] p-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(18,18,20,0.85), rgba(12,12,14,0.92))",
            }}
          >
            <Icon
              size={15}
              style={{ color: s.color }}
              className="mb-2"
            />
            <div className="mb-[5px] text-[8.5px] font-bold uppercase tracking-[1px] text-cream/25">
              {s.label}
            </div>
            <div
              className="text-[28px] font-black leading-none"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
            <div className="mt-[5px] text-[9.5px] text-cream/20">
              {s.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}
