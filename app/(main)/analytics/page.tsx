"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Clock, Target, Star, Layers, Calendar, BarChart3, Compass } from "lucide-react";
import { MEDIA_TYPES, type MediaType } from "@/lib/constants";
import { useMediaStore } from "@/stores/media-store";
import { estimateItemHours } from "@/lib/library-stats";
import { CatLogo } from "@/components/shared/CatLogo";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

const chartCard =
  "rounded-xl border border-white/[0.025] p-5 bg-gradient-to-br from-[rgba(18,18,20,0.85)] to-[rgba(12,12,14,0.92)]";

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/[0.06] bg-fey-surface px-3 py-2 text-[11px] shadow-xl">
      <div className="mb-1 font-semibold text-cream">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-cream/50">{p.dataKey}:</span>
          <span className="font-bold text-cream">{p.value}</span>
        </div>
      ))}
    </div>
  );
};
/* eslint-enable @typescript-eslint/no-explicit-any */

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AnalyticsPage() {
  const favorites = useMediaStore((s) => s.favorites);
  const watched = useMediaStore((s) => s.watched);
  const watchlist = useMediaStore((s) => s.watchlist);
  const ratings = useMediaStore((s) => s.ratings);
  const items = useMediaStore((s) => s.items);
  const history = useMediaStore((s) => s.history);

  const isEmpty =
    watched.length === 0 && favorites.length === 0 && watchlist.length === 0;

  // ── Summary ──
  const summary = useMemo(() => {
    const totalHours = Math.round(
      watched.reduce((sum, id) => sum + estimateItemHours(items[id]), 0)
    );
    const ratingValues = Object.values(ratings).filter((v) => v > 0);
    const avgRating =
      ratingValues.length > 0
        ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1)
        : "—";
    const genres = new Set(
      [...watched, ...favorites].flatMap((id) => items[id]?.genres || [])
    ).size;
    return [
      { label: "Est. Total Hours", value: totalHours > 0 ? totalHours.toLocaleString() : "—", icon: Clock, color: "#c5c2bc" },
      { label: "Titles Completed", value: String(watched.length), icon: Target, color: "#8f9e90" },
      { label: "Avg Rating", value: avgRating, icon: Star, color: "#a66b6b" },
      { label: "Genres Explored", value: String(genres), icon: Layers, color: "#8aa4bc" },
    ];
  }, [watched, favorites, ratings, items]);

  // ── Hours by type per month (from watched events this year) ──
  const hoursByMonth = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    const buckets: Record<number, Record<string, number>> = {};
    const seen = new Set<string>();
    for (const e of history) {
      if (e.action !== "watched" || e.ts < yearStart || seen.has(e.id)) continue;
      seen.add(e.id);
      const item = items[e.id];
      if (!item) continue;
      const m = new Date(e.ts).getMonth();
      if (!buckets[m]) buckets[m] = {};
      buckets[m][item.media_type] =
        (buckets[m][item.media_type] || 0) + estimateItemHours(item);
    }
    const months = Object.keys(buckets).map(Number);
    if (months.length === 0) return [];
    const maxMonth = new Date().getMonth();
    return Array.from({ length: maxMonth + 1 }, (_, m) => {
      const row: Record<string, number | string> = { month: MONTH_LABELS[m] };
      for (const t of Object.keys(MEDIA_TYPES)) {
        const h = buckets[m]?.[t];
        if (h) row[t] = Math.round(h);
      }
      return row;
    });
  }, [history, items]);

  const typesInMonths = useMemo(() => {
    const set = new Set<string>();
    for (const row of hoursByMonth) {
      for (const k of Object.keys(row)) if (k !== "month") set.add(k);
    }
    return Array.from(set);
  }, [hoursByMonth]);

  // ── Library status ──
  const libraryStatus = useMemo(
    () => [
      { status: "Watchlist", count: watchlist.length, color: "#8aa4bc" },
      { status: "Completed", count: watched.length, color: "#8f9e90" },
      { status: "Favorites", count: favorites.length, color: "#a66b6b" },
      { status: "Rated", count: Object.keys(ratings).length, color: "#c5c2bc" },
    ],
    [watchlist, watched, favorites, ratings]
  );

  // ── Rating distribution ──
  const ratingDist = useMemo(() => {
    const dist = Array.from({ length: 10 }, (_, i) => ({
      rating: String(i + 1),
      count: 0,
    }));
    for (const v of Object.values(ratings)) {
      const bucket = Math.min(10, Math.max(1, Math.round(v)));
      dist[bucket - 1].count++;
    }
    return dist;
  }, [ratings]);
  const hasRatings = Object.keys(ratings).length > 0;

  // ── Genre radar (top 8 genres, normalized) ──
  const genreRadar = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of [...watched, ...favorites]) {
      for (const g of items[id]?.genres || []) {
        counts[g] = (counts[g] || 0) + (favorites.includes(id) ? 2 : 1);
      }
    }
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const max = top[0]?.[1] || 1;
    return top.map(([genre, v]) => ({
      genre,
      value: Math.round((v / max) * 100),
    }));
  }, [watched, favorites, items]);

  // ── Daily activity heatmap (last 52 weeks of history events) ──
  const heatmap = useMemo(() => {
    const dayCounts = new Map<number, number>();
    for (const e of history) {
      const day = Math.floor(e.ts / 86_400_000);
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }
    const today = Math.floor(Date.now() / 86_400_000);
    const todayDow = new Date().getDay();
    // Grid ends on the current week
    const cells: { week: number; day: number; count: number }[] = [];
    for (let w = 0; w < 52; w++) {
      for (let d = 0; d < 7; d++) {
        const daysAgo = (51 - w) * 7 + (todayDow - d);
        if (daysAgo < 0) continue;
        const day = today - daysAgo;
        cells.push({ week: w, day: d, count: dayCounts.get(day) || 0 });
      }
    }
    return cells;
  }, [history]);
  const maxHeat = Math.max(...heatmap.map((c) => c.count), 1);

  if (isEmpty) {
    return (
      <div className="animate-fadeIn flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="opacity-30">
          <CatLogo size={64} />
        </div>
        <h1 className="mt-4 text-[22px] font-black text-cream">
          Nothing to measure yet
        </h1>
        <p className="mt-2 max-w-[380px] text-[12.5px] leading-relaxed text-cream/40">
          Analytics are computed from your real library — favorites, completions,
          ratings. Start tracking and this page fills itself in.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[12px] font-bold text-fey-black transition-transform active:scale-[0.96]"
          style={{ background: "linear-gradient(135deg, #c5c2bc, #8b8882)" }}
        >
          <Compass size={13} /> Start exploring
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn pt-3.5">
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-cream">
        Analytics
      </h1>
      <p className="mb-[18px] text-[12.5px] text-cream/30">
        Computed live from your library — no demo numbers here.
      </p>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={chartCard}>
              <Icon size={15} style={{ color: s.color }} className="mb-1.5" />
              <div className="text-[9px] font-bold uppercase tracking-[1px] text-cream/25">
                {s.label}
              </div>
              <div className="text-[28px] font-black" style={{ color: s.color }}>
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Hours by Type per month */}
        {hoursByMonth.length > 0 && typesInMonths.length > 0 && (
          <div className={`${chartCard} col-span-1 lg:col-span-2`}>
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 size={14} className="text-gold" />
              <h3 className="text-[13px] font-bold text-cream">
                Hours by Type ({new Date().getFullYear()})
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={hoursByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "rgba(240,238,234,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "rgba(240,238,234,0.2)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, color: "rgba(240,238,234,0.4)" }}
                />
                {typesInMonths.map((key) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={MEDIA_TYPES[key as MediaType]?.color || "#c5c2bc"}
                    fill={MEDIA_TYPES[key as MediaType]?.color || "#c5c2bc"}
                    fillOpacity={0.3}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Library Status */}
        <div className={chartCard}>
          <div className="mb-3 flex items-center gap-2">
            <Target size={14} className="text-type-book" />
            <h3 className="text-[13px] font-bold text-cream">Library Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={libraryStatus} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "rgba(240,238,234,0.2)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="status"
                tick={{ fill: "rgba(240,238,234,0.4)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {libraryStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rating Distribution */}
        <div className={chartCard}>
          <div className="mb-3 flex items-center gap-2">
            <Star size={14} className="text-gold" />
            <h3 className="text-[13px] font-bold text-cream">Rating Distribution</h3>
          </div>
          {hasRatings ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ratingDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="rating"
                  tick={{ fill: "rgba(240,238,234,0.3)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "rgba(240,238,234,0.2)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={25}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {ratingDist.map((_, i) => (
                    <Cell key={i} fill={`rgba(197,194,188,${0.3 + (i / 10) * 0.7})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-[12px] text-cream/25">
              Rate a few titles to see your distribution.
            </div>
          )}
        </div>

        {/* Genre Radar */}
        {genreRadar.length >= 3 && (
          <div className={chartCard}>
            <div className="mb-3 flex items-center gap-2">
              <Layers size={14} className="text-type-anime" />
              <h3 className="text-[13px] font-bold text-cream">Genre Profile</h3>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={genreRadar} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis
                  dataKey="genre"
                  tick={{ fill: "rgba(240,238,234,0.4)", fontSize: 10 }}
                />
                <Radar dataKey="value" stroke="#c5c2bc" fill="#c5c2bc" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Daily Activity heatmap */}
        <div className={`${chartCard} col-span-1 lg:col-span-2`}>
          <div className="mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-gold" />
            <h3 className="text-[13px] font-bold text-cream">Daily Activity</h3>
            <span className="text-[10px] text-cream/20">last 52 weeks</span>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-px" style={{ minWidth: 580 }}>
              <div className="flex flex-col gap-px pr-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => (
                  <div key={i} className="flex h-[10px] w-3 items-center justify-end text-[7px] text-cream/20">
                    {i % 2 === 1 ? l : ""}
                  </div>
                ))}
              </div>
              {Array.from({ length: 52 }, (_, w) => (
                <div key={w} className="flex flex-col gap-px">
                  {Array.from({ length: 7 }, (_, d) => {
                    const cell = heatmap.find((c) => c.week === w && c.day === d);
                    const count = cell?.count ?? 0;
                    const intensity = count / maxHeat;
                    return (
                      <div
                        key={d}
                        className="h-[10px] w-[10px] rounded-[2px]"
                        style={{
                          background:
                            !cell || count === 0
                              ? "rgba(255,255,255,0.02)"
                              : `rgba(197,194,188,${0.15 + intensity * 0.75})`,
                        }}
                        title={`${count} action${count !== 1 ? "s" : ""}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-end gap-1 text-[9px] text-cream/20">
            <span>Less</span>
            {[0.08, 0.25, 0.5, 0.75, 0.95].map((o) => (
              <div
                key={o}
                className="h-[10px] w-[10px] rounded-[2px]"
                style={{ background: `rgba(197,194,188,${o})` }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
