"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Compass } from "lucide-react";
import { CatLogo } from "@/components/shared/CatLogo";
import { WrappedSlideshow } from "@/components/wrapped/WrappedSlideshow";
import { useMediaStore } from "@/stores/media-store";
import { useToast } from "@/components/shared/Toast";
import { buildWrappedData } from "@/lib/library-stats";
import type { WrappedPeriod } from "@/lib/constants";

const PERIOD_OPTIONS: { value: WrappedPeriod; label: string }[] = [
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

export default function WrappedPage() {
  const [period, setPeriod] = useState<WrappedPeriod>("yearly");
  const { toast } = useToast();

  const favorites = useMediaStore((s) => s.favorites);
  const watched = useMediaStore((s) => s.watched);
  const watchlist = useMediaStore((s) => s.watchlist);
  const ratings = useMediaStore((s) => s.ratings);
  const items = useMediaStore((s) => s.items);
  const history = useMediaStore((s) => s.history);
  const hydrated = useMediaStore((s) => s._hydrated);

  const data = useMemo(
    () =>
      buildWrappedData(
        { favorites, watched, watchlist, ratings, items, history },
        period
      ),
    [favorites, watched, watchlist, ratings, items, history, period]
  );

  const handleShare = useCallback(() => {
    if (!data) return;
    // Stats travel in the URL — the share page and OG image render them
    // without needing an account or a database.
    const params = new URLSearchParams({
      hours: String(data.totalHours),
      titles: String(data.titlesCompleted),
      personality: data.personality,
      genre: data.topGenre,
      period: data.period_label,
    });
    if (data.avgRating > 0) params.set("rating", data.avgRating.toFixed(1));
    const url = `${window.location.origin}/wrapped/share?${params.toString()}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => toast("Share link copied to clipboard", "success"))
      .catch(() => toast("Couldn't copy — your browser blocked it", "error"));
  }, [data, toast]);

  return (
    <div className="animate-fadeIn pt-3.5">
      <div className="mb-6 text-center">
        <CatLogo size={38} />
        <h1 className="mt-1.5 text-4xl font-black leading-tight tracking-tight gradient-gold">
          {data ? `Wrapped ${data.period_label}` : "Your Wrapped"}
        </h1>
        <p className="mt-[5px] text-[12.5px] text-cream/30">
          Your {period === "yearly" ? "year" : period === "monthly" ? "month" : "week"} in film, TV, anime, games, and books.
        </p>

        {/* Period selector */}
        <div className="mx-auto mt-4 inline-flex rounded-lg border border-white/[0.04] bg-white/[0.02] p-[3px]">
          {PERIOD_OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className="relative rounded-md px-4 py-1.5 text-[11.5px] font-semibold transition-colors"
              style={{
                color: period === opt.value ? "#0c0c0e" : "rgba(240,238,234,0.4)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              {period === opt.value && (
                <motion.div
                  layoutId="period-pill"
                  className="absolute inset-0 rounded-md"
                  style={{ background: "linear-gradient(135deg, #c5c2bc, #8b8882)" }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {data ? (
        <WrappedSlideshow data={data} onShare={handleShare} />
      ) : (
        <div className="mx-auto max-w-[500px]">
          <div
            className="flex min-h-[400px] flex-col items-center justify-center rounded-modal border border-silver/[0.07] p-[30px] text-center"
            style={{
              background: "linear-gradient(135deg, rgba(18,18,20,0.9), rgba(12,12,14,0.95))",
            }}
          >
            <div className="opacity-30">
              <CatLogo size={56} />
            </div>
            <h2 className="mt-4 text-[20px] font-black text-cream">
              {hydrated ? "Your story starts here" : "Loading your library..."}
            </h2>
            {hydrated && (
              <>
                <p className="mt-2 max-w-[340px] text-[12.5px] leading-[1.7] text-cream/40">
                  Wrapped is built from what you actually watch, play, and read.
                  Favorite a few titles and mark what you&apos;ve finished — Ghanima
                  will keep the ledger.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[12px] font-bold text-fey-black transition-transform active:scale-[0.96]"
                  style={{ background: "linear-gradient(135deg, #c5c2bc, #8b8882)" }}
                >
                  <Compass size={13} /> Start exploring
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
