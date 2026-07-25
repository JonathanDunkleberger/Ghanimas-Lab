import { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const hours = str(sp.hours) || "0";
  const titles = str(sp.titles) || "0";
  const personality = str(sp.personality) || "The Explorer";
  const period = str(sp.period) || String(new Date().getFullYear());

  const ogUrl = `/api/og?title=Wrapped&hours=${encodeURIComponent(hours)}&titles=${encodeURIComponent(titles)}&personality=${encodeURIComponent(personality)}&period=${encodeURIComponent(period)}`;
  return {
    title: `Ghanima's Lab Wrapped — ${period}`,
    description: "My year in film, TV, anime, games, and books — summarized.",
    openGraph: {
      title: `Ghanima's Lab Wrapped`,
      description: "My year in entertainment, summarized.",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Ghanima's Lab Wrapped`,
      description: "My year in entertainment, summarized.",
      images: [ogUrl],
    },
  };
}

export default async function PublicWrappedPage({ searchParams }: Props) {
  const sp = await searchParams;
  const hours = str(sp.hours);
  const titles = str(sp.titles);
  const personality = str(sp.personality);
  const genre = str(sp.genre);
  const rating = str(sp.rating);
  const period = str(sp.period) || String(new Date().getFullYear());
  const hasStats = Boolean(hours && titles);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-fey-black px-4 text-cream">
      {/* Glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(197,194,188,0.06), transparent 50%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[500px] text-center">
        {/* Logo */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-gold to-[#8b8882]" />
          <span className="text-[11px] font-extrabold uppercase tracking-[4px] text-gold">
            Ghanima&apos;s Lab
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-4xl font-black gradient-gold">
          Wrapped {period}
        </h1>
        <p className="mb-8 text-[13px] text-cream/30">
          Shared from Ghanima&apos;s Lab
        </p>

        {/* Wrapped preview card */}
        <div
          className="rounded-2xl border border-gold/[0.07] p-8"
          style={{
            background: "linear-gradient(135deg, rgba(24,24,27,0.9), rgba(18,18,20,0.95))",
          }}
        >
          {hasStats ? (
            <>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[3px] text-gold/50">
                Total Hours
              </div>
              <div className="text-[64px] font-black leading-none gradient-gold">
                {hours}
              </div>
              <div className="mt-1 text-[16px] font-light text-cream">
                hours of stories
              </div>
              <div className="mt-4 text-[12px] text-cream/30">
                {titles} titles
                {rating ? ` · Avg ${rating}/10` : ""}
                {genre ? ` · Top genre ${genre}` : ""}
              </div>
              {personality && (
                <div className="mt-4 text-[20px] font-black text-cream">
                  &ldquo;{personality}&rdquo;
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[3px] text-gold/50">
                Your year, measured
              </div>
              <p className="mx-auto max-w-[320px] text-[13px] leading-[1.7] text-cream/50">
                Films, TV, anime, games, and books — tracked in one place,
                summarized once a year. Build yours in the lab.
              </p>
            </>
          )}
        </div>

        {/* CTA */}
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[12px] font-bold text-fey-black"
          style={{
            background: "linear-gradient(135deg, #c5c2bc, #8b8882)",
          }}
        >
          Create Your Own on Ghanima&apos;s Lab
        </a>
      </div>
    </div>
  );
}
