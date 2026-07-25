"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { MediaDetailPanel } from "@/components/media/MediaDetailPanel";
import { SearchResultsGrid } from "@/components/media/SearchResultsGrid";
import { useAppStore } from "@/stores/app-store";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen, searchQuery } = useAppStore();

  return (
    <div className="flex min-h-screen bg-fey-black overflow-x-hidden">
      {/* Sidebar — hidden on mobile via CSS */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main
        className="flex-1 min-w-0 transition-[margin-left] duration-300"
      >
        {/* Apply sidebar offset on desktop via inline style */}
        <style>{`
          @media (min-width: 768px) {
            .f-main-offset {
              margin-left: ${sidebarOpen ? 212 : 62}px !important;
            }
          }
        `}</style>
        <div className="f-main-offset transition-[margin-left] duration-300">
          <TopBar />
          <div className="px-4 lg:px-6 pb-24 pt-[70px] md:pb-6">
            {searchQuery ? <SearchResultsGrid /> : children}
          </div>
        </div>
      </main>

      {/* Mobile nav */}
      <MobileNav />

      {/* Detail modal */}
      <MediaDetailPanel />
    </div>
  );
}
