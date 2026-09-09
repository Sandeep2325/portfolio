import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;

/** Reads another user's last-seen timestamp, for the "last seen" line in DMs. */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const userId = new URL(request.url).searchParams.get("userId") || "";
  if (!UUID.test(userId)) return NextResponse.json({ error: "Invalid user." }, { status: 400 });

  const { data, error } = await createServerSupabaseClient()
    .from("profiles")
    .select("last_seen_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lastSeenAt: (data?.last_seen_at as string | null) || null });
}

/**
 * Heartbeat from an open tab. Realtime presence covers "active right now";
 * this column is what survives the tab closing, for "last seen".
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const seenAt = new Date().toISOString();
  const { error } = await createServerSupabaseClient()
    .from("profiles")
    .update({ last_seen_at: seenAt })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lastSeenAt: seenAt });
}
