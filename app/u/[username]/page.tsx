import { Metadata } from "next";
import { Film, Star } from "lucide-react";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} — Ghanima's Lab Profile`,
    description: `Check out ${username}'s entertainment profile on Ghanima's Lab.`,
    openGraph: {
      title: `${username} on Ghanima's Lab`,
      description: `${username}'s entertainment library and stats.`,
    },
  };
}

// Profile data — populated from user's public library via Supabase
const DEMO_STATS = [
  { label: "Hours", value: "847" },
  { label: "Titles", value: "42" },
  { label: "Avg Rating", value: "8.3" },
  { label: "Favorites", value: "12" },
];

const DEMO_TOP = [
  { title: "Elden Ring", type: "game", rating: 10 },
  { title: "Attack on Titan", type: "anime", rating: 9.5 },
  { title: "Dune", type: "book", rating: 9 },
  { title: "Breaking Bad", type: "tv", rating: 9.5 },
  { title: "Interstellar", type: "film", rating: 9 },
];

const TYPE_COLORS: Record<string, string> = {
  anime: "#7b9ec9",
  game: "#c5c2bc",
  book: "#a0c4a8",
  tv: "#c97b9e",
  film: "#d4a574",
  manga: "#b088c9",
};

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;

  // Public profile data — fetched from Supabase when profile API is available
  return (
    <div className="flex min-h-screen flex-col bg-fey-black text-cream">
      {/* Header */}
      <header className="border-b border-white/[0.04] px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-gold to-[#8b8882]" />
            <span className="text-[10px] font-extrabold uppercase tracking-[3px] text-gold">
              Ghanima's Lab
            </span>
          </a>
          <a
            href="/"
            className="rounded-lg border border-gold/20 bg-gold/[0.05] px-3 py-1.5 text-[11px] font-semibold text-gold hover:bg-gold/[0.1]"
          >
            Join Ghanima's Lab
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        {/* Profile header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold/20 to-gold/5 text-2xl font-black text-gold">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-cream">{username}</h1>
            <p className="text-[12px] text-cream/30">
              Ghanima's Lab member · &ldquo;The Worldbuilder&rdquo;
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-4 gap-2.5">
          {DEMO_STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/[0.025] p-4 text-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(18,18,20,0.85), rgba(12,12,14,0.92))",
              }}
            >
              <div className="text-[22px] font-black text-gold">{s.value}</div>
              <div className="text-[9px] font-bold uppercase tracking-[1px] text-cream/25">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Top Rated */}
        <h2 className="mb-3 text-[14px] font-bold text-cream">
          Top Rated
        </h2>
        <div className="flex flex-col gap-2">
          {DEMO_TOP.map((item, i) => (
            <div
              key={item.title}
              className="flex items-center gap-3 rounded-xl border border-white/[0.025] px-4 py-3"
              style={{
                background:
                  "linear-gradient(135deg, rgba(18,18,20,0.85), rgba(12,12,14,0.92))",
              }}
            >
              <span
                className="min-w-[24px] text-right text-[18px] font-black"
                style={{
                  color:
                    i === 0 ? "#c5c2bc" : "rgba(240,238,234,0.1)",
                }}
              >
                #{i + 1}
              </span>
              <div className="h-5 w-px bg-white/[0.04]" />
              <div className="flex-1">
                <div className="text-[13px] font-bold text-cream">
                  {item.title}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-cream/30">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      background: TYPE_COLORS[item.type] || "#999",
                    }}
                  />
                  {item.type}
                </div>
              </div>
              <div className="flex items-center gap-1 text-[14px] font-bold text-gold">
                {item.rating} <Star size={13} fill="#c5c2bc" />
              </div>
            </div>
          ))}
        </div>

        {/* Recent Reviews */}
        <h2 className="mb-3 mt-8 text-[14px] font-bold text-cream">
          Recent Reviews
        </h2>
        <div
          className="rounded-xl border border-white/[0.025] px-4 py-8 text-center text-[12px] text-cream/20"
          style={{
            background:
              "linear-gradient(135deg, rgba(18,18,20,0.85), rgba(12,12,14,0.92))",
          }}
        >
          No public reviews yet
        </div>
      </main>
    </div>
  );
}
