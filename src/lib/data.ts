import "server-only";
import type { requireAdmin } from "@/lib/admin";

type SupabaseClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export type Profile = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  screen_name: string | null;
  profpic: string | null;
  is_superadmin: boolean;
};

export type Crack = {
  id: number;
  created_at: string;
  img_url: string | null;
  text: string | null;
  creator_id: string | null;
};

export type Like = {
  crack_id: number;
  liker: string;
  liked_at: string;
};

export type CaptionOption = { caption: string; style: string | null };

export type CaptionRequest = {
  id: number;
  user_id: string;
  created_at: string;
  direction: string | null;
  // Older rows stored plain strings before captions carried a style.
  options: (CaptionOption | string)[] | null;
  chosen_index: number | null;
  crack_id: number | null;
};

export type Traits = {
  crack_id: number;
  styles: string[];
  topics: string[];
  // Set when an admin edited the tags by hand.
  edited_by: string | null;
};

function check<T>(result: { data: T[] | null; error: { message: string } | null }, what: string) {
  if (result.error) {
    throw new Error(`Couldn't load ${what}: ${result.error.message}`);
  }
  return result.data ?? [];
}

// Everything the admin pages read. The board is small, so each page loads
// whole tables and works with them in memory. Admin-only rows (all
// profiles, all caption requests) come through the admin RLS policies.
export async function loadAll(supabase: SupabaseClient) {
  const [profiles, cracks, likes, captionRequests, traits] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, created_at, first_name, last_name, screen_name, profpic, is_superadmin")
      .order("created_at", { ascending: false }),
    supabase
      .from("cracks")
      .select("id, created_at, img_url, text, creator_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("likes")
      .select("crack_id, liker, liked_at")
      .order("liked_at", { ascending: false }),
    supabase
      .from("caption_requests")
      .select("id, user_id, created_at, direction, options, chosen_index, crack_id")
      .order("created_at", { ascending: false }),
    supabase.from("crack_traits").select("crack_id, styles, topics, edited_by"),
  ]);

  return {
    profiles: check<Profile>(profiles, "profiles"),
    cracks: check<Crack>(cracks, "cracks"),
    likes: check<Like>(likes, "likes"),
    captionRequests: check<CaptionRequest>(captionRequests, "caption requests"),
    traits: check<Traits>(traits, "crack traits"),
  };
}

export type AllData = Awaited<ReturnType<typeof loadAll>>;
