import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase";

export const OWNER_DISPLAY_NAME = "Sandeep Gowda";

export type ProfileRecord = {
  id: string;
  display_name: string | null;
  username: string | null;
  is_super_admin: boolean;
  last_seen_at: string | null;
};

const PROFILE_COLUMNS = "id, display_name, username, is_super_admin, last_seen_at";

export async function getAuthenticatedUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

export async function getProfile(userId: string): Promise<ProfileRecord | null> {
  const { data, error } = await createServerSupabaseClient()
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  return error ? null : (data as ProfileRecord | null);
}

export async function isSuperAdmin(userId: string) {
  const { data, error } = await createServerSupabaseClient()
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();
  return !error && Boolean(data?.is_super_admin);
}

export async function getAdminUserId() {
  const { data, error } = await createServerSupabaseClient()
    .from("profiles")
    .select("id")
    .eq("is_super_admin", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id || null;
}

export function usernameFromEmail(email?: string | null) {
  if (!email) return "Guest";
  const local = email.split("@")[0]?.trim().replace(/[^\w.-]/g, "") || "Guest";
  return local.slice(0, 40) || "Guest";
}

/**
 * Public-facing name for a user, in priority order:
 *   owner → fixed name, claimed username → that username,
 *   legacy account with no username → the email's local part.
 *
 * The full email is deliberately never used here: this value is denormalized
 * onto public community messages and post comments.
 */
export function resolveDisplayName(profile: ProfileRecord | null, email?: string | null) {
  if (profile?.is_super_admin) return OWNER_DISPLAY_NAME;
  const username = profile?.username?.trim();
  if (username) return username.slice(0, 40);
  return usernameFromEmail(email);
}

export async function getUserDisplayName(user: User) {
  const profile = await getProfile(user.id);
  const name = resolveDisplayName(profile, user.email);

  // Keep the denormalized column in step so older rows and admin tooling agree.
  if (profile && profile.display_name !== name) {
    await createServerSupabaseClient()
      .from("profiles")
      .update({ display_name: name, updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  return name;
}
