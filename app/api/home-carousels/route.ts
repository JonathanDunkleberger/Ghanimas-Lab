import { NextResponse } from "next/server";
import { buildRails, type RailDef } from "@/lib/api/rails";
import type { MediaItem } from "@/stores/app-store";

// Recompute on every request instead of caching the route output: each
// upstream fetch has its own data-cache window, so this stays fast — but a
// one-off upstream failure (rate limit, quota) no longer freezes a missing
// carousel into the response for a full hour.
export const dynamic = "force-dynamic";

interface CarouselData {
  key: string;
  title: string;
  type: string;
  items: MediaItem[];
}

/**
 * Page 1 of every rail in the registry. Jikan rails run sequentially
 * (hard ~3 req/s rate limit); everything else fans out in parallel.
 * Deeper pages stream through /api/rail/[key] as the user scrolls.
 */
export async function GET() {
  const rails = buildRails();
  const jikanRails = rails.filter((r) => r.source === "jikan");
  const igdbRails = rails.filter((r) => r.source === "igdb");
  const parallelRails = rails.filter(
    (r) => r.source !== "jikan" && r.source !== "igdb"
  );

  const fetchRail = async (rail: RailDef): Promise<CarouselData> => {
    try {
      const items = (await rail.fetchPage(1)).filter((i) => i.cover_image_url);
      return { key: rail.key, title: rail.title, type: rail.type, items };
    } catch {
      return { key: rail.key, title: rail.title, type: rail.type, items: [] };
    }
  };

  // Jikan allows ~3 req/s — strictly sequential, with a politeness gap.
  // When MAL is having a bad day (504s), each rail burns retry time, so the
  // whole task gets a budget: past 8s we ship whatever we have and the
  // missing rails come back on the next request (route is force-dynamic).
  const jikanTask = (async () => {
    const out: CarouselData[] = [];
    const deadline = Date.now() + 8000;
    for (const rail of jikanRails) {
      out.push(await fetchRail(rail));
      if (Date.now() > deadline) break;
      await new Promise((r) => setTimeout(r, 350));
    }
    return out;
  })();

  // IGDB allows 4 req/s — run in waves of 3
  const igdbTask = (async () => {
    const out: CarouselData[] = [];
    for (let i = 0; i < igdbRails.length; i += 3) {
      out.push(...(await Promise.all(igdbRails.slice(i, i + 3).map(fetchRail))));
    }
    return out;
  })();

  const [parallelResults, jikanResults, igdbResults] = await Promise.all([
    Promise.all(parallelRails.map(fetchRail)),
    jikanTask,
    igdbTask,
  ]);

  const byKey = new Map<string, CarouselData>();
  for (const c of [...parallelResults, ...jikanResults, ...igdbResults]) {
    byKey.set(c.key, c);
  }

  // The same blockbusters (Harry Potter…) top multiple Open Library subjects —
  // keep each book only in the first row it appears in. Same for anime, where
  // top-airing and seasonal overlap heavily.
  for (const type of ["book", "anime"]) {
    const seen = new Set<string>();
    for (const rail of rails) {
      if (rail.type !== type) continue;
      const c = byKey.get(rail.key);
      if (!c) continue;
      c.items = c.items.filter((i) => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
    }
  }

  // Interleave mediums so no format lives in the basement: cycle
  // film → tv → anime → game → book until every rail is placed.
  const buckets: Record<string, CarouselData[]> = {};
  for (const rail of rails) {
    const c = byKey.get(rail.key);
    if (!c || c.items.length === 0) continue;
    (buckets[rail.type] ||= []).push(c);
  }
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

  return NextResponse.json(ordered);
}
