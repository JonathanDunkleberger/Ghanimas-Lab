"use client";

import { create } from "zustand";
import type { MediaItem } from "./app-store";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface HistoryEvent {
  /** Media id the event refers to */
  id: string;
  action: "favorited" | "watched" | "watchlisted" | "rated";
  /** Epoch ms */
  ts: number;
  /** Rating value for "rated" events */
  value?: number;
}

interface MediaState {
  // Data
  favorites: string[];
  watched: string[];
  watchlist: string[];
  ratings: Record<string, number>;
  // Items cache — store full MediaItem objects so we can compute taste profile
  items: Record<string, MediaItem>;
  // Append-only event log (powers Wrapped, activity feed, streaks)
  history: HistoryEvent[];

  // Actions
  toggleFavorite: (id: string, item?: MediaItem) => void;
  toggleWatched: (id: string, item?: MediaItem) => void;
  toggleWatchlist: (id: string, item?: MediaItem) => void;
  removeFromWatchlist: (id: string) => void;
  setRating: (id: string, value: number) => void;
  cacheItem: (item: MediaItem) => void;

  // Queries
  isFavorite: (id: string) => boolean;
  isWatched: (id: string) => boolean;
  isOnWatchlist: (id: string) => boolean;
  getRating: (id: string) => number;

  // Hydrate from localStorage
  _hydrated: boolean;
  _hydrate: () => void;
}

// ─── localStorage helpers ───────────────────────────────────────────────────
const KEYS = {
  favorites: "feyris-favorites",
  watched: "feyris-watched",
  watchlist: "feyris-watchlist",
  ratings: "feyris-ratings",
  items: "feyris-items-cache",
  history: "feyris-history",
} as const;

const HISTORY_CAP = 2000;

function loadArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadRecord<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadHistory(key: string): HistoryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJSON(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // quota exceeded
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────
export const useMediaStore = create<MediaState>((set, get) => {
  /** Append a history event (assumes the store is already hydrated) */
  const logEvent = (event: Omit<HistoryEvent, "ts">) => {
    const now = Date.now();
    let prev = get().history;
    // Rating sliders fire repeatedly — collapse same-item rating events
    // logged within the last hour into the latest value.
    if (event.action === "rated") {
      prev = prev.filter(
        (e) =>
          !(
            e.action === "rated" &&
            e.id === event.id &&
            now - e.ts < 60 * 60 * 1000
          )
      );
    }
    const next = [...prev, { ...event, ts: now }].slice(-HISTORY_CAP);
    set({ history: next });
    saveJSON(KEYS.history, next);
  };

  return {
  favorites: [],
  watched: [],
  watchlist: [],
  ratings: {},
  items: {},
  history: [],
  _hydrated: false,

  _hydrate: () => {
    if (get()._hydrated) return;
    set({
      favorites: loadArray(KEYS.favorites),
      watched: loadArray(KEYS.watched),
      watchlist: loadArray(KEYS.watchlist),
      ratings: loadRecord<number>(KEYS.ratings),
      items: loadRecord<MediaItem>(KEYS.items),
      history: loadHistory(KEYS.history),
      _hydrated: true,
    });
  },

  cacheItem: (item) => {
    get()._hydrate();
    const items = { ...get().items, [item.id]: item };
    set({ items });
    saveJSON(KEYS.items, items);
  },

  toggleFavorite: (id, item) => {
    get()._hydrate();
    const prev = get().favorites;
    const adding = !prev.includes(id);
    const next = adding ? [...prev, id] : prev.filter((x) => x !== id);
    set({ favorites: next });
    saveJSON(KEYS.favorites, next);
    if (adding) logEvent({ id, action: "favorited" });
    if (item) {
      const items = { ...get().items, [item.id]: item };
      set({ items });
      saveJSON(KEYS.items, items);
    }
  },

  toggleWatched: (id, item) => {
    get()._hydrate();
    const prev = get().watched;
    const adding = !prev.includes(id);
    const next = adding ? [...prev, id] : prev.filter((x) => x !== id);
    set({ watched: next });
    saveJSON(KEYS.watched, next);
    if (adding) logEvent({ id, action: "watched" });
    if (item) {
      const items = { ...get().items, [item.id]: item };
      set({ items });
      saveJSON(KEYS.items, items);
    }
  },

  toggleWatchlist: (id, item) => {
    get()._hydrate();
    const prev = get().watchlist;
    const adding = !prev.includes(id);
    const next = adding ? [...prev, id] : prev.filter((x) => x !== id);
    set({ watchlist: next });
    saveJSON(KEYS.watchlist, next);
    if (adding) logEvent({ id, action: "watchlisted" });
    if (item) {
      const items = { ...get().items, [item.id]: item };
      set({ items });
      saveJSON(KEYS.items, items);
    }
  },

  removeFromWatchlist: (id) => {
    get()._hydrate();
    const next = get().watchlist.filter((x) => x !== id);
    set({ watchlist: next });
    saveJSON(KEYS.watchlist, next);
  },

  setRating: (id, value) => {
    get()._hydrate();
    const next = { ...get().ratings };
    if (value <= 0) delete next[id];
    else next[id] = value;
    set({ ratings: next });
    saveJSON(KEYS.ratings, next);
    if (value > 0) logEvent({ id, action: "rated", value });
  },

  isFavorite: (id) => get().favorites.includes(id),
  isWatched: (id) => get().watched.includes(id),
  isOnWatchlist: (id) => get().watchlist.includes(id),
  getRating: (id) => get().ratings[id] ?? 0,
  };
});
