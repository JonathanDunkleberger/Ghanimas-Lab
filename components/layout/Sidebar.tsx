"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { CatLogo } from "@/components/shared/CatLogo";
import { NAV_ITEMS, BROWSE_NAV_ITEMS } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <nav
      className="f-sidebar fixed left-0 top-0 z-[100] flex min-h-screen flex-col border-r border-silver/10 transition-all duration-300"
      style={{
        width: sidebarOpen ? 212 : 62,
        background:
          "linear-gradient(180deg, rgba(18,18,20,0.99), rgba(12,12,14,1))",
      }}
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 px-3.5 py-4 mb-2"
      >
        <CatLogo size={sidebarOpen ? 30 : 26} />
        {sidebarOpen && (
          <span className="text-[15px] font-black tracking-tight text-pearl leading-tight">
            Ghanima&apos;s Lab
          </span>
        )}
      </Link>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md border border-silver/15 text-cream/30 transition-colors hover:text-cream/60"
        style={{ background: "rgba(18,18,20,0.99)" }}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <PanelLeftClose size={13} /> : <PanelLeft size={13} />}
      </button>

      <div className="flex flex-1 flex-col gap-0.5 px-2">
        {sidebarOpen && (
          <div className="px-2.5 pb-1.5 text-[8.5px] font-bold uppercase tracking-[2px] text-cream/[0.17]">
            Menu
          </div>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex items-center gap-2.5 rounded-lg border-none transition-all duration-200 ${
                sidebarOpen ? "justify-start px-3 py-2.5" : "justify-center py-2.5"
              }`}
              style={{
                background: isActive
                  ? "rgba(197,194,188,0.1)"
                  : "transparent",
                color: isActive ? "#f0eeea" : "rgba(240,238,234,0.35)",
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {isActive && (
                <div className="absolute -left-2 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded bg-silver" />
              )}
              <Icon
                size={17}
                strokeWidth={isActive ? 2.2 : 1.5}
              />
              {sidebarOpen && item.label}
            </Link>
          );
        })}

        {sidebarOpen && (
          <div className="px-2.5 pb-1.5 pt-4 text-[8.5px] font-bold uppercase tracking-[2px] text-cream/[0.17]">
            Library
          </div>
        )}
        {!sidebarOpen && <div className="my-2 h-px bg-white/[0.05]" />}
        {BROWSE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex items-center gap-2.5 rounded-lg border-none transition-all duration-200 ${
                sidebarOpen ? "justify-start px-3 py-2.5" : "justify-center py-2.5"
              }`}
              style={{
                background: isActive
                  ? "rgba(197,194,188,0.1)"
                  : "transparent",
                color: isActive ? "#f0eeea" : "rgba(240,238,234,0.35)",
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {isActive && (
                <div className="absolute -left-2 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded bg-silver" />
              )}
              <Icon
                size={17}
                strokeWidth={isActive ? 2.2 : 1.5}
              />
              {sidebarOpen && item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
