/**
 * Netflix-style profile avatars: five emoji on muted circles pulled from the
 * site palette. The chosen id is stored in Clerk unsafeMetadata.avatar and
 * mirrored into Supabase profiles.avatar_url as "emoji:<id>" so Rabbit Room
 * posts render the same identity.
 */
export interface ProfileAvatar {
  id: string;
  emoji: string;
  bg: string;
  label: string;
}

export const PROFILE_AVATARS: ProfileAvatar[] = [
  { id: "cat", emoji: "🐱", bg: "#a66b6b", label: "Cat" },
  { id: "fox", emoji: "🦊", bg: "#b0854f", label: "Fox" },
  { id: "rabbit", emoji: "🐰", bg: "#5f7a9d", label: "Rabbit" },
  { id: "owl", emoji: "🦉", bg: "#6f8f86", label: "Owl" },
  { id: "dragon", emoji: "🐉", bg: "#7d6b9d", label: "Dragon" },
];

export function getProfileAvatar(id?: string | null): ProfileAvatar | undefined {
  if (!id) return undefined;
  return PROFILE_AVATARS.find((a) => a.id === id);
}

const EMOJI_URL_PREFIX = "emoji:";

export function emojiAvatarUrl(id: string): string {
  return `${EMOJI_URL_PREFIX}${id}`;
}

/** Resolve an "emoji:<id>" avatar_url back to its avatar definition. */
export function parseEmojiAvatar(
  url?: string | null
): ProfileAvatar | undefined {
  if (!url?.startsWith(EMOJI_URL_PREFIX)) return undefined;
  return getProfileAvatar(url.slice(EMOJI_URL_PREFIX.length));
}
