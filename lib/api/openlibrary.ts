/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MediaItem } from "@/stores/app-store";
import { browseBooks } from "@/lib/api/books";
import { normalizeBook } from "@/lib/api/normalize";

const OL_BASE = "https://openlibrary.org";
const OL_FIELDS =
  "key,title,author_name,first_publish_year,cover_i,ratings_average,ratings_count,subject";

/**
 * Browse a subject on Open Library, sorted by "readinglog" (how many people
 * have logged the book) — this surfaces genuinely popular, recognizable
 * titles, unlike Google Books' subject browse which returns near-random
 * catalog entries. No API key, no meaningful rate limits.
 */
export async function browseOpenLibrary(
  subject: string,
  limit: number = 40,
  page: number = 1
) {
  const params = new URLSearchParams({
    q: `subject:"${subject}"`,
    sort: "readinglog",
    limit: String(limit),
    page: String(page),
    fields: OL_FIELDS,
    lang: "en",
  });
  const res = await fetch(`${OL_BASE}/search.json?${params}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    console.error(`Open Library browse failed (${res.status})`);
    return [];
  }
  const data = await res.json();
  return data.docs || [];
}

/**
 * Advanced browse for the Books library section: subject or free-text
 * query, optional first-publish-year window (era timelines), and sort.
 */
export async function browseOpenLibraryAdvanced(opts: {
  subject?: string;
  q?: string;
  yearFrom?: number;
  yearTo?: number;
  sort: "readinglog" | "rating" | "new" | "old";
  page: number;
  limit: number;
}) {
  const parts: string[] = [];
  if (opts.subject) parts.push(`subject:"${opts.subject}"`);
  if (opts.q) parts.push(opts.q);
  if (opts.yearFrom || opts.yearTo) {
    parts.push(
      `first_publish_year:[${opts.yearFrom || 0} TO ${opts.yearTo || 3000}]`
    );
  }
  if (parts.length === 0) parts.push("fiction");

  const params = new URLSearchParams({
    q: parts.join(" AND "),
    limit: String(opts.limit),
    page: String(opts.page),
    fields: OL_FIELDS,
    lang: "en",
  });
  // With a free-text query, OL's sort param reorders ALL full-text matches by
  // that metric — "dune" sorted by readinglog returns Jane Eyre before Herbert.
  // Relevance ranking (no sort) respects the query; explicit sorts still apply.
  if (!(opts.q && opts.sort === "readinglog")) {
    params.set("sort", opts.sort);
  }
  const res = await fetch(`${OL_BASE}/search.json?${params}`, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error(`Open Library advanced browse failed (${res.status})`);
    return [];
  }
  const data = await res.json();
  return data.docs || [];
}

/** Relevance search on Open Library — fallback when Google Books is down/over quota */
export async function searchOpenLibrary(query: string, limit: number = 20) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    fields: OL_FIELDS,
    lang: "en",
  });
  const res = await fetch(`${OL_BASE}/search.json?${params}`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    console.error(`Open Library search failed (${res.status})`);
    return [];
  }
  const data = await res.json();
  return data.docs || [];
}

/**
 * OL subjects mix real genres with catalog noise ("series:Harry_Potter",
 * "nyt:series=…", "Reading Level-Grade 7"). Keep the human-readable ones.
 */
const RECOGNIZABLE_GENRE =
  /fantasy|science fiction|fiction|romance|thriller|horror|mystery|adventure|historical|classic|dystopia|magic|coming of age|young adult|humor|comedy|crime|war|poetry|biography|memoir|philosophy|drama|epic|suspense|fairy tale|myth|space|time travel/i;

export function cleanSubjects(subjects: any, limit: number): string[] {
  const cleaned = ((subjects || []) as string[])
    .filter(
      (s) =>
        typeof s === "string" &&
        s.length > 2 &&
        s.length <= 28 &&
        !s.includes(":") &&
        !s.includes("=") &&
        !s.includes("_") &&
        !/reading level|accessible book|protected daisy|large type|translations|in literature/i.test(s)
    )
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .filter((s, i, arr) => arr.indexOf(s) === i);
  // Recognizable genres ("Fantasy") beat catalog oddities ("Mechanical Hound")
  return cleaned
    .sort(
      (a, b) =>
        (RECOGNIZABLE_GENRE.test(b) ? 1 : 0) - (RECOGNIZABLE_GENRE.test(a) ? 1 : 0)
    )
    .slice(0, limit);
}

/** Normalize an Open Library search doc → MediaItem (slug prefix: olw-) */
export function normalizeOpenLibraryDoc(doc: any): MediaItem {
  const workId = String(doc.key || "").replace("/works/", "");
  return {
    id: `olw-${workId}`,
    media_type: "book",
    title: doc.title || "",
    slug: `olw-${workId}`,
    cover_image_url: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : undefined,
    year: doc.first_publish_year || undefined,
    rating: doc.ratings_average
      ? Math.round(doc.ratings_average * 20)
      : undefined,
    genres: cleanSubjects(doc.subject, 3),
    author: (doc.author_name || []).join(", ") || undefined,
  };
}

/**
 * Book rows for carousels: Open Library first (popular + reliable),
 * Google Books as backup. Always returns items with covers.
 */
export async function fetchBooksBySubject(
  subject: string,
  limit: number = 40,
  page: number = 1
): Promise<MediaItem[]> {
  try {
    const docs = await browseOpenLibrary(subject, limit, page);
    const items = docs
      .map(normalizeOpenLibraryDoc)
      .filter((i: MediaItem) => i.cover_image_url);
    // Deep pages legitimately thin out — only fall back on a weak first page
    if (items.length >= 8 || page > 1) return items;
  } catch {
    // fall through to Google
  }
  if (page > 1) return [];
  try {
    const rows = await browseBooks(subject, limit);
    return rows
      .map(normalizeBook)
      .filter((i: MediaItem) => i.cover_image_url);
  } catch {
    return [];
  }
}

/** Full work details for olw- slugs (work + ratings + a few editions + authors) */
export interface OLAuthorInfo {
  name: string;
  bio?: string;
  photo_url?: string;
  birth_date?: string;
  death_date?: string;
  ol_url?: string;
}

function mapOLAuthor(a: any): OLAuthorInfo | null {
  if (!a?.name) return null;
  const photoId = (a.photos || []).find((p: number) => p > 0);
  // Some records store the native-script name as primary (夏目漱石) —
  // prefer a Latin-script variant for display
  const hasLatin = (s: string) => /[A-Za-z]/.test(s);
  let name: string = a.name;
  if (!hasLatin(name)) {
    const alt =
      (a.alternate_names || []).find((n: string) => hasLatin(n)) ||
      (a.personal_name && hasLatin(a.personal_name) ? a.personal_name : null);
    if (alt) name = alt;
  }
  return {
    name,
    bio: typeof a.bio === "string" ? a.bio : a.bio?.value,
    photo_url: photoId
      ? `https://covers.openlibrary.org/a/id/${photoId}-M.jpg`
      : undefined,
    birth_date: a.birth_date,
    death_date: a.death_date,
    ol_url: a.key ? `https://openlibrary.org${a.key}` : undefined,
  };
}

