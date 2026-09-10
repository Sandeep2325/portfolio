import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { signAttachments, type DirectMessageRow } from "@/lib/dm-server";
import { resolveAnonVisitor } from "@/lib/visitor-server";

/**
 * Signs attachment URLs for messages that arrived over realtime (which carries
 * storage paths, not URLs) or whose earlier signature has expired.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });

  const user = await getAuthenticatedUser(request);
  const { ids } = (await request.json()) as { ids?: number[] };
  const wanted = (ids || []).filter((id) => Number.isInteger(id)).slice(0, 100);
  if (wanted.length === 0) return NextResponse.json({ urls: {} });

  try {
    const supabase = createServerSupabaseClient();
    let query = supabase.from("direct_messages").select("*").in("id", wanted);

    // Only a participant may sign a conversation's attachments.
    if (user) {
      query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
    } else {
      const { visitor } = await resolveAnonVisitor(request, { create: false });
      if (!visitor) return NextResponse.json({ urls: {} });
      query = query.eq("anon_visitor_id", visitor.id);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const signed = await signAttachments((data || []) as DirectMessageRow[]);
    const urls: Record<number, string> = {};
    for (const message of signed) {
      if (message.attachment?.url) urls[message.id] = message.attachment.url;
    }

    return NextResponse.json({ urls });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
