/**
 * Configuration for the per-medium Browse sections ("the library"):
 * category pills, sort modes, and the curated era timelines that let
 * someone walk a genre's lineage decade by decade.
 *
 * `value` is what the API understands per source:
 *  - book  → Open Library subject
 *  - film/tv → TMDB genre id(s), pipe-separated for OR
 *  - anime → Jikan (MAL) genre id
 *  - game  → IGDB genre id
 */

export type BrowseType = "film" | "tv" | "anime" | "game" | "book";

export const BROWSE_TYPES: BrowseType[] = ["book", "film", "tv", "anime", "game"];

export interface BrowseCategory {
  label: string;
  value: string;
}

export interface BrowseEra {
  label: string;
  years: string;
  from: number;
  to: number;
  blurb: string;
}

export type SortKey = "popular" | "top" | "new" | "old";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Most Popular" },
  { key: "top", label: "Top Rated" },
  { key: "new", label: "Newest" },
  { key: "old", label: "Oldest" },
];

interface BrowseSection {
  title: string;
  tagline: string;
  searchHint: string;
  categories: BrowseCategory[];
  eras: BrowseEra[];
}

export const BROWSE_CONFIG: Record<BrowseType, BrowseSection> = {
  book: {
    title: "The Library",
    tagline:
      "Every genre, ranked and ready — pick a shelf, follow the lineage, and most titles are an Audible click away.",
    searchHint: "Search any genre, theme, or vibe — philosophy, space opera, stoicism…",
    categories: [
      { label: "Philosophy", value: "philosophy" },
      { label: "Classics", value: "classic literature" },
      { label: "Science Fiction", value: "science fiction" },
      { label: "Fantasy", value: "fantasy" },
      { label: "Mystery", value: "mystery" },
      { label: "Romance", value: "romance" },
      { label: "Horror", value: "horror" },
      { label: "History", value: "history" },
      { label: "Biography", value: "biography" },
      { label: "Psychology", value: "psychology" },
      { label: "Poetry", value: "poetry" },
      { label: "Theology", value: "religion" },
      { label: "Adventure", value: "adventure" },
      { label: "Young Adult", value: "young adult fiction" },
      { label: "Dystopia", value: "dystopia" },
      { label: "Self-Improvement", value: "self-help" },
    ],
    eras: [
      {
        label: "The Classics",
        years: "before 1900",
        from: 800,
        to: 1899,
        blurb:
          "Homer to Dostoevsky. Austen perfects the novel, Shelley's Frankenstein invents science fiction, and Dickens makes stories a public event.",
      },
      {
        label: "Modernism & Pulp",
        years: "1900–1945",
        from: 1900,
        to: 1945,
        blurb:
          "Joyce and Hemingway reinvent prose while the pulps breed genre fiction — Conan, Lovecraft's cosmic horror, and a young Tolkien writing The Hobbit.",
      },
      {
        label: "Golden Age & High Fantasy",
        years: "1945–1965",
        from: 1945,
        to: 1965,
        blurb:
          "Orwell's 1984, Tolkien's Lord of the Rings, Asimov's Foundation, Herbert's Dune — twenty years that built modern sci-fi and fantasy from scratch.",
      },
      {
        label: "The New Wave",
        years: "1965–1985",
        from: 1965,
        to: 1985,
        blurb:
          "Le Guin and Dick turn sci-fi inward and literary; Stephen King turns horror into a mainstream empire.",
      },
      {
        label: "Epics & Boy Wizards",
        years: "1985–2005",
        from: 1985,
        to: 2005,
        blurb:
          "Harry Potter creates a generation of readers; Wheel of Time and A Song of Ice and Fire prove fantasy can sprawl for decades.",
      },
      {
        label: "The New Canon",
        years: "2005–now",
        from: 2005,
        to: new Date().getFullYear(),
        blurb:
          "BookTok, romantasy, and litRPG — the internet decides what gets read now, and audiobooks turn commutes into libraries.",
      },
    ],
  },

  film: {
    title: "The Cinema",
    tagline:
      "A century of moving pictures — sort any genre, or walk the eras from the silents to the streaming wars.",
    searchHint: "Search any genre or theme — noir, heist, time travel, coming of age…",
    categories: [
      { label: "Action", value: "28" },
      { label: "Sci-Fi", value: "878" },
      { label: "Fantasy", value: "14" },
      { label: "Drama", value: "18" },
      { label: "Comedy", value: "35" },
      { label: "Thriller", value: "53" },
      { label: "Horror", value: "27" },
      { label: "Crime", value: "80" },
      { label: "Romance", value: "10749" },
      { label: "Animation", value: "16" },
      { label: "Documentary", value: "99" },
      { label: "War", value: "10752" },
      { label: "Western", value: "37" },
      { label: "Mystery", value: "9648" },
      { label: "History", value: "36" },
      { label: "Family", value: "10751" },
    ],
    eras: [
      {
        label: "Silents to Sound",
        years: "1920s–30s",
        from: 1920,
        to: 1939,
        blurb:
          "Chaplin and Keaton perfect visual comedy, the talkies arrive in 1927, and Universal's monsters invent the horror franchise.",
      },
      {
        label: "The Golden Age",
        years: "1940s–50s",
        from: 1940,
        to: 1959,
        blurb:
          "Casablanca, Citizen Kane, film noir's shadows, and Hitchcock's thrillers — the studio system at its full power.",
      },
      {
        label: "New Hollywood",
        years: "1960s–70s",
        from: 1960,
        to: 1979,
        blurb:
          "The auteurs take over: The Godfather, Taxi Driver — then Jaws and Star Wars invent the blockbuster and change everything.",
      },
      {
        label: "The Blockbuster Era",
        years: "1980s–90s",
        from: 1980,
        to: 1999,
        blurb:
          "Spielberg's empire, action heroes, Pixar's first steps, and indie cinema exploding out of Sundance with Tarantino.",
      },
      {
        label: "Franchise & Digital",
        years: "2000s–10s",
        from: 2000,
        to: 2019,
        blurb:
          "Lord of the Rings and the MCU rewire the box office around universes; digital cameras and CGI unlock anything imaginable.",
      },
      {
        label: "The Streaming Era",
        years: "2020s",
        from: 2020,
        to: new Date().getFullYear(),
        blurb:
          "Theatrical and streaming blur, A24 makes weird prestige mainstream, and global cinema — Parasite, RRR — takes the spotlight.",
      },
    ],
  },

  tv: {
    title: "The Television",
    tagline:
      "From broadcast to binge — every genre of series, ranked, with the eras that made TV the dominant art form.",
    searchHint: "Search any genre or theme — heist, legal drama, workplace comedy…",
    categories: [
      { label: "Drama", value: "18" },
      { label: "Sci-Fi & Fantasy", value: "10765" },
      { label: "Comedy", value: "35" },
      { label: "Crime", value: "80" },
      { label: "Mystery", value: "9648" },
      { label: "Action & Adventure", value: "10759" },
      { label: "Animation", value: "16" },
      { label: "Documentary", value: "99" },
      { label: "Reality", value: "10764" },
      { label: "War & Politics", value: "10768" },
      { label: "Western", value: "37" },
      { label: "Family", value: "10751" },
    ],
    eras: [
      {
        label: "The Broadcast Age",
        years: "1950s–70s",
        from: 1950,
        to: 1979,
        blurb:
          "Three channels, one nation watching: I Love Lucy invents the sitcom, Star Trek invents the fandom, and the whole family shares one screen.",
      },
      {
        label: "Cable & Syndication",
        years: "1980s–90s",
        from: 1980,
        to: 1999,
        blurb:
          "The Simpsons, Seinfeld, The X-Files, Twin Peaks — cable multiplies the channels and TV starts getting strange and ambitious.",
      },
      {
        label: "The Golden Age",
        years: "2000s",
        from: 2000,
        to: 2009,
        blurb:
          "The Sopranos, The Wire, Lost, Breaking Bad begins — HBO proves television can out-write the movies.",
      },
      {
        label: "Peak TV",
        years: "2010s",
        from: 2010,
        to: 2019,
        blurb:
          "Game of Thrones becomes a global event, Netflix drops whole seasons at once, and 500 scripted shows air in a single year.",
      },
      {
        label: "The Streaming Wars",
        years: "2020s",
        from: 2020,
        to: new Date().getFullYear(),
        blurb:
          "Every studio launches a platform; Succession, The Bear, and international hits like Squid Game prove the best stories come from anywhere.",
      },
    ],
  },

  anime: {
    title: "The Anime Archive",
    tagline:
      "Six decades from Astro Boy to the new peak — every genre ranked by the MyAnimeList hive mind.",
    searchHint: "Search any genre or theme — isekai, mecha, slice of life, psychological…",
    categories: [
      { label: "Action", value: "1" },
      { label: "Adventure", value: "2" },
      { label: "Fantasy", value: "10" },
      { label: "Sci-Fi", value: "24" },
      { label: "Drama", value: "8" },
      { label: "Comedy", value: "4" },
      { label: "Romance", value: "22" },
      { label: "Mystery", value: "7" },
      { label: "Horror", value: "14" },
      { label: "Sports", value: "30" },
      { label: "Slice of Life", value: "36" },
      { label: "Supernatural", value: "37" },
      { label: "Suspense", value: "41" },
      { label: "Award Winning", value: "46" },
    ],
    eras: [
      {
        label: "The Origins",
        years: "1960s–70s",
        from: 1960,
        to: 1979,
        blurb:
          "Tezuka's Astro Boy invents TV anime; Space Battleship Yamato and Lupin III sketch out everything that follows.",
      },
      {
        label: "Mecha & OVA Boom",
        years: "1980s",
        from: 1980,
        to: 1989,
        blurb:
          "Gundam turns robots into war drama, Nausicaä births Studio Ghibli, and Akira shows the world what animation can really do.",
      },
      {
        label: "The Golden 90s",
        years: "1990s",
        from: 1990,
        to: 1999,
        blurb:
          "Evangelion breaks the medium's brain, Cowboy Bebop perfects cool, and Pokémon conquers the planet's children.",
      },
      {
        label: "The Shonen Boom",
        years: "2000s",
        from: 2000,
        to: 2009,
        blurb:
          "Naruto, One Piece, Bleach, Fullmetal Alchemist — the big battle epics hook a global generation via late-night cable.",
      },
      {
        label: "The Global Wave",
        years: "2010s",
        from: 2010,
        to: 2019,
        blurb:
          "Attack on Titan and One-Punch Man ride streaming worldwide; anime stops being niche and starts being pop culture.",
      },
      {
        label: "The New Peak",
        years: "2020s",
        from: 2020,
        to: new Date().getFullYear(),
        blurb:
          "Demon Slayer breaks box-office records, Jujutsu Kaisen and Frieren set new bars — production quality has never been higher.",
      },
    ],
  },

  game: {
    title: "The Arcade",
    tagline:
      "Five console generations of play — sort any genre or walk the timeline from pixels to open worlds.",
    searchHint: "Search any genre or theme — soulslike, roguelike, cozy, tactical…",
    categories: [
      { label: "RPG", value: "12" },
      { label: "Shooter", value: "5" },
      { label: "Adventure", value: "31" },
      { label: "Platformer", value: "8" },
      { label: "Strategy", value: "15" },
      { label: "Indie", value: "32" },
      { label: "Puzzle", value: "9" },
      { label: "Racing", value: "10" },
      { label: "Fighting", value: "4" },
      { label: "Simulator", value: "13" },
      { label: "Sports", value: "14" },
      { label: "Tactical", value: "24" },
      { label: "Arcade", value: "33" },
      { label: "Visual Novel", value: "34" },
    ],
    eras: [
      {
        label: "Arcade Gold",
        years: "1978–1985",
        from: 1978,
        to: 1985,
        blurb:
          "Space Invaders, Pac-Man, Donkey Kong — a quarter at a time, games become a culture.",
      },
      {
        label: "The Console Wars",
        years: "1985–1995",
        from: 1985,
        to: 1995,
        blurb:
          "Mario vs Sonic, 8-bit to 16-bit: Nintendo and Sega invent the modern game industry in a decade-long duel.",
      },
      {
        label: "The 3D Revolution",
        years: "1995–2005",
        from: 1995,
        to: 2005,
        blurb:
          "PlayStation and N64 add a dimension — Final Fantasy VII, Ocarina of Time, Half-Life, and GTA redefine what games are.",
      },
      {
        label: "The HD Era",
        years: "2005–2015",
        from: 2005,
        to: 2015,
        blurb:
          "Xbox 360 and PS3 bring online play; Skyrim, Dark Souls, and Minecraft each spawn a genre of their own.",
      },
      {
        label: "The Modern Age",
        years: "2015–now",
        from: 2015,
        to: new Date().getFullYear(),
        blurb:
          "The Witcher 3, Elden Ring, Baldur's Gate 3 — open worlds at maximum ambition, while indies keep the medium honest.",
      },
    ],
  },
};