export async function getOpenLibraryWorkDetails(workId: string) {
  const [workRes, ratingsRes, shelvesRes, editionsRes, searchRes] = await Promise.allSettled([
    fetch(`${OL_BASE}/works/${workId}.json`, { next: { revalidate: 86400 } }),
    fetch(`${OL_BASE}/works/${workId}/ratings.json`, { next: { revalidate: 86400 } }),
    fetch(`${OL_BASE}/works/${workId}/bookshelves.json`, { next: { revalidate: 86400 } }),
    fetch(`${OL_BASE}/works/${workId}/editions.json?limit=10`, { next: { revalidate: 86400 } }),
    // The search index is the only reliable source of the true first-publish
    // year — editions are often modern reprints (HP1 "published 2025")
    fetch(
      `${OL_BASE}/search.json?q=key:"/works/${workId}"&fields=first_publish_year&limit=1`,
      { next: { revalidate: 86400 } }
    ),
  ]);

  const json = async (r: PromiseSettledResult<Response>) =>
    r.status === "fulfilled" && r.value.ok ? r.value.json() : null;

  const work = await json(workRes);
  if (!work) return null;
  const ratings = await json(ratingsRes);
  const shelves = await json(shelvesRes);
  const editions = await json(editionsRes);
  const searchDoc = (await json(searchRes))?.docs?.[0];

  // Author details require follow-up fetches (work only stores refs)
  const authorKeys: string[] = (work.authors || [])
    .map((a: any) => a?.author?.key)
    .filter(Boolean)
    .slice(0, 3);
  const authors = (
    await Promise.all(
      authorKeys.map(async (key: string) => {
        try {
          const res = await fetch(`${OL_BASE}${key}.json`, {
            next: { revalidate: 86400 },
          });
          if (!res.ok) return null;
          return mapOLAuthor(await res.json());
        } catch {
          return null;
        }
      })
    )
  ).filter(Boolean) as OLAuthorInfo[];
  const authorNames = authors.map((a) => a.name);

  // Pick a representative edition for page count / publisher / ISBN
  const editionEntries: any[] = editions?.entries || [];
  const withPages = editionEntries.filter(
    (e) => typeof e.number_of_pages === "number" && e.number_of_pages > 20
  );
  const pageCounts = withPages
    .map((e) => e.number_of_pages as number)
    .sort((a, b) => a - b);
  const pageCount = pageCounts.length
    ? pageCounts[Math.floor(pageCounts.length / 2)] // median — editions vary wildly
    : undefined;
  const bestEdition = withPages[0] || editionEntries[0];

  return {
    work,
    firstPublishYear: searchDoc?.first_publish_year as number | undefined,
    pageCount,
    publisher: bestEdition?.publishers?.[0] as string | undefined,
    publishDate: bestEdition?.publish_date as string | undefined,
    isbn: (bestEdition?.isbn_13?.[0] || bestEdition?.isbn_10?.[0]) as
      | string
      | undefined,
    ratingAverage: ratings?.summary?.average as number | undefined,
    ratingCount: ratings?.summary?.count as number | undefined,
    // Star-by-star counts, Goodreads-style: { "1": n, ..., "5": n }
    ratingDistribution: ratings?.counts as Record<string, number> | undefined,
    readingStats: shelves?.counts
      ? {
          want_to_read: shelves.counts.want_to_read as number | undefined,
          currently_reading: shelves.counts.currently_reading as number | undefined,
          already_read: shelves.counts.already_read as number | undefined,
        }
      : undefined,
    authors,
    authorNames,
  };
}

