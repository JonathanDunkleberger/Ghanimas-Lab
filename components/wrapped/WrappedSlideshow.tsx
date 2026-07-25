"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Timer,
  BarChart3,
  Flame,
  Sparkles,
  Trophy,
  Zap,
  Star,
  Film,
  Globe,
  Calendar,
  TrendingUp,
  Share2,
  Heart,
} from "lucide-react";
import { MEDIA_TYPES } from "@/lib/constants";
import type { WrappedData } from "@/stores/app-store";

interface WrappedSlideshowProps {
  data: WrappedData;
  onShare?: () => void;
}

export function WrappedSlideshow({ data, onShare }: WrappedSlideshowProps) {
  const [step, setStep] = useState(0);

  const slideBase =
    "relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden rounded-[18px] border border-gold/[0.07] p-[30px] text-center";
  const slideBg =
    "linear-gradient(135deg, rgba(24,24,27,0.9), rgba(18,18,20,0.95))";

  const slides = [
    // Slide 0 — Welcome / Period intro
    <div key={0} className={slideBase} style={{ background: slideBg }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 40%, rgba(197,194,188,0.1), transparent 50%)" }} />
      <div className="relative z-10">
        <Sparkles size={28} className="mx-auto mb-3 text-gold" />
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[4px] text-gold/60">
          {data.period_label}
        </div>
        <div className="text-[42px] font-black leading-none gradient-gold">
          Your Wrapped
        </div>
        <p className="mt-3 text-[13px] text-cream/40">
          Let&apos;s look back at your entertainment journey.
        </p>
      </div>
    </div>,

    // Slide 1 — Total Hours
    <div key={1} className={slideBase} style={{ background: slideBg }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 40%, rgba(197,194,188,0.07), transparent 60%)" }} />
      <div className="relative z-10">
        <Timer size={22} className="mx-auto mb-2.5 text-gold" />
        <div className="mb-3.5 text-[10px] font-bold uppercase tracking-[3px] text-gold">
          Total Time
        </div>
        <div className="text-[72px] font-black leading-none gradient-gold">
          {data.totalHours.toLocaleString()}
        </div>
        <div className="mt-1 text-[19px] font-light text-cream">
          hours consumed
        </div>
        <div className="mt-4 flex items-center justify-center gap-4">
          <div className="flex items-center gap-[5px] text-[12px] text-cream/35">
            <Trophy size={13} className="text-gold" /> {data.titlesCompleted} titles
          </div>
          <div className="flex items-center gap-[5px] text-[12px] text-cream/35">
            <Star size={13} className="text-gold" /> {data.avgRating.toFixed(1)} avg rating
          </div>
        </div>
      </div>
    </div>,

    // Slide 2 — Breakdown
    <div key={2} className={slideBase} style={{ background: slideBg }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 70% 30%, rgba(123,158,201,0.05), transparent 60%)" }} />
      <div className="relative z-10 w-full">
        <BarChart3 size={22} className="mx-auto mb-2.5 text-type-anime" />
        <div className="mb-[22px] text-[10px] font-bold uppercase tracking-[3px] text-type-anime">
          Your Breakdown
        </div>
        <div className="mx-auto flex max-w-[350px] flex-col gap-3">
          {data.breakdown.map((b) => {
            const config = MEDIA_TYPES[b.type as keyof typeof MEDIA_TYPES];
            const c = config?.color || "#999";
            const Icon = config?.icon || Film;
            return (
              <div key={b.label}>
                <div className="mb-[5px] flex items-center justify-between text-[12.5px]">
                  <span className="flex items-center gap-[5px] font-semibold text-cream">
                    <Icon size={12} style={{ color: c }} /> {b.label}
                  </span>
                  <span className="font-bold" style={{ color: c }}>
                    {b.hours} hrs
                  </span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-[3px] bg-white/[0.035]">
                  <motion.div
                    className="h-full rounded-[3px]"
                    style={{
                      background: `linear-gradient(90deg, ${c}, ${c}55)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${b.pct}%` }}
                    transition={{ duration: 1.2, delay: 0.3 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,

    // Slide 3 — Top 5
    <div key={3} className={slideBase} style={{ background: slideBg }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 60%, rgba(197,194,188,0.04), transparent 60%)" }} />
      <div className="relative z-10 w-full">
        <Flame size={22} className="mx-auto mb-2.5 text-gold" />
        <div className="mb-[22px] text-[10px] font-bold uppercase tracking-[3px] text-gold">
          Your Top 5
        </div>
        <div className="mx-auto flex max-w-[350px] flex-col gap-2">
          {data.topTitles.map((t, i) => {
            const config = MEDIA_TYPES[t.type as keyof typeof MEDIA_TYPES];
            const c = config?.color || "#999";
            const Icon = config?.icon || Film;
            return (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-center gap-2.5 rounded-[9px] border border-white/[0.025] bg-white/[0.018] px-3 py-[9px]"
              >
                <span
                  className="min-w-[30px] text-right text-[20px] font-black"
                  style={{ color: i === 0 ? "#c5c2bc" : "rgba(240,238,234,0.12)" }}
                >
                  #{i + 1}
                </span>
                <div className="h-6 w-px bg-white/[0.035]" />
                <Icon size={13} style={{ color: c }} className="flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="text-[12.5px] font-bold text-cream">{t.title}</div>
                  <div className="text-[9.5px] text-cream/35">{t.type} · {t.hours} hrs</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>,

    // Slide 4 — Genre Explorer
    <div key={4} className={slideBase} style={{ background: slideBg }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 40% 50%, rgba(160,196,168,0.06), transparent 55%)" }} />
      <div className="relative z-10">
        <Globe size={22} className="mx-auto mb-2.5 text-type-book" />
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[3px] text-type-book">
          Genre Explorer
        </div>
        <div className="text-[56px] font-black leading-none" style={{ color: "#a0c4a8" }}>
          {data.genreExplored}
        </div>
        <div className="mt-1 text-[16px] font-light text-cream">
          genres explored
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <Star size={12} className="text-gold" />
          <span className="text-[12px] text-cream/40">
            Favorite: <span className="font-bold text-cream/70">{data.topGenre}</span>
          </span>
        </div>
      </div>
    </div>,

    // Slide 5 — Streak
    <div key={5} className={slideBase} style={{ background: slideBg }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 60% 40%, rgba(212,165,116,0.06), transparent 55%)" }} />
      <div className="relative z-10">
        <Flame size={24} className="mx-auto mb-2.5 text-[#d4a574]" />
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[3px] text-[#d4a574]">
          Longest Streak
        </div>
        <div className="text-[64px] font-black leading-none" style={{ color: "#d4a574" }}>
          {data.longestStreak}
        </div>
        <div className="mt-1 text-[17px] font-light text-cream">
          days in a row
        </div>
      </div>
    </div>,

    // Slide 6 — Fastest Binge
    <div key={6} className={slideBase} style={{ background: slideBg }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, rgba(201,123,158,0.05), transparent 55%)" }} />
      <div className="relative z-10">
        <Zap size={22} className="mx-auto mb-2.5 text-type-tv" />
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[3px] text-type-tv">
          Fastest Binge
        </div>
        {data.fastestBinge ? (
          <>
            <div className="text-[20px] font-black text-cream mb-1">
              {data.fastestBinge.title}
            </div>
            <div className="text-[13px] text-cream/40">
              {data.fastestBinge.hours} hours in {data.fastestBinge.days} days
            </div>
          </>
        ) : (
          <div className="text-[13px] text-cream/40">
            Start binge-watching to unlock this!
          </div>
        )}
      </div>
    </div>,

    // Slide 7 — Best Month
    <div key={7} className={slideBase} style={{ background: slideBg }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 40%, rgba(197,194,188,0.06), transparent 55%)" }} />
      <div className="relative z-10">
        <Calendar size={22} className="mx-auto mb-2.5 text-gold" />
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[3px] text-gold">
          Peak Month
        </div>
        {data.topMonth ? (
          <>
            <div className="text-[28px] font-black text-cream">{data.topMonth.month}</div>
            <div className="mt-1 text-[14px] text-cream/40">
              {data.topMonth.hours} hours consumed
            </div>
          </>
        ) : (
          <div className="text-[13px] text-cream/40">Keep tracking to see your peak!</div>
        )}
      </div>
    </div>,

    // Slide 8 — Cross-Medium Favorite
    <div key={8} className={slideBase} style={{ background: slideBg }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 40% 60%, rgba(176,136,201,0.05), transparent 55%)" }} />
      <div className="relative z-10">
        <TrendingUp size={22} className="mx-auto mb-2.5 text-type-manga" />
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[3px] text-type-manga">
          Cross-Medium Discovery
        </div>
        {data.crossMediumFav ? (
          <>
            <Heart size={16} className="mx-auto mb-2 text-gold" />
            <div className="text-[18px] font-black text-cream mb-1">
              {data.crossMediumFav.title}
            </div>
            <div className="text-[12px] text-cream/35">
              Your best cross-medium find ({data.crossMediumFav.type})
            </div>
          </>
        ) : (
          <div className="text-[13px] text-cream/40">
            Explore more types to unlock cross-medium picks!
          </div>
        )}
      </div>
    </div>,

    // Slide 9 — Personality + Share
    <div key={9} className={slideBase} style={{ background: slideBg }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 30%, rgba(197,194,188,0.07), transparent 50%)" }} />
      <div className="relative z-10">
        <Sparkles size={24} className="mx-auto mb-2.5 text-gold" />
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[3px] text-cream/40">
          You Are
        </div>
        <div className="mb-3 text-[36px] font-black leading-tight gradient-gold">
          {data.personality}
        </div>
        <p className="mx-auto max-w-[370px] text-[12.5px] leading-[1.7] text-cream/50">
          {data.personalityDesc}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span className="flex items-center gap-1 rounded-full border border-gold/10 bg-gold/[0.07] px-[11px] py-1 text-[10.5px] text-gold">
            <Zap size={10} /> Top: {data.topGenre}
          </span>
          <span className="flex items-center gap-1 rounded-full border border-type-book/10 bg-type-book/[0.07] px-[11px] py-1 text-[10.5px] text-type-book">
            <Flame size={10} /> {data.longestStreak}-day streak
          </span>
        </div>
        {onShare && (
          <motion.button
            onClick={onShare}
            className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[12px] font-bold text-fey-black"
            style={{ background: "linear-gradient(135deg, #c5c2bc, #8b8882)" }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Share2 size={13} /> Share Your Wrapped
          </motion.button>
        )}
      </div>
    </div>,
  ];

  return (
    <div className="mx-auto max-w-[500px]">
      {/* Indicators */}
      <div className="mb-4 flex items-center justify-center gap-[4px]">
        {slides.map((_, i) => (
          <div
            key={i}
            onClick={() => setStep(i)}
            className="cursor-pointer rounded-sm transition-all duration-300"
            style={{
              width: i === step ? 22 : 4,
              height: 3,
              background: i === step ? "#c5c2bc" : "rgba(197,194,188,0.12)",
            }}
          />
        ))}
      </div>

      {/* Current slide with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {slides[step]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-3 flex justify-between">
        <motion.button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 rounded-[9px] border px-4 py-[9px] text-[11.5px] font-semibold transition-colors disabled:cursor-default"
          style={{
            background: step === 0 ? "rgba(255,255,255,0.015)" : "rgba(197,194,188,0.05)",
            borderColor: step === 0 ? "rgba(255,255,255,0.02)" : "rgba(197,194,188,0.1)",
            color: step === 0 ? "rgba(240,238,234,0.12)" : "#c5c2bc",
          }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={13} /> Previous
        </motion.button>
        <motion.button
          onClick={() => setStep(Math.min(slides.length - 1, step + 1))}
          disabled={step === slides.length - 1}
          className="flex items-center gap-1 rounded-[9px] border-none px-4 py-[9px] text-[11.5px] font-bold transition-colors disabled:cursor-default"
          style={{
            background: step === slides.length - 1 ? "rgba(255,255,255,0.015)" : "linear-gradient(135deg, #c5c2bc, #8b8882)",
            color: step === slides.length - 1 ? "rgba(240,238,234,0.12)" : "#0c0c0e",
          }}
          whileTap={{ scale: 0.95 }}
        >
          Next <ChevronRight size={13} />
        </motion.button>
      </div>
    </div>
  );
}
