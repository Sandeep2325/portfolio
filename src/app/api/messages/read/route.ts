import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { resolveAnonVisitor } from "@/lib/visitor-server";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Marks the peer's messages in this conversation as read.
 * The sender learns about it through the realtime UPDATE stream.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });

  const { peerId } = (await request.json()) as { peerId?: string };
  if (!peerId || !UUID.test(peerId)) return NextResponse.json({ error: "Choose a conversation." }, { status: 400 });

  try {
    const supabase = createServerSupabaseClient();
    const readAt = new Date().toISOString();
    const user = await getAuthenticatedUser(request);

    let query = supabase.from("direct_messages").update({ read_at: readAt }).is("read_at", null);

    if (!user) {
      // Anonymous visitor reading the owner's replies.
      const { visitor } = await resolveAnonVisitor(request, { create: false });
      if (!visitor) return NextResponse.json({ readAt, updated: 0 });
      query = query.eq("anon_visitor_id", visitor.id).is("recipient_id", null);
    } else {
      const { data: anonPeer } = await supabase.from("anon_visitors").select("id").eq("id", peerId).maybeSingle();
      if (anonPeer) {
        // Owner reading an anonymous visitor's messages.
        query = query.eq("anon_visitor_id", peerId).is("sender_id", null).eq("recipient_id", user.id);
      } else {
        // Only the recipient can mark a message read, never the sender.
        query = query.eq("recipient_id", user.id).eq("sender_id", peerId);
      }
    }

    const { data, error } = await query.select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ readAt, updated: (data || []).length });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
