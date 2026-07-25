"use client";

import { motion } from "framer-motion";
import { IMPORT_PLATFORMS, type ImportPlatform } from "@/lib/constants";

interface PlatformCardProps {
  platform: ImportPlatform;
  selected?: boolean;
  onClick?: () => void;
}

export function PlatformCard({ platform, selected, onClick }: PlatformCardProps) {
  const config = IMPORT_PLATFORMS[platform];

  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-all"
      style={{
        borderColor: selected ? `${config.color}40` : "rgba(255,255,255,0.04)",
        background: selected
          ? `linear-gradient(135deg, ${config.color}10, ${config.color}05)`
          : "linear-gradient(135deg, rgba(18,18,20,0.85), rgba(12,12,14,0.92))",
        boxShadow: selected ? `0 0 20px ${config.color}10` : "none",
      }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      <span className="text-2xl">{config.icon}</span>
      <span className="text-[13px] font-bold text-cream">{config.label}</span>
      <span className="text-[10px] text-cream/25">
        {config.acceptedTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}
      </span>
    </motion.button>
  );
}
