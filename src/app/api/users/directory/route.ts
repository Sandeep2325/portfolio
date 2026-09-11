import { NextResponse } from "next/server";
import { OWNER_DISPLAY_NAME, getAuthenticatedUser } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

/**
 * People a signed-in visitor can start a conversation with.
 *
 * Usernames only — email addresses are deliberately never returned here, so
 * the picker cannot leak one account's address to another.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data, error } = await createServerSupabaseClient()
    .from("profiles")
    .select("id, username, display_name, is_super_admin, last_seen_at")
    .neq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const people = (data || [])
    .map((profile) => ({
      id: profile.id as string,
      label: profile.is_super_admin
        ? OWNER_DISPLAY_NAME
        : (profile.username as string | null) || (profile.display_name as string | null) || "Guest",
      isOwner: Boolean(profile.is_super_admin),
      lastSeenAt: (profile.last_seen_at as string | null) || null,
    }))
    .sort((left, right) => Number(right.isOwner) - Number(left.isOwner) || left.label.localeCompare(right.label));

  return NextResponse.json({ people });
}
