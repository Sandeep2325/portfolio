import { NextResponse } from "next/server";
import { OWNER_DISPLAY_NAME, getAuthenticatedUser } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { resolveContacts } from "@/lib/dm-server";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Display label for someone who messaged the caller. Only resolves for users
 * the caller actually shares a conversation with, so it cannot be used to walk
 * the user list.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid user." }, { status: 400 });

  try {
    const supabase = createServerSupabaseClient();

    const { count } = await supabase
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .or(`and(sender_id.eq.${id},recipient_id.eq.${user.id}),and(sender_id.eq.${user.id},recipient_id.eq.${id})`);

    if (!count) return NextResponse.json({ error: "No conversation with that user." }, { status: 404 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", id)
      .maybeSingle();

    if (profile?.is_super_admin) return NextResponse.json({ label: OWNER_DISPLAY_NAME });

    const [contact] = await resolveContacts([id]);
    return NextResponse.json({ label: contact?.label || "Someone" });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
