"use client";

import { SafeImage } from "@/components/shared/SafeImage";
import { ExternalLink, Tv, ShoppingCart, Download } from "lucide-react";

interface WatchProvider {
  provider: string;
  logo_url?: string;
  url?: string;
  type: "stream" | "rent" | "buy";
}

interface WhereToWatchProps {
  providers: WatchProvider[];
}

const TYPE_CONFIG = {
  stream: { label: "Stream", icon: Tv, color: "#5cb85c" },
  rent: { label: "Rent", icon: Download, color: "#c5c2bc" },
  buy: { label: "Buy", icon: ShoppingCart, color: "#7b9ec9" },
};

export function WhereToWatch({ providers }: WhereToWatchProps) {
  if (!providers || providers.length === 0) return null;

  const grouped = providers.reduce(
    (acc, p) => {
      if (!acc[p.type]) acc[p.type] = [];
      acc[p.type].push(p);
      return acc;
    },
    {} as Record<string, WatchProvider[]>
  );

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-[14px] font-bold text-cream">Where to Watch</h3>
      <div className="space-y-3">
        {(["stream", "rent", "buy"] as const).map((type) => {
          const items = grouped[type];
          if (!items || items.length === 0) return null;
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          return (
            <div key={type}>
              <div className="mb-1.5 flex items-center gap-1.5">
                <Icon size={11} style={{ color: cfg.color }} />
                <span className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((p) => (
                  <a
                    key={p.provider}
                    href={p.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-white/[0.04] bg-fey-surface px-3 py-2 text-[11px] font-medium text-cream/70 transition-all hover:border-gold/10 hover:bg-fey-elevated hover:text-cream"
                  >
                    {p.logo_url && (
                      <SafeImage
                        src={p.logo_url}
                        alt={p.provider}
                        width={18}
                        height={18}
                        className="rounded"
                        fallback={null}
                      />
                    )}
                    {p.provider}
                    <ExternalLink size={10} className="text-cream/20" />
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
