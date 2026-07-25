import Link from "next/link";
import { Home, Search } from "lucide-react";
import { CatLogo } from "@/components/shared/CatLogo";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="opacity-40">
        <CatLogo size={64} />
      </div>
      <div className="mt-4 text-[11px] font-bold uppercase tracking-[4px] text-silver/40">
        404
      </div>
      <h1 className="mt-2 text-[24px] font-black text-cream">
        This shelf doesn&apos;t exist
      </h1>
      <p className="mt-2 max-w-[380px] text-[13px] leading-relaxed text-cream/40">
        Ghanima searched every corner of the lab and couldn&apos;t find that
        page. The library itself is still all here.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[12px] font-bold text-fey-black transition-transform active:scale-[0.96]"
          style={{ background: "linear-gradient(135deg, #c5c2bc, #8b8882)" }}
        >
          <Home size={13} /> Back to the lab
        </Link>
        <Link
          href="/collection"
          className="inline-flex items-center gap-2 rounded-lg border border-silver/20 px-5 py-2.5 text-[12px] font-semibold text-silver transition-colors hover:bg-silver/mist"
        >
          <Search size={13} /> Your collection
        </Link>
      </div>
    </div>
  );
}
