"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useClerk, useUser } from "@clerk/nextjs";
import { Check, KeyRound, Loader2, LogOut, Trash2, X } from "lucide-react";
import { PROFILE_AVATARS, getProfileAvatar } from "./avatars";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

type ProfileMeta = { displayName?: string; avatar?: string };

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user } = useUser();
  const clerk = useClerk();

  const meta = (user?.unsafeMetadata || {}) as ProfileMeta;
  const currentName =
    meta.displayName || user?.firstName || user?.username || "";

  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Re-seed local state each time the modal opens
  useEffect(() => {
    if (open) {
      setName(currentName);
      setSaved(false);
      setConfirmDelete(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !user) return null;

  const activeAvatar = getProfileAvatar(meta.avatar) || PROFILE_AVATARS[0];
  const email = user.primaryEmailAddress?.emailAddress || "";

  const updateMeta = async (patch: ProfileMeta) => {
    await user.update({
      unsafeMetadata: { ...(user.unsafeMetadata || {}), ...patch },
    });
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) return;
    setSaving(true);
    try {
      await updateMeta({ displayName: trimmed });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async (id: string) => {
    if (id === meta.avatar) return;
    setPickingAvatar(id);
    try {
      await updateMeta({ avatar: id });
    } finally {
      setPickingAvatar(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await user.delete();
      window.location.href = "/";
    } catch (e) {
      console.error("Account deletion failed:", e);
      setDeleting(false);
    }
  };

  const rowClass =
    "flex w-full items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3.5 text-left text-sm font-semibold transition-colors hover:bg-white/[0.05]";

  return (
    <motion.div
      onClick={onClose}
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(16px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-y-auto rounded-modal border border-white/[0.06] bg-fey-surface p-6 shadow-2xl"
        style={{ maxHeight: "90vh" }}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-cream/40 transition-colors hover:bg-white/[0.06] hover:text-cream"
          aria-label="Close profile"
        >
          <X size={18} />
        </button>

        {/* Identity header */}
        <div className="mb-7 flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl"
            style={{ background: activeAvatar.bg }}
          >
            {activeAvatar.emoji}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-black tracking-tight text-cream">
              {currentName || "Explorer"}
            </h2>
            {email && (
              <p className="truncate text-sm text-cream/40">{email}</p>
            )}
          </div>
        </div>

        {/* Account */}
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gold/70">
          Account
        </p>

        {/* Avatar picker */}
        <div className="mb-4 flex items-center gap-3">
          {PROFILE_AVATARS.map((a) => {
            const active = a.id === activeAvatar.id;
            return (
              <button
                key={a.id}
                onClick={() => handlePickAvatar(a.id)}
                title={a.label}
                aria-label={`Use ${a.label} avatar`}
                className="relative flex h-11 w-11 items-center justify-center rounded-full text-xl transition-transform hover:scale-110"
                style={{
                  background: a.bg,
                  boxShadow: active ? "0 0 0 2px #f0eeea" : undefined,
                  opacity: pickingAvatar && pickingAvatar !== a.id ? 0.5 : 1,
                }}
              >
                {pickingAvatar === a.id ? (
                  <Loader2 size={16} className="animate-spin text-cream" />
                ) : (
                  a.emoji
                )}
              </button>
            );
          })}
          <span className="ml-1 text-sm text-cream/35">Pick an icon</span>
        </div>

        {/* Display name */}
        <div className="mb-5 flex items-center gap-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            maxLength={40}
            placeholder="What should we call you?"
            className="min-w-0 flex-1 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-silver/40"
          />
          <button
            onClick={handleSaveName}
            disabled={saving || !name.trim() || name.trim() === currentName}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-sm font-bold text-cream transition-colors hover:bg-white/[0.08] disabled:opacity-40"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <Check size={14} className="text-eye" />
            ) : null}
            {saved ? "Saved" : "Save"}
          </button>
        </div>

        {/* Account actions */}
        <div className="space-y-2.5">
          <button
            onClick={() => {
              onClose();
              clerk.openUserProfile();
            }}
            className={`${rowClass} text-cream/80`}
          >
            <KeyRound size={16} className="text-cream/40" />
            Email &amp; password
          </button>

          <button
            onClick={() => clerk.signOut({ redirectUrl: "/" })}
            className={`${rowClass} text-cream/60`}
          >
            <LogOut size={16} className="text-cream/35" />
            Sign Out
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className={`${rowClass} text-cream/45 hover:text-blush`}
            >
              <Trash2 size={16} className="text-cream/30" />
              Delete Account
            </button>
          ) : (
            <div className="rounded-xl border border-blush/25 bg-blush/[0.06] p-4">
              <p className="mb-3 text-sm text-cream/70">
                This permanently deletes your account and everything tied to
                it. There&apos;s no undo.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 rounded-lg bg-blush/80 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-blush disabled:opacity-50"
                >
                  {deleting && <Loader2 size={12} className="animate-spin" />}
                  Yes, delete my account
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-white/[0.08] px-3.5 py-2 text-xs font-semibold text-cream/60 transition-colors hover:text-cream"
                >
                  Keep it
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
