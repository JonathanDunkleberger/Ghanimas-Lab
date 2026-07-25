"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { MediaItem } from "@/stores/app-store";

export interface CarouselData {
  key: string;
  title: string;
  type: string;
  items: MediaItem[];
}

const GROUPS = ["tmdb", "igdb", "openlibrary", "jikan"] as const;

/** Cycle film → tv → anime → game → book so no medium sinks to the bottom */
function interleave(carousels: CarouselData[]): CarouselData[] {
  const buckets: Record<string, CarouselData[]> = {};
  for (const c of carousels) (buckets[c.type] ||= []).push(c);
  const cycle = ["film", "tv", "anime", "game", "book"];
  const ordered: CarouselData[] = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const t of cycle) {
      const next = buckets[t]?.shift();
      if (next) {
        ordered.push(next);
        remaining = true;
      }
    }
  }
  return ordered;
}

/**
 * Home rails fetched per provider group, in parallel, rendered
 * progressively: TMDB rows paint in a few hundred ms even when another
 * provider (looking at you, MyAnimeList) is down or slow.
 */
export function useHomeRails() {
  const results = useQueries({
    queries: GROUPS.map((g) => ({
      queryKey: ["home-rails", g],
      queryFn: async (): Promise<CarouselData[]> => {
        const res = await fetch(`/api/home-carousels?group=${g}`);
        if (!res.ok) throw new Error(`rails ${g} failed`);
        return res.json();
      },
      staleTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const carousels = useMemo(
    () => interleave(results.flatMap((r) => r.data || [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results.map((r) => r.dataUpdatedAt).join(",")]
  );

  const isLoading = results.every((r) => r.isLoading);
  const isFetchingAny = results.some((r) => r.isLoading);
  const isError = results.every((r) => r.isError);
  const refetch = () => results.forEach((r) => r.refetch());

  return { carousels, isLoading, isFetchingAny, isError, refetch };
}
