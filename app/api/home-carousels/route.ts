import { NextRequest, NextResponse } from "next/server";
import { buildRails, type RailDef } from "@/lib/api/rails";
import type { MediaItem } from "@/stores/app-store";

// Recompute per request (with an in-memory SWR layer below) instead of
// caching the route output: a one-off upstream failure must never freeze
// a missing carousel into the response for a full hour.
export const dynamic = "force-dynamic";

interface CarouselData {
  key: string;
  title: string;
  type: string;
  items: MediaItem[];
}

type Group = "tmdb" | "igdb" | "jikan" | "openlibrary";
const GROUPS: Group[] = ["tmdb", "igdb", "jikan", "openlibrary"];

/**
 * Home rails, grouped by provider so the client can render progressively:
 * `?group=tmdb` returns just the film/TV rails in ~300ms while anime
 * (Jikan) resolves — or fails — on its own request. No group = everything,
 * interleaved (kept for the For You pool and tooling).
 *
 * A module-level stale-while-revalidate cache makes repeat loads instant:
 * fresh entries are served as-is; stale entries recompute, but a rail that
 * comes back empty (provider outage) never overwrites a cached good one.
 */
const FRESH_MS = 5 * 60 * 1000;

type CacheEntry = { rails: CarouselData[]; ts: number };
const railCache: Map<string, CacheEntry> =
  ((globalThis as Record<string, unknown>).__railCache as Map<
    string,
    CacheEntry
  >) || new Map();
(globalThis as Record<string, unknown>).__railCache = railCache;

async function fetchRail(rail: RailDef): Promise<CarouselData> {
  try {
    const items = (await rail.fetchPage(1)).filter((i) => i.cover_image_url);
    return { key: rail.key, title: rail.title, type: rail.type, items };
  } catch {
    return { key: rail.key, title: rail.title, type: rail.type, items: [] };
  }
}

async function computeGroup(group: Group): Promise<CarouselData[]> {
  const rails = buildRails().filter((r) => r.source === group);
  let results: CarouselData[] = [];

  if (group === "jikan") {
    // ~3 req/s limit — sequential with a politeness gap and a time budget
    const deadline = Date.now() + 6000;
    for (const rail of rails) {
      results.push(await fetchRail(rail));
      if (Date.now() > deadline) break;
      await new Promise((r) => setTimeout(r, 250));
    }
  } else if (group === "igdb") {
    // 4 req/s limit — waves of 3
    for (let i = 0; i < rails.length; i += 3) {
      results.push(...(await Promise.all(rails.slice(i, i + 3).map(fetchRail))));
    }
  } else {
    results = await Promise.all(rails.map(fetchRail));
  }

  // The same blockbusters top multiple subjects/filters — keep each title
  // only in the first rail of the group it appears in
  const seen = new Set<string>();
  for (const c of results) {
    c.items = c.items.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
  }

  return results.filter((c) => c.items.length > 0);
}

async function getGroup(group: Group): Promise<CarouselData[]> {
  const cached = railCache.get(group);
  if (cached && Date.now() - cached.ts < FRESH_MS) return cached.rails;

  const fresh = await computeGroup(group);

  // Merge: a rail missing from the fresh compute (outage) survives from cache
  const freshKeys = new Set(fresh.map((c) => c.key));
  const survivors = (cached?.rails || []).filter((c) => !freshKeys.has(c.key));
  const railOrder = buildRails().map((r) => r.key);
  const merged = [...fresh, ...survivors].sort(
    (a, b) => railOrder.indexOf(a.key) - railOrder.indexOf(b.key)
  );

  railCache.set(group, { rails: merged, ts: Date.now() });
  return merged;
}

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

export async function GET(request: NextRequest) {
  const group = new URL(request.url).searchParams.get("group") as Group | null;

  if (group && GROUPS.includes(group)) {
    return NextResponse.json(await getGroup(group));
  }

  const all = await Promise.all(GROUPS.map(getGroup));
  return NextResponse.json(interleave(all.flat()));
}
