import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function getAuthenticatedUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

export async function isSuperAdmin(userId: string) {
  const { data, error } = await createServerSupabaseClient().from("profiles").select("is_super_admin").eq("id", userId).maybeSingle();
  return !error && Boolean(data?.is_super_admin);
}

export async function getAdminUserId() {
  const { data, error } = await createServerSupabaseClient().from("profiles").select("id").eq("is_super_admin", true).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id || null;
}

export function usernameFromEmail(email?: string | null) {
  if (!email) return "Guest";
  const local = email.split("@")[0]?.trim().replace(/[^\w.-]/g, "") || "Guest";
  return local.slice(0, 40) || "Guest";
}

export async function getUserDisplayName(user: User) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("profiles").select("display_name, is_super_admin").eq("id", user.id).maybeSingle();

  if (data?.is_super_admin) return "Sandeep Gowda";

  const existing = data?.display_name?.trim();
  if (existing && existing !== "Guest" && !existing.includes("@")) {
    return existing.slice(0, 40);
  }

  const username = usernameFromEmail(user.email);
  await supabase.from("profiles").update({ display_name: username, updated_at: new Date().toISOString() }).eq("id", user.id);
  return username;
}
