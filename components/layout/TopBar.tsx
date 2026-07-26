"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { SearchBar } from "./SearchBar";
import { CatLogo } from "@/components/shared/CatLogo";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { getProfileAvatar, PROFILE_AVATARS } from "@/components/profile/avatars";
import { useAppStore } from "@/stores/app-store";

export function TopBar() {
  const { isSignedIn, user } = useUser();
  const { sidebarOpen } = useAppStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const avatar =
    getProfileAvatar(
      (user?.unsafeMetadata as { avatar?: string } | undefined)?.avatar
    ) || PROFILE_AVATARS[0];

  return (
    <>
    <header
      className="f-topbar fixed top-0 right-0 z-50 flex h-[4.25rem] md:h-[4.75rem] items-center gap-3 border-b border-silver/10 px-3 lg:px-5 transition-all duration-300"
      style={{
        background:
          "linear-gradient(90deg, rgba(18,18,20,0.97), rgba(12,12,14,0.99))",
        backdropFilter: "blur(16px)",
      }}
    >
      <style>{`
        .f-topbar { left: 0 !important; }
        @media (min-width: 768px) {
          .f-topbar { left: ${sidebarOpen ? 212 : 62}px !important; }
        }
      `}</style>
      <div className="flex shrink-0 items-center gap-2 md:hidden">
        <CatLogo size={24} />
        <span className="text-[15px] font-black tracking-tight gradient-silver">
          Ghanima&apos;s Lab
        </span>
      </div>

      <div className="flex min-w-0 flex-1 justify-center">
        <div className="w-full max-w-4xl">
          <SearchBar />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!isSignedIn ? (
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <button className="px-3.5 py-1.5 text-[12.5px] font-semibold text-cream/60 hover:text-cream transition-colors">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                className="rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold text-fey-black transition-all hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #f0eeea, #c5c2bc)",
                }}
              >
                Sign Up
              </button>
            </SignUpButton>
          </div>
        ) : (
          <button
            onClick={() => setProfileOpen(true)}
            aria-label="Open profile"
            className="flex h-8 w-8 items-center justify-center rounded-full text-base transition-transform hover:scale-110"
            style={{ background: avatar.bg }}
          >
            {avatar.emoji}
          </button>
        )}
      </div>
    </header>

    {/* Outside <header>: its backdrop-filter would otherwise trap this
        fixed-position overlay inside the bar */}
    <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