/**
 * Resolve an author by name → bio, photo, dates. Used for Google Books
 * titles, which only carry the author's name.
 */
export async function getOpenLibraryAuthorByName(name: string) {
  try {
    const res = await fetch(
      `${OL_BASE}/search/authors.json?q=${encodeURIComponent(name)}&limit=10`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const docs: any[] = (await res.json())?.docs || [];
    // Top hit is often a near-namesake ("Frank Herbert" → "Frank Herbert
    // Hayward") — prefer an exact name match, break ties by prolificness
    const target = name.trim().toLowerCase();
    const exact = docs
      .filter((d) => (d.name || "").trim().toLowerCase() === target)
      .sort((a, b) => (b.work_count || 0) - (a.work_count || 0));
    const key = (exact[0] || docs.sort((a, b) => (b.work_count || 0) - (a.work_count || 0))[0])?.key;
    if (!key) return null;
    const authorRes = await fetch(`${OL_BASE}/authors/${key}.json`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    });
    if (!authorRes.ok) return null;
    return mapOLAuthor(await authorRes.json());
  } catch {
    return null;
  }
}

/**
 * Resolve a work by title+author → community stats (rating distribution,
 * reading-log counts). Best-effort enrichment for Google Books titles.
 */
export async function getOpenLibraryWorkStats(title: string, author?: string) {
  try {
    const q = [`title:"${title}"`, author ? `author:"${author}"` : null]
      .filter(Boolean)
      .join(" AND ");
    // Query is title+author constrained, so popularity sort safely picks the
    // canonical work over obscure same-titled entries
    const res = await fetch(
      `${OL_BASE}/search.json?q=${encodeURIComponent(q)}&fields=key&sort=readinglog&limit=1`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const workKey = (await res.json())?.docs?.[0]?.key as string | undefined;
    if (!workKey) return null;
    const [ratingsRes, shelvesRes] = await Promise.allSettled([
      fetch(`${OL_BASE}${workKey}/ratings.json`, {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(4000),
      }),
      fetch(`${OL_BASE}${workKey}/bookshelves.json`, {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(4000),
      }),
    ]);
    const json = async (r: PromiseSettledResult<Response>) =>
      r.status === "fulfilled" && r.value.ok ? r.value.json() : null;
    const ratings = await json(ratingsRes);
    const shelves = await json(shelvesRes);
    return {
      ratingAverage: ratings?.summary?.average as number | undefined,
      ratingCount: ratings?.summary?.count as number | undefined,
      ratingDistribution: ratings?.counts as Record<string, number> | undefined,
      readingStats: shelves?.counts
        ? {
            want_to_read: shelves.counts.want_to_read as number | undefined,
            currently_reading: shelves.counts.currently_reading as number | undefined,
            already_read: shelves.counts.already_read as number | undefined,
          }
        : undefined,
    };
  } catch {
    return null;
  }
}
