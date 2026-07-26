import { currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "./server";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

/** Lazily upsert a profiles row from the signed-in Clerk user. */
export async function ensureProfile(userId: string): Promise<Profile | null> {
  const supabase = createServerClient();
  const clerkUser = await currentUser();

  if (!clerkUser || clerkUser.id !== userId) {
    // Fall back to whatever we already have
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    return data;
  }

  const username =
    clerkUser.username ||
    clerkUser.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    null;
  // Profile modal choices live in unsafeMetadata and win over Clerk defaults
  const meta = (clerkUser.unsafeMetadata || {}) as {
    displayName?: string;
    avatar?: string;
  };
  const displayName =
    meta.displayName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    username;
  const avatarUrl = meta.avatar
    ? `emoji:${meta.avatar}`
    : clerkUser.imageUrl || null;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        username,
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("id, username, display_name, avatar_url")
    .single();

  if (error) {
    console.error("ensureProfile error:", error);
    return null;
  }
  return data;
}
