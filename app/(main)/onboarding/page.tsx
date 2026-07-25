"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Search,
  Heart,
  Upload,
  Sparkles,
  X,
} from "lucide-react";
import { MEDIA_TYPES, type MediaType } from "@/lib/constants";
import { CatLogo } from "@/components/shared/CatLogo";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { useMediaStore } from "@/stores/media-store";
import type { MediaItem } from "@/stores/app-store";

const STEPS = [
  { title: "Pick Your Types", desc: "What kind of media do you enjoy?" },
  { title: "Import Data", desc: "Bring in your history from other platforms" },
  { title: "Seed Favorites", desc: "Search & pick a few titles you love" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0 — media types
  const [selectedTypes, setSelectedTypes] = useState<Set<MediaType>>(new Set());

  // Step 2 — seed favorites
  const [seedQuery, setSeedQuery] = useState("");
  const [seedResults, setSeedResults] = useState<MediaItem[]>([]);
  const [seedFavorites, setSeedFavorites] = useState<MediaItem[]>([]);
  const [searching, setSearching] = useState(false);

  const toggleType = useCallback((t: MediaType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);

  const handleSeedSearch = useCallback(async () => {
    if (!seedQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/search-all?q=${encodeURIComponent(seedQuery.trim())}&limit=12`
      );
      if (res.ok) {
        const data = await res.json();
        setSeedResults(data.results || data || []);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, [seedQuery]);

  const toggleSeedFavorite = useCallback((item: MediaItem) => {
    setSeedFavorites((prev) => {
      const exists = prev.find((f) => f.id === item.id);
      if (exists) return prev.filter((f) => f.id !== item.id);
      return [...prev, item];
    });
  }, []);

  const isFavorited = useCallback(
    (id: string) => seedFavorites.some((f) => f.id === id),
    [seedFavorites]
  );

  const canProceed = useMemo(() => {
    if (step === 0) return selectedTypes.size > 0;
    return true; // steps 1 & 2 are optional
  }, [step, selectedTypes]);

  const handleFinish = useCallback(() => {
    // Persist seed favorites into the local library so the collection,
    // For You, and Wrapped all start with real signal.
    const store = useMediaStore.getState();
    for (const item of seedFavorites) {
      if (!store.isFavorite(item.id)) {
        store.toggleFavorite(item.id, item);
      }
    }
    router.push("/");
  }, [router, seedFavorites]);

  return (
    <div className="animate-fadeIn mx-auto max-w-[640px] py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <CatLogo size={42} />
        <h1 className="mt-2 text-3xl font-black gradient-gold">
          Welcome to Ghanima&apos;s Lab
        </h1>
        <p className="mt-1 text-[13px] text-cream/35">
          Let&apos;s set up your entertainment profile
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <motion.div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
              animate={{
                background:
                  i < step
                    ? "linear-gradient(135deg, #5cb85c, #449d44)"
                    : i === step
                    ? "linear-gradient(135deg, #c5c2bc, #8b8882)"
                    : "rgba(255,255,255,0.04)",
                color: i <= step ? "#0c0c0e" : "rgba(240,238,234,0.3)",
              }}
            >
              {i < step ? <Check size={12} /> : i + 1}
            </motion.div>
            {i < STEPS.length - 1 && (
              <div
                className="h-px w-8"
                style={{
                  background:
                    i < step ? "#5cb85c" : "rgba(255,255,255,0.06)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step title */}
      <div className="mb-5 text-center">
        <h2 className="text-lg font-bold text-cream">{STEPS[step].title}</h2>
        <p className="text-[12px] text-cream/35">{STEPS[step].desc}</p>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 0: Media type selection */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.entries(MEDIA_TYPES) as [MediaType, (typeof MEDIA_TYPES)[MediaType]][]).map(
                ([type, config]) => {
                  const selected = selectedTypes.has(type);
                  const Icon = config.icon;
                  return (
                    <motion.button
                      key={type}
                      onClick={() => toggleType(type)}
                      className="relative flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors"
                      style={{
                        borderColor: selected
                          ? config.color
                          : "rgba(255,255,255,0.04)",
                        background: selected
                          ? `${config.bg}`
                          : "rgba(255,255,255,0.015)",
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {selected && (
                        <div
                          className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full"
                          style={{ background: config.color }}
                        >
                          <Check size={10} className="text-fey-black" />
                        </div>
                      )}
                      <Icon
                        size={28}
                        style={{
                          color: selected
                            ? config.color
                            : "rgba(240,238,234,0.25)",
                        }}
                      />
                      <span
                        className="text-[13px] font-semibold"
                        style={{
                          color: selected
                            ? config.color
                            : "rgba(240,238,234,0.5)",
                        }}
                      >
                        {config.label}
                      </span>
                    </motion.button>
                  );
                }
              )}
            </div>
          )}

          {/* Step 1: Import */}
          {step === 1 && (
            <div>
              <ImportWizard
                onComplete={() => {
                  // auto-advance after import
                }}
              />
              <p className="mt-4 text-center text-[11px] text-cream/25">
                You can skip this step and import later from Settings.
              </p>
            </div>
          )}

          {/* Step 2: Seed favorites */}
          {step === 2 && (
            <div>
              {/* Search bar */}
              <div className="relative mb-4">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/25"
                />
                <input
                  value={seedQuery}
                  onChange={(e) => setSeedQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSeedSearch()}
                  placeholder="Search for titles you love..."
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2.5 pl-9 pr-3 text-[13px] text-cream placeholder:text-cream/20 focus:border-gold/30 focus:outline-none"
                />
              </div>

              {/* Seed favorites chips */}
              {seedFavorites.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {seedFavorites.map((item) => {
                    const config =
                      MEDIA_TYPES[item.media_type as MediaType];
                    return (
                      <motion.span
                        key={item.id}
                        layout
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          borderColor: config?.border || "rgba(255,255,255,0.1)",
                          background: config?.bg || "rgba(255,255,255,0.04)",
                          color: config?.color || "#f0eeea",
                        }}
                      >
                        <Heart size={9} className="fill-current" />
                        {item.title}
                        <button
                          onClick={() => toggleSeedFavorite(item)}
                          className="ml-0.5 rounded-full p-[1px] hover:bg-white/10"
                        >
                          <X size={9} />
                        </button>
                      </motion.span>
                    );
                  })}
                </div>
              )}

              {/* Results */}
              {searching && (
                <p className="py-6 text-center text-[12px] text-cream/30">
                  Searching...
                </p>
              )}
              {!searching && seedResults.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {seedResults.map((item) => {
                    const fav = isFavorited(item.id);
                    const config =
                      MEDIA_TYPES[item.media_type as MediaType];
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => toggleSeedFavorite(item)}
                        className="relative overflow-hidden rounded-lg border p-3 text-left transition-colors"
                        style={{
                          borderColor: fav
                            ? config?.color || "#c5c2bc"
                            : "rgba(255,255,255,0.04)",
                          background: fav
                            ? config?.bg || "rgba(197,194,188,0.08)"
                            : "rgba(255,255,255,0.015)",
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {fav && (
                          <div className="absolute right-1.5 top-1.5">
                            <Heart
                              size={12}
                              className="fill-current"
                              style={{ color: config?.color || "#c5c2bc" }}
                            />
                          </div>
                        )}
                        <div
                          className="mb-1.5 text-[12px] font-bold text-cream line-clamp-1"
                        >
                          {item.title}
                        </div>
                        <div className="text-[10px] text-cream/30">
                          {config?.label || item.media_type}
                          {item.year ? ` · ${item.year}` : ""}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
              {!searching && seedResults.length === 0 && (
                <p className="py-8 text-center text-[12px] text-cream/25">
                  Search for titles to add to your favorites.
                  <br />
                  <span className="text-cream/15">This step is optional.</span>
                </p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <div>
          {step > 0 ? (
            <motion.button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-[12px] font-semibold text-cream/50"
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft size={13} /> Back
            </motion.button>
          ) : (
            <div />
          )}
        </div>
        <div className="flex items-center gap-2">
          {step < STEPS.length - 1 && step > 0 && (
            <button
              onClick={() => setStep(step + 1)}
              className="text-[11px] text-cream/25 hover:text-cream/40"
            >
              Skip
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <motion.button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="flex items-center gap-1 rounded-lg px-5 py-2 text-[12px] font-bold text-fey-black disabled:opacity-30"
              style={{
                background: canProceed
                  ? "linear-gradient(135deg, #c5c2bc, #8b8882)"
                  : "rgba(255,255,255,0.06)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              Next <ChevronRight size={13} />
            </motion.button>
          ) : (
            <motion.button
              onClick={handleFinish}
              className="flex items-center gap-1.5 rounded-lg px-6 py-2.5 text-[12px] font-bold text-fey-black"
              style={{
                background: "linear-gradient(135deg, #c5c2bc, #8b8882)",
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles size={13} /> Start Exploring
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
