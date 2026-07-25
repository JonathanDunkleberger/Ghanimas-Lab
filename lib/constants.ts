import {
  Tv,
  Gamepad2,
  BookOpen,
  Monitor,
  Film,
  BookMarked,
  type LucideIcon,
} from "lucide-react";

// ─── Media Type Configuration ───────────────────────────────────────────────
export type MediaType = "anime" | "game" | "book" | "tv" | "film" | "manga";

export interface MediaTypeConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

export const MEDIA_TYPES: Record<MediaType, MediaTypeConfig> = {
  anime: {
    label: "Anime",
    icon: Tv,
    color: "#8aa4bc",
    bg: "rgba(138,164,188,0.12)",
    border: "rgba(138,164,188,0.22)",
  },
  game: {
    label: "Game",
    icon: Gamepad2,
    color: "#a8a49c",
    bg: "rgba(168,164,156,0.12)",
    border: "rgba(168,164,156,0.22)",
  },
  book: {
    label: "Book",
    icon: BookOpen,
    color: "#8f9e90",
    bg: "rgba(143,158,144,0.12)",
    border: "rgba(143,158,144,0.22)",
  },
  tv: {
    label: "TV",
    icon: Monitor,
    color: "#9a8a94",
    bg: "rgba(154,138,148,0.12)",
    border: "rgba(154,138,148,0.22)",
  },
  film: {
    label: "Film",
    icon: Film,
    color: "#a89a8c",
    bg: "rgba(168,154,140,0.12)",
    border: "rgba(168,154,140,0.22)",
  },
  manga: {
    label: "Manga",
    icon: BookMarked,
    color: "#958fa3",
    bg: "rgba(149,143,163,0.12)",
    border: "rgba(149,143,163,0.22)",
  },
};

// ─── Library Status Options ─────────────────────────────────────────────────
export type LibraryStatus =
  | "planning"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "dropped";

export const LIBRARY_STATUSES: Record<
  LibraryStatus,
  { label: string; color: string }
> = {
  planning: { label: "Planning", color: "#7b9ec9" },
  in_progress: { label: "In Progress", color: "#c5c2bc" },
  completed: { label: "Completed", color: "#5cb85c" },
  on_hold: { label: "On Hold", color: "#c97b9e" },
  dropped: { label: "Dropped", color: "#d4a574" },
};

// ─── Activity Action Types ──────────────────────────────────────────────────
export const ACTIVITY_ACTIONS = [
  "started",
  "progress_update",
  "completed",
  "rated",
  "added_to_list",
  "dropped",
  "favorited",
  "reviewed",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

// ─── Nav Items ──────────────────────────────────────────────────────────────
import {
  Home,
  BarChart3,
  Sparkles,
} from "lucide-react";

import { LineChart } from "lucide-react";

export const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, href: "/" },
  { id: "collection", label: "Collection", icon: BookMarked, href: "/collection" },
  { id: "for-you", label: "For You", icon: Sparkles, href: "/for-you" },
  { id: "analytics", label: "Analytics", icon: LineChart, href: "/analytics" },
  { id: "wrapped", label: "Wrapped", icon: BarChart3, href: "/wrapped" },
] as const;

/** The per-medium library sections — dense browse grids with eras & genres */
export const BROWSE_NAV_ITEMS = [
  { id: "browse-book", label: "Books", icon: BookOpen, href: "/browse/book" },
  { id: "browse-film", label: "Films", icon: Film, href: "/browse/film" },
  { id: "browse-tv", label: "Television", icon: Monitor, href: "/browse/tv" },
  { id: "browse-anime", label: "Anime", icon: Tv, href: "/browse/anime" },
  { id: "browse-game", label: "Games", icon: Gamepad2, href: "/browse/game" },
] as const;

// ─── Sub-Rating Dimensions ──────────────────────────────────────────────────
export interface SubRatingDimension {
  key: string;
  label: string;
  description: string;
}

