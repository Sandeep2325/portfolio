import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Marks every message the caller has received from `peerId` as read.
 * The sender picks the change up through the realtime UPDATE stream.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { peerId } = (await request.json()) as { peerId?: string };
  if (!peerId || !UUID.test(peerId)) return NextResponse.json({ error: "Choose a conversation." }, { status: 400 });

  try {
    const readAt = new Date().toISOString();
    const { data, error } = await createServerSupabaseClient()
      .from("direct_messages")
      .update({ read_at: readAt })
      // Only the recipient can mark a message read, never the sender.
      .eq("recipient_id", user.id)
      .eq("sender_id", peerId)
      .is("read_at", null)
      .select("id");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ readAt, updated: (data || []).length });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
