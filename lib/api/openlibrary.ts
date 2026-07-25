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
export async function browseOpenLibrary(subject: string, limit: number = 40) {
  const params = new URLSearchParams({
    q: `subject:"${subject}"`,
    sort: "readinglog",
    limit: String(limit),
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
  limit: number = 40
): Promise<MediaItem[]> {
  try {
    const docs = await browseOpenLibrary(subject, limit);
    const items = docs
      .map(normalizeOpenLibraryDoc)
      .filter((i: MediaItem) => i.cover_image_url);
    if (items.length >= 8) return items;
  } catch {
    // fall through to Google
  }
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
export async function getOpenLibraryWorkDetails(workId: string) {
  const [workRes, ratingsRes, editionsRes, searchRes] = await Promise.allSettled([
    fetch(`${OL_BASE}/works/${workId}.json`, { next: { revalidate: 86400 } }),
    fetch(`${OL_BASE}/works/${workId}/ratings.json`, { next: { revalidate: 86400 } }),
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
  const editions = await json(editionsRes);
  const searchDoc = (await json(searchRes))?.docs?.[0];

  // Author names require follow-up fetches (work only stores refs)
  const authorKeys: string[] = (work.authors || [])
    .map((a: any) => a?.author?.key)
    .filter(Boolean)
    .slice(0, 3);
  const authorNames = (
    await Promise.all(
      authorKeys.map(async (key: string) => {
        try {
          const res = await fetch(`${OL_BASE}${key}.json`, {
            next: { revalidate: 86400 },
          });
          if (!res.ok) return null;
          const a = await res.json();
          return a?.name as string | null;
        } catch {
          return null;
        }
      })
    )
  ).filter(Boolean) as string[];

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
    authorNames,
  };
}