export const SUB_RATING_DIMENSIONS: Record<MediaType, SubRatingDimension[]> = {
  anime: [
    { key: "animation", label: "Animation", description: "Visual quality and sakuga" },
    { key: "story", label: "Story", description: "Plot and narrative" },
    { key: "characters", label: "Characters", description: "Development and depth" },
    { key: "soundtrack", label: "Soundtrack", description: "Music and sound design" },
    { key: "enjoyment", label: "Enjoyment", description: "Personal enjoyment factor" },
  ],
  game: [
    { key: "gameplay", label: "Gameplay", description: "Mechanics and controls" },
    { key: "story", label: "Story", description: "Narrative and writing" },
    { key: "visuals", label: "Visuals", description: "Graphics and art" },
    { key: "soundtrack", label: "Soundtrack", description: "Music and audio" },
    { key: "replayability", label: "Replayability", description: "Replay value" },
  ],
  book: [
    { key: "writing", label: "Writing", description: "Prose and style" },
    { key: "plot", label: "Plot", description: "Story structure" },
    { key: "characters", label: "Characters", description: "Character depth" },
    { key: "worldbuilding", label: "World", description: "World building" },
    { key: "pacing", label: "Pacing", description: "Narrative pacing" },
  ],
  tv: [
    { key: "acting", label: "Acting", description: "Cast performance" },
    { key: "writing", label: "Writing", description: "Script and dialogue" },
    { key: "production", label: "Production", description: "Visual production" },
    { key: "soundtrack", label: "Soundtrack", description: "Music and sound" },
    { key: "binge_factor", label: "Binge Factor", description: "How watchable" },
  ],
  film: [
    { key: "acting", label: "Acting", description: "Cast performance" },
    { key: "direction", label: "Direction", description: "Director's vision" },
    { key: "cinematography", label: "Cinematography", description: "Visual storytelling" },
    { key: "soundtrack", label: "Soundtrack", description: "Score and music" },
    { key: "impact", label: "Impact", description: "Emotional impact" },
  ],
  manga: [
    { key: "art", label: "Art", description: "Art style and panels" },
    { key: "story", label: "Story", description: "Plot and narrative" },
    { key: "characters", label: "Characters", description: "Character depth" },
    { key: "pacing", label: "Pacing", description: "Narrative flow" },
    { key: "enjoyment", label: "Enjoyment", description: "Personal enjoyment" },
  ],
};

// ─── Import Platforms ───────────────────────────────────────────────────────
export type ImportPlatform =
  | "goodreads"
  | "myanimelist"
  | "steam"
  | "letterboxd"
  | "imdb";

export interface ImportPlatformConfig {
  label: string;
  color: string;
  icon: string; // emoji or identifier
  acceptedTypes: MediaType[];
  fileFormat: string;
}

export const IMPORT_PLATFORMS: Record<ImportPlatform, ImportPlatformConfig> = {
  goodreads: {
    label: "Goodreads",
    color: "#553B08",
    icon: "book-open",
    acceptedTypes: ["book"],
    fileFormat: "CSV export from Goodreads",
  },
  myanimelist: {
    label: "MyAnimeList",
    color: "#2E51A2",
    icon: "tv",
    acceptedTypes: ["anime", "manga"],
    fileFormat: "XML or CSV export from MAL",
  },
  steam: {
    label: "Steam",
    color: "#1B2838",
    icon: "gamepad-2",
    acceptedTypes: ["game"],
    fileFormat: "Steam profile URL or CSV",
  },
  letterboxd: {
    label: "Letterboxd",
    color: "#00E054",
    icon: "film",
    acceptedTypes: ["film"],
    fileFormat: "CSV export from Letterboxd",
  },
  imdb: {
    label: "IMDb",
    color: "#F5C518",
    icon: "star",
    acceptedTypes: ["film", "tv"],
    fileFormat: "CSV export from IMDb",
  },
};

// ─── For You Unlock Thresholds ──────────────────────────────────────────────
export const FOR_YOU_THRESHOLDS = [
  { min: 0, label: "Getting Started", description: "Rate some media to unlock recommendations" },
  { min: 1, label: "First Taste", description: "Your first recommendation unlocked!" },
  { min: 5, label: "Building Profile", description: "Starting to understand your taste" },
  { min: 10, label: "Taste Forming", description: "Cross-medium recommendations unlocked" },
  { min: 25, label: "Well Defined", description: "Personality type detected" },
  { min: 50, label: "Connoisseur", description: "Full recommendation engine active" },
] as const;

// ─── Wrapped Periods ────────────────────────────────────────────────────────
export type WrappedPeriod = "weekly" | "monthly" | "yearly";

// ─── Personality Types ──────────────────────────────────────────────────────
export const PERSONALITY_TYPES = {
  worldbuilder: {
    name: "The Worldbuilder",
    description:
      "You gravitate toward intricate universes with deep lore. From Elden Ring to Dune, you crave worlds that reward exploration and curiosity.",
  },
  completionist: {
    name: "The Completionist",
    description:
      "You play/read/watch everything to 100%. Leaving things unfinished? Not in your vocabulary.",
  },
  binge_machine: {
    name: "The Binge Machine",
    description:
      "Long sessions, high volume, fast consumption. You devour entertainment at an impressive pace.",
  },
  critic: {
    name: "The Critic",
    description:
      "You rate everything, write reviews, and have a wide range of ratings. Your opinions are well-formed and nuanced.",
  },
  explorer: {
    name: "The Explorer",
    description:
      "High variety across types, trying many genres. You're always looking for the next hidden gem.",
  },
  loyalist: {
    name: "The Loyalist",
    description:
      "Deep in 1-2 types, rewatching/replaying favorites. When you love something, you really commit.",
  },
  curator: {
    name: "The Curator",
    description:
      'Lots of "planning" entries, selective about what to start. Your taste is refined and intentional.',
  },
} as const;
