"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  useCreatePost,
  useDeletePost,
  useVotePost,
  type RoomPostNode,
} from "@/hooks/useRoomPosts";

function displayName(post: RoomPostNode) {
  return (
    post.profile?.display_name ||
    post.profile?.username ||
    "Member"
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface RoomPostProps {
  post: RoomPostNode;
  mediaId: string;
  depth?: number;
}

export function RoomPost({ post, mediaId, depth = 0 }: RoomPostProps) {
  const { userId } = useAuth();
  const { isSignedIn } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [spoilersRevealed, setSpoilersRevealed] = useState(false);
  const createPost = useCreatePost(mediaId);
  const votePost = useVotePost(mediaId);
  const deletePost = useDeletePost(mediaId);

  const isOwner = userId === post.user_id;
  const hasChildren = post.children.length > 0;
  const indent = Math.min(depth, 6) * 14;

  const submitReply = async () => {
    if (!replyText.trim()) return;
    await createPost.mutateAsync({
      parentId: post.id,
      body: replyText.trim(),
    });
    setReplyText("");
    setReplying(false);
  };

  return (
    <div style={{ marginLeft: indent }} className="relative">
      {depth > 0 && (
        <div
          className="absolute -left-3 top-0 bottom-0 w-px bg-silver/15"
          aria-hidden
        />
      )}

      <div className="rounded-xl border border-white/[0.03] bg-white/[0.015] p-3.5 mb-2.5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren && (
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="shrink-0 text-cream/25 hover:text-cream/50"
                aria-label={collapsed ? "Expand thread" : "Collapse thread"}
              >
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            {post.profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.profile.avatar_url}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-silver/15 text-[10px] font-bold text-silver">
                {displayName(post).charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate text-xs font-semibold text-cream/70">
              {displayName(post)}
            </span>
            <span className="shrink-0 text-[10px] text-cream/25">
              {timeAgo(post.created_at)}
            </span>
          </div>

          {post.rating != null && !post.is_deleted && (
            <div className="flex shrink-0 items-center gap-1">
              <Star size={11} className="fill-gold text-gold" />
              <span className="text-xs font-bold text-gold">{post.rating}</span>
            </div>
          )}
        </div>

        {!post.is_deleted && post.title && (
          <h4 className="mb-1 text-sm font-semibold text-cream/80">{post.title}</h4>
        )}

        {post.is_deleted ? (
          <p className="text-sm italic text-cream/25">[deleted]</p>
        ) : post.contains_spoilers && !spoilersRevealed ? (
          <button
            type="button"
            onClick={() => setSpoilersRevealed(true)}
            className="w-full rounded-lg border border-blush/20 bg-blush/muted px-3 py-2 text-left text-xs text-blush hover:bg-blush/soft transition-colors"
          >
            Contains spoilers — click to reveal
          </button>
        ) : (
          post.body && (
            <p className="text-sm leading-relaxed text-cream/55 whitespace-pre-wrap">
              {post.body}
            </p>
          )
        )}

        {!post.is_deleted && (
          <div className="mt-2.5 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!isSignedIn || votePost.isPending}
                onClick={() => votePost.mutate({ postId: post.id, value: 1 })}
                className={`p-0.5 transition-colors ${
                  post.myVote === 1
                    ? "text-gold"
                    : "text-cream/25 hover:text-cream/50"
                } disabled:opacity-40`}
                aria-label="Upvote"
              >
                <ThumbsUp size={12} />
              </button>
              <span
                className={`min-w-[1.25rem] text-center text-[11px] font-semibold tabular-nums ${
                  post.score > 0
                    ? "text-gold"
                    : post.score < 0
                      ? "text-blush"
                      : "text-cream/30"
                }`}
              >
                {post.score}
              </span>
              <button
                type="button"
                disabled={!isSignedIn || votePost.isPending}
                onClick={() => votePost.mutate({ postId: post.id, value: -1 })}
                className={`p-0.5 transition-colors ${
                  post.myVote === -1
                    ? "text-blush"
                    : "text-cream/25 hover:text-cream/50"
                } disabled:opacity-40`}
                aria-label="Downvote"
              >
                <ThumbsDown size={12} />
              </button>
            </div>

            {isSignedIn && (
              <button
                type="button"
                onClick={() => setReplying((r) => !r)}
                className="flex items-center gap-1 text-[11px] font-medium text-cream/35 hover:text-silver transition-colors"
              >
                <MessageSquare size={11} />
                Reply
              </button>
            )}

            {isOwner && (
              <button
                type="button"
                disabled={deletePost.isPending}
                onClick={() => {
                  if (confirm("Delete this post?")) deletePost.mutate(post.id);
                }}
                className="flex items-center gap-1 text-[11px] font-medium text-cream/25 hover:text-red-400/80 transition-colors ml-auto"
              >
                <Trash2 size={11} />
                Delete
              </button>
            )}
          </div>
        )}

        {replying && (
          <div className="mt-3 space-y-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
              maxLength={4000}
              className="w-full resize-none rounded-lg border border-silver/15 bg-transparent px-3 py-2 text-sm text-cream placeholder:text-cream/20 focus:border-silver/30 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplying(false)}
                className="px-3 py-1.5 text-xs text-cream/40 hover:text-cream/60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!replyText.trim() || createPost.isPending}
                onClick={submitReply}
                className="rounded-lg bg-silver px-3.5 py-1.5 text-xs font-bold text-fey-black transition-all hover:brightness-110 disabled:opacity-30"
              >
                {createPost.isPending ? "Posting…" : "Reply"}
              </button>
            </div>
          </div>
        )}
      </div>

      {!collapsed &&
        post.children.map((child) => (
          <RoomPost
            key={child.id}
            post={child}
            mediaId={mediaId}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}
