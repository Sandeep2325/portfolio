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
