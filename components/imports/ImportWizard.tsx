"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ArrowRight, ArrowLeft, Upload, Sparkles } from "lucide-react";
import { IMPORT_PLATFORMS, type ImportPlatform } from "@/lib/constants";
import { PlatformCard } from "./PlatformCard";
import { CSVUploader } from "./CSVUploader";
import {
  parseGoodreadsCSV,
  parseLetterboxdCSV,
  parseMALCSV,
  parseSteamCSV,
  parseIMDbCSV,
} from "@/lib/imports/parsers";
import { useToast } from "@/components/shared/Toast";

interface ImportWizardProps {
  onComplete?: (items: ParsedItem[]) => void;
  onClose?: () => void;
}

interface ParsedItem {
  source_title: string;
  source_rating?: number;
  source_status?: string;
  media_type: string;
  confirmed: boolean;
}

const STEPS = ["Select Platform", "Upload File", "Review & Confirm"];

export function ImportWizard({ onComplete, onClose }: ImportWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<ImportPlatform | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);

  const handleFileLoaded = (content: string) => {
    if (!platform) return;

    let items: any[] = [];
    try {
      switch (platform) {
        case "goodreads":
          items = parseGoodreadsCSV(content);
          break;
        case "myanimelist":
          items = parseMALCSV(content);
          break;
        case "letterboxd":
          items = parseLetterboxdCSV(content);
          break;
        case "steam":
          items = parseSteamCSV(content);
          break;
        case "imdb":
          items = parseIMDbCSV(content);
          break;
      }
    } catch {
      toast("Failed to parse file", "error");
      return;
    }

    if (items.length === 0) {
      toast("No items found in file", "error");
      return;
    }

    setParsedItems(items.map((i) => ({ ...i, confirmed: true })));
    toast(`Found ${items.length} items`, "success");
    setStep(2);
  };

  const toggleItem = (idx: number) => {
    setParsedItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, confirmed: !item.confirmed } : item
      )
    );
  };

  const handleConfirm = () => {
    const confirmed = parsedItems.filter((i) => i.confirmed);
    onComplete?.(confirmed);
    toast(`Imported ${confirmed.length} items!`, "success");
  };

  const confirmedCount = parsedItems.filter((i) => i.confirmed).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl border border-gold/[0.08] overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(24,24,27,0.98), rgba(18,18,20,0.99))",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
        <div className="flex items-center gap-2">
          <Upload size={16} className="text-gold" />
          <h2 className="text-[16px] font-bold text-cream">Import Library</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-cream/25 hover:text-cream/50">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-0 px-5 pt-4 pb-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
                style={{
                  background: i <= step ? "rgba(197,194,188,0.15)" : "rgba(255,255,255,0.04)",
                  color: i <= step ? "#c5c2bc" : "rgba(240,238,234,0.25)",
                  border: i === step ? "1px solid rgba(197,194,188,0.3)" : "1px solid transparent",
                }}
              >
                {i < step ? <Check size={10} /> : i + 1}
              </div>
              <span
                className="text-[10.5px] font-medium"
                style={{ color: i <= step ? "#c5c2bc" : "rgba(240,238,234,0.2)" }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="mx-3 h-px w-8"
                style={{
                  background: i < step ? "rgba(197,194,188,0.3)" : "rgba(255,255,255,0.04)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <p className="mb-4 text-[12px] text-cream/35">
                Select the platform you want to import from:
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(Object.keys(IMPORT_PLATFORMS) as ImportPlatform[]).map((p) => (
                  <PlatformCard
                    key={p}
                    platform={p}
                    selected={platform === p}
                    onClick={() => setPlatform(p)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && platform && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <CSVUploader platform={platform} onFileLoaded={handleFileLoaded} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] text-cream/40">
                  {confirmedCount} of {parsedItems.length} items selected
                </span>
                <button
                  onClick={() =>
                    setParsedItems((prev) =>
                      prev.map((i) => ({ ...i, confirmed: !prev.every((x) => x.confirmed) }))
                    )
                  }
                  className="text-[10.5px] font-medium text-gold"
                >
                  {parsedItems.every((i) => i.confirmed) ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="max-h-[300px] space-y-1 overflow-y-auto scrollbar-hide">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleItem(idx)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.02]"
                  >
                    <div
                      className="flex h-4 w-4 items-center justify-center rounded border"
                      style={{
                        borderColor: item.confirmed ? "#c5c2bc" : "rgba(255,255,255,0.08)",
                        background: item.confirmed ? "rgba(197,194,188,0.15)" : "transparent",
                      }}
                    >
                      {item.confirmed && <Check size={9} className="text-gold" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[12px] font-medium text-cream/70">
                        {item.source_title}
                      </div>
                    </div>
                    {item.source_rating != null && item.source_rating > 0 && (
                      <span className="text-[10px] font-bold text-gold">
                        {item.source_rating}/10
                      </span>
                    )}
                    <span className="text-[9px] text-cream/20 uppercase">
                      {item.source_status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/[0.04] px-5 py-3">
        <motion.button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 text-[12px] font-medium text-cream/30 disabled:opacity-30"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={13} /> Back
        </motion.button>

        {step < 2 ? (
          <motion.button
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && !platform}
            className="flex items-center gap-1 rounded-lg px-4 py-2 text-[12px] font-bold text-fey-black disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #c5c2bc, #8b8882)" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Next <ArrowRight size={13} />
          </motion.button>
        ) : (
          <motion.button
            onClick={handleConfirm}
            disabled={confirmedCount === 0}
            className="flex items-center gap-1 rounded-lg px-4 py-2 text-[12px] font-bold text-fey-black disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #c5c2bc, #8b8882)" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Sparkles size={13} /> Import {confirmedCount} Items
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
