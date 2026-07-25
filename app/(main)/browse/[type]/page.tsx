"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { notFound } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Loader2, X } from "lucide-react";
import { MediaCard } from "@/components/media/MediaCard";
import { EraTimeline } from "@/components/browse/EraTimeline";
import { useAppStore, type MediaItem } from "@/stores/app-store";
import { MEDIA_TYPES, type MediaType } from "@/lib/constants";
import {
  BROWSE_CONFIG,
  SORT_OPTIONS,
  type BrowseType,
  type SortKey,
} from "@/lib/browse-config";

interface BrowsePage {
  items: MediaItem[];
  hasMore: boolean;
}

export default function BrowseSectionPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = use(params);
  const config = BROWSE_CONFIG[type as BrowseType];
  const typeConfig = MEDIA_TYPES[type as MediaType];
  if (!config || !typeConfig) notFound();

  const { setSelectedItem } = useAppStore();
  const color = typeConfig.color;
  const TypeIcon = typeConfig.icon;

  // ── Filters ──
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("popular");
  const [era, setEra] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  // Debounced free-text genre/theme search; typing clears the pill
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      if (searchInput.trim()) setCategory(null);
    }, 450);
    return () => clearTimeout(t);
  }, [searchInput]);

  const pickCategory = (value: string) => {
    setCategory((prev) => (prev === value ? null : value));
    setSearchInput("");
    setQ("");
  };

  // ── Data ──
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery<BrowsePage>({
      queryKey: ["browse", type, category, q, sort, era],
      queryFn: async ({ pageParam }) => {
        const sp = new URLSearchParams({
          type,
          sort,
          page: String(pageParam),
        });
        if (category) sp.set("category", category);
        if (q) sp.set("q", q);
        if (era != null) sp.set("era", String(era));
        const res = await fetch(`/api/browse?${sp}`);
        if (!res.ok) return { items: [], hasMore: false };
        return res.json();
      },
      initialPageParam: 1,
      getNextPageParam: (last, pages) =>
        last.hasMore ? pages.length + 1 : undefined,
      staleTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    });

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: MediaItem[] = [];
    for (const page of data?.pages || []) {
      for (const it of page.items) {
        if (seen.has(it.id)) continue;
        seen.add(it.id);
        out.push(it);
      }
    }
    return out;
  }, [data]);

  // ── Infinite scroll sentinel ──
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "900px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const activeLabel =
    q ||
    config.categories.find((c) => c.value === category)?.label ||
    null;

  return (
    <div className="animate-fadeIn">
      {/* ── Header ── */}
      <div className="mb-5">
        <div className="mb-1 flex items-center gap-2.5">
          <TypeIcon size={22} style={{ color }} />
          <h1 className="text-2xl font-extrabold tracking-tight text-cream">
            {config.title}
          </h1>
        </div>
        <p className="max-w-[640px] text-[12.5px] text-cream/30">{config.tagline}</p>
      </div>

      {/* ── Free-text theme search ── */}
      <div className="relative mb-4 max-w-[560px]">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/25"
        />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={config.searchHint}
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-10 pr-9 text-[12.5px] text-cream placeholder:text-cream/20 focus:border-white/[0.14] focus:outline-none"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/30 hover:text-cream/60"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Category pills ── */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {config.categories.map((c) => {
          const active = category === c.value;
          return (
            <button
              key={c.value}
              onClick={() => pickCategory(c.value)}
              className="rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-all"
              style={{
                background: active ? `${color}22` : "rgba(255,255,255,0.025)",
                color: active ? color : "rgba(240,238,234,0.45)",
                border: `1px solid ${active ? `${color}55` : "rgba(255,255,255,0.05)"}`,
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* ── Era timeline ── */}
      <EraTimeline eras={config.eras} activeIndex={era} onSelect={setEra} color={color} />

      {/* ── Sort + result context ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-white/[0.05] bg-white/[0.015] p-1">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className="rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                background: sort === s.key ? "rgba(197,194,188,0.12)" : "transparent",
                color: sort === s.key ? "#f0eeea" : "rgba(240,238,234,0.35)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-cream/25">
          {activeLabel ? (
            <>
              <span style={{ color }}>{activeLabel}</span>
              {era != null && <> · {config.eras[era].label}</>}
              {" · "}
              {items.length} title{items.length === 1 ? "" : "s"} loaded
            </>
          ) : (
            <>{items.length} titles loaded — keep scrolling</>
          )}
        </p>
      </div>

      {/* ── The grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-10">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-xl bg-white/[0.03]"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-white/[0.04] bg-white/[0.015] px-6 py-16 text-center">
          <p className="text-[14px] font-semibold text-cream/60">
            Nothing on this shelf yet
          </p>
          <p className="mt-1 max-w-[380px] text-[11.5px] text-cream/30">
            Try another era, a different sort, or a broader search — the archive
            is deep but not every combination has been catalogued.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-10"
        >
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </motion.div>
      )}

      {/* ── Infinite scroll sentinel ── */}
      <div ref={sentinelRef} className="flex h-16 items-center justify-center">
        {isFetchingNextPage && (
          <Loader2 size={20} className="animate-spin text-cream/25" />
        )}
        {!hasNextPage && items.length > 0 && (
          <p className="text-[11px] text-cream/20">
            You&apos;ve reached the bottom of this shelf.
          </p>
        )}
      </div>
    </div>
  );
}
