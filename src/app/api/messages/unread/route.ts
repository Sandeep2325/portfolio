import { NextResponse } from "next/server";
import { OWNER_DISPLAY_NAME, getAuthenticatedUser } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { resolveContacts } from "@/lib/dm-server";
import type { AttachmentKind } from "@/lib/attachments";

const KIND_PREVIEW: Record<AttachmentKind, string> = {
  image: "📷 Photo",
  audio: "🎤 Voice message",
  file: "📎 Attachment",
};

function preview(body: string, kind: AttachmentKind | null) {
  const text = (body || "").trim();
  if (text) return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  return kind ? KIND_PREVIEW[kind] : "New message";
}

/**
 * Unread messages addressed to the caller, with enough context to render a
 * notification without a second round trip.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("direct_messages")
      .select("id, sender_id, anon_visitor_id, body, attachment_kind, created_at")
      .eq("recipient_id", user.id)
      .is("read_at", null)
      // A deleted message is not something to be notified about.
      .is("deleted_for_everyone_at", null)
      .is("deleted_by_recipient_at", null)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data || [];
    const senderIds = Array.from(
      new Set(rows.map((row) => row.sender_id as string | null).filter((id): id is string => Boolean(id))),
    );

    // Anonymous senders have no sender_id; their identity is the visitor row.
    const anonIds = Array.from(
      new Set(rows.map((row) => row.anon_visitor_id as string | null).filter((id): id is string => Boolean(id))),
    );
    const anonLabels = new Map<string, string>();
    if (anonIds.length > 0) {
      const { data: visitors } = await supabase.from("anon_visitors").select("id, label").in("id", anonIds);
      for (const visitor of visitors || []) anonLabels.set(visitor.id as string, visitor.label as string);
    }

    // The owner has a fixed public name; everyone else resolves to username/email.
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_super_admin", true)
      .maybeSingle();
    const ownerId = (ownerProfile?.id as string) || null;

    const guestIds = senderIds.filter((id) => id !== ownerId);
    const contacts = await resolveContacts(guestIds);
    const labels = new Map(contacts.map((contact) => [contact.id, contact.label]));

    return NextResponse.json({
      ids: rows.map((row) => row.id as number),
      items: rows.map((row) => ({
        id: row.id as number,
        // For an anonymous thread the visitor id is the conversation key.
        senderId: (row.anon_visitor_id as string | null) || (row.sender_id as string),
        senderLabel: row.anon_visitor_id
          ? anonLabels.get(row.anon_visitor_id as string) || "Anonymous guest"
          : row.sender_id === ownerId
            ? OWNER_DISPLAY_NAME
            : labels.get(row.sender_id as string) || "Someone",
        preview: preview(row.body as string, (row.attachment_kind as AttachmentKind | null) || null),
        createdAt: row.created_at as string,
      })),
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
