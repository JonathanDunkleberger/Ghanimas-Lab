"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { RatingSlider } from "@/components/reviews/RatingInput";
import { RoomPost } from "@/components/room/RoomPost";
import {
  buildTree,
  useCreatePost,
  useRoomPosts,
} from "@/hooks/useRoomPosts";
import type { MediaItem } from "@/stores/app-store";

const LEGACY_KEY = "feyris-reviews";

interface RabbitRoomProps {
  media: MediaItem;
}

export function RabbitRoom({ media }: RabbitRoomProps) {
  const { isSignedIn, user } = useUser();
  const { data: posts = [], isLoading, isError, error } = useRoomPosts(media.id);
  const createPost = useCreatePost(media.id);
  const migratedRef = useRef(false);

  const [composing, setComposing] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [spoilers, setSpoilers] = useState(false);

  const tree = useMemo(() => buildTree(posts), [posts]);
  const rootCount = tree.length;

  // One-time migration of localStorage reviews → real posts
  useEffect(() => {
    if (!isSignedIn || migratedRef.current || isLoading) return;
    migratedRef.current = true;

    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return;
      const map = JSON.parse(raw) as Record<
        string,
        { rating: number; text: string; user?: string }[]
      >;
      const legacy = map[media.id];
      if (!Array.isArray(legacy) || legacy.length === 0) return;

      const migrateFlag = `feyris-room-migrated:${media.id}`;
      if (localStorage.getItem(migrateFlag)) return;

      (async () => {
        for (const r of legacy) {
          if (!r.rating || r.rating < 1) continue;
          try {
            await createPost.mutateAsync({
              body: r.text || "",
              rating: r.rating,
              mediaSnapshot: {
                slug: media.slug,
                title: media.title,
                media_type: media.media_type,
                cover_image_url: media.cover_image_url,
                description: media.description,
              },
            });
          } catch {
            // skip individual failures
          }
        }
        delete map[media.id];
        localStorage.setItem(LEGACY_KEY, JSON.stringify(map));
        localStorage.setItem(migrateFlag, "1");
      })();
    } catch {
      // ignore corrupt localStorage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isLoading, media.id]);

  const submitRoot = async () => {
    if (rating < 1) return;
    await createPost.mutateAsync({
      body: body.trim(),
      rating,
      title: title.trim() || null,
      containsSpoilers: spoilers,
      mediaSnapshot: {
        slug: media.slug,
        title: media.title,
        media_type: media.media_type,
        cover_image_url: media.cover_image_url,
        description: media.description,
      },
    });
    setRating(0);
    setTitle("");
    setBody("");
    setSpoilers(false);
    setComposing(false);
  };

  return (
    <div className="border-t border-silver/10 mt-6 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-cream/80 tracking-tight">
            Rabbit Room
            {rootCount > 0 && (
              <span className="ml-2 text-xs font-normal text-cream/30">
                ({rootCount})
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-[11px] text-cream/30">
            Reviews & nested discussion for this title
          </p>
        </div>

        {isSignedIn ? (
          <button
            type="button"
            onClick={() => setComposing((c) => !c)}
            className="shrink-0 text-xs font-semibold text-silver hover:text-pearl transition-colors"
          >
            {composing ? "Cancel" : "Write a Review"}
          </button>
        ) : (
          <SignInButton mode="modal">
            <button
              type="button"
              className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-silver hover:text-pearl transition-colors"
            >
              <LogIn size={12} />
              Sign in to join
            </button>
          </SignInButton>
        )}
      </div>

      <AnimatePresence>
        {composing && isSignedIn && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="rounded-xl border border-silver/10 bg-silver/mist p-4">
              <div className="mb-3">
                <RatingSlider
                  value={rating}
                  onChange={setRating}
                  label="Your rating"
                />
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                maxLength={120}
                className="mb-2 w-full rounded-lg border border-white/[0.06] bg-transparent px-3 py-2 text-sm text-cream placeholder:text-cream/20 focus:border-silver/30 focus:outline-none"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share your thoughts…"
                maxLength={4000}
                rows={3}
                className="mb-3 w-full resize-none rounded-lg border border-white/[0.06] bg-transparent px-3 py-2.5 text-sm text-cream placeholder:text-cream/20 focus:border-silver/30 focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[11px] text-cream/40 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={spoilers}
                    onChange={(e) => setSpoilers(e.target.checked)}
                    className="rounded border-silver/30"
                  />
                  Contains spoilers
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-cream/25 hidden sm:inline">
                    Posting as{" "}
                    {(user?.unsafeMetadata as { displayName?: string })
                      ?.displayName ||
                      user?.username ||
                      user?.firstName ||
                      "you"}
                  </span>
                  <button
                    type="button"
                    disabled={rating < 1 || createPost.isPending}
                    onClick={submitRoot}
                    className="rounded-lg bg-silver-light px-4 py-1.5 text-xs font-bold text-fey-black transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {createPost.isPending ? "Posting…" : "Post Review"}
                  </button>
                </div>
              </div>
              {createPost.isError && (
                <p className="mt-2 text-[11px] text-red-400/80">
                  {(createPost.error as Error)?.message || "Failed to post"}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-8 text-cream/30">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : isError ? (
        <p className="text-sm text-center py-6 text-cream/30">
          {(error as Error)?.message?.includes("relation") ||
          (error as Error)?.message?.includes("Failed")
            ? "Rabbit Room isn’t set up yet — run supabase/rabbit_room_schema.sql in your Supabase SQL Editor."
            : "Couldn’t load the room."}
        </p>
      ) : tree.length === 0 ? (
        <p className="text-sm text-cream/25 text-center py-6">
          No discussion yet. Be the first in the Rabbit Room.
        </p>
      ) : (
        <div className="space-y-1">
          {tree.map((node) => (
            <RoomPost key={node.id} post={node} mediaId={media.id} />
          ))}
        </div>
      )}
    </div>
  );
}
