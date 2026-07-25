"use client";

import {
  User,
  Bell,
  Link,
  Moon,
  Shield,
  Download,
  ChevronRight,
  Gamepad2,
  Tv,
  BookOpen,
  Film,
  Upload,
} from "lucide-react";

const SETTINGS_ITEMS = [
  { label: "Profile", icon: User },
  { label: "Notifications", icon: Bell },
  { label: "Connected Services", icon: Link },
  { label: "Appearance", icon: Moon },
  { label: "Privacy", icon: Shield },
  { label: "Export Data", icon: Download },
];

const IMPORT_SOURCES = [
  { name: "Steam", icon: Gamepad2, color: "#1b2838" },
  { name: "MyAnimeList", icon: Tv, color: "#2e51a2" },
  { name: "AniList", icon: Tv, color: "#3db4f2" },
  { name: "Goodreads", icon: BookOpen, color: "#553b08" },
  { name: "Letterboxd", icon: Film, color: "#00c030" },
  { name: "IMDb", icon: Film, color: "#f5c518" },
];

export default function SettingsPage() {
  return (
    <div className="animate-fadeIn pt-3.5">
      <h1 className="mb-[18px] text-2xl font-extrabold tracking-tight text-cream">
        Settings
      </h1>
      <div
        className="max-w-[460px] rounded-xl border border-white/[0.025] p-[18px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(18,18,20,0.85), rgba(12,12,14,0.92))",
        }}
      >
        {SETTINGS_ITEMS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex cursor-pointer items-center gap-2.5 py-3 transition-colors hover:text-cream"
              style={{
                borderBottom:
                  i < SETTINGS_ITEMS.length - 1
                    ? "1px solid rgba(255,255,255,0.025)"
                    : "none",
              }}
            >
              <Icon size={15} className="text-cream/25" />
              <span className="flex-1 text-[12.5px] font-medium text-cream">
                {s.label}
              </span>
              <ChevronRight size={14} className="text-cream/15" />
            </div>
          );
        })}
      </div>

      {/* Import Your Library */}
      <div className="mt-8">
        <div className="mb-1 flex items-center gap-2">
          <Upload size={18} className="text-gold" />
          <h2 className="text-lg font-bold tracking-tight text-cream">
            Import Your Library
          </h2>
        </div>
        <p className="mb-4 text-[12px] text-cream/30">
          Connect your accounts to import your existing ratings and watch history.
        </p>

        <div className="grid max-w-[460px] grid-cols-2 gap-2.5 sm:grid-cols-3">
          {IMPORT_SOURCES.map((src) => {
            const Icon = src.icon;
            return (
              <button
                key={src.name}
                disabled
                className="group flex items-center gap-2.5 rounded-lg border border-white/[0.04] px-3.5 py-3 opacity-60 transition-all"
                style={{
                  background: "rgba(18,18,20,0.7)",
                }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md"
                  style={{ background: src.color }}
                >
                  <Icon size={15} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="text-[12px] font-semibold text-cream/70">
                    {src.name}
                  </div>
                  <div className="text-[10px] text-cream/25">Connect account</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
