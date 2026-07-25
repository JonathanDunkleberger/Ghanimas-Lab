"use client";

import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";
import { CatLogo } from "@/components/shared/CatLogo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="opacity-40">
        <CatLogo size={64} />
      </div>
      <h1 className="mt-5 text-[24px] font-black text-cream">
        Ghanima knocked something off the shelf
      </h1>
      <p className="mt-2 max-w-[380px] text-[13px] leading-relaxed text-cream/40">
        Something went wrong on our end. Your library is safe — try again, or
        head back home.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[12px] font-bold text-fey-black transition-transform active:scale-[0.96]"
          style={{ background: "linear-gradient(135deg, #c5c2bc, #8b8882)" }}
        >
          <RefreshCw size={13} /> Try again
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-silver/20 px-5 py-2.5 text-[12px] font-semibold text-silver transition-colors hover:bg-silver/mist"
        >
          <Home size={13} /> Go home
        </a>
      </div>
    </div>
  );
}
