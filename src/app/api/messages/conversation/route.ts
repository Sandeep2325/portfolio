import { NextResponse } from "next/server";
import { getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { DM_ATTACHMENT_BUCKET } from "@/lib/attachments";
import { threadKeyOf, viewerIsSender, type DirectMessageRow, type Viewer } from "@/lib/dm-server";
import { resolveAnonVisitor } from "@/lib/visitor-server";

/**
 * Deletes a whole conversation.
 *   scope "me"       - hides every message in it from the caller.
 *   scope "everyone" - tombstones them for both sides (owner only).
 */
export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });

  const { threadKey, scope } = (await request.json()) as { threadKey?: string; scope?: "me" | "everyone" };
  if (!threadKey) return NextResponse.json({ error: "Choose a conversation." }, { status: 400 });
  if (scope !== "me" && scope !== "everyone") return NextResponse.json({ error: "Invalid delete scope." }, { status: 400 });

  try {
    const supabase = createServerSupabaseClient();
    const user = await getAuthenticatedUser(request);

    let viewer: Viewer;
    if (user) {
      viewer = { userId: user.id, anonVisitorId: null };
    } else {
      const { visitor } = await resolveAnonVisitor(request, { create: false });
      if (!visitor) return NextResponse.json({ error: "Could not identify this visitor." }, { status: 401 });
      viewer = { userId: null, anonVisitorId: visitor.id };
    }

    const isOwner = user ? await isSuperAdmin(user.id) : false;
    if (scope === "everyone" && !isOwner) {
      return NextResponse.json({ error: "Only the owner can clear a conversation for everyone." }, { status: 403 });
    }

    // Load the thread by key, then confirm the caller belongs to it.
    let query = supabase.from("direct_messages").select("*");
    if (threadKey.startsWith("anon:")) {
      query = query.eq("anon_visitor_id", threadKey.slice(5));
    } else {
      const ids = threadKey.replace("pair:", "").split("|").filter(Boolean);
      if (ids.length !== 2) return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });
      query = query
        .is("anon_visitor_id", null)
        .or(`and(sender_id.eq.${ids[0]},recipient_id.eq.${ids[1]}),and(sender_id.eq.${ids[1]},recipient_id.eq.${ids[0]})`);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data || []) as DirectMessageRow[];
    if (rows.length === 0) return NextResponse.json({ threadKey, scope, updated: 0 });
    if (rows[0] && threadKeyOf(rows[0]) !== threadKey) {
      return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });
    }

    const viewerId = viewer.userId || viewer.anonVisitorId;
    const inThread = rows.some((row) =>
      row.anon_visitor_id
        ? row.anon_visitor_id === viewerId || row.sender_id === viewerId || row.recipient_id === viewerId
        : row.sender_id === viewerId || row.recipient_id === viewerId,
    );
    if (!inThread && !isOwner) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    const now = new Date().toISOString();

    if (scope === "me") {
      // The two hide columns are relative to each message, so split by side.
      const asSender = rows.filter((row) => viewerIsSender(row, viewer)).map((row) => row.id);
      const asRecipient = rows.filter((row) => !viewerIsSender(row, viewer)).map((row) => row.id);

      if (asSender.length > 0) {
        await supabase.from("direct_messages").update({ deleted_by_sender_at: now }).in("id", asSender);
      }
      if (asRecipient.length > 0) {
        await supabase.from("direct_messages").update({ deleted_by_recipient_at: now }).in("id", asRecipient);
      }
      return NextResponse.json({ threadKey, scope, updated: rows.length });
    }

    // Everyone: drop the attachments, then tombstone the rows.
    const byBucket = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.attachment_path) continue;
      const bucket = row.attachment_bucket || DM_ATTACHMENT_BUCKET;
      byBucket.set(bucket, [...(byBucket.get(bucket) || []), row.attachment_path]);
    }
    for (const [bucket, paths] of byBucket) await supabase.storage.from(bucket).remove(paths);

    const { error: updateError } = await supabase
      .from("direct_messages")
      .update({
        deleted_for_everyone_at: now,
        body: " ",
        attachment_bucket: null,
        attachment_path: null,
        attachment_kind: null,
        attachment_name: null,
        attachment_mime: null,
        attachment_size: null,
        attachment_duration_ms: null,
        image_path: null,
      })
      .in("id", rows.map((row) => row.id));

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ threadKey, scope, updated: rows.length });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}
