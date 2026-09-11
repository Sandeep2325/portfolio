import { NextResponse } from "next/server";
import { OWNER_DISPLAY_NAME, getAdminUserId, getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { DM_ATTACHMENT_BUCKET, MAX_ATTACHMENT_SIZE, extensionOf, resolveKind, type AttachmentKind } from "@/lib/attachments";
import {
  applyDeletions,
  attachReplyPreviews,
  buildThreads,
  participantLabels,
  signAttachments,
  viewerIsParticipant,
  viewerIsSender,
  type DirectMessageRow,
  type Viewer,
} from "@/lib/dm-server";
import { resolveAnonVisitor, setVisitorCookie } from "@/lib/visitor-server";

const UUID = /^[0-9a-f-]{36}$/i;

async function ownerSummary() {
  const { data } = await createServerSupabaseClient()
    .from("profiles")
    .select("id, last_seen_at")
    .eq("is_super_admin", true)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id as string, label: OWNER_DISPLAY_NAME, lastSeenAt: (data.last_seen_at as string | null) || null };
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });

  // `since` asks for just what changed, so the client can re-sync cheaply after
  // a dropped socket without refetching the whole thread.
  const since = new URL(request.url).searchParams.get("since");
  const supabase = createServerSupabaseClient();
  const user = await getAuthenticatedUser(request);

  // ---- Anonymous visitor: their own thread with the owner, nothing else ----
  if (!user) {
    try {
      const { visitor, issuedToken } = await resolveAnonVisitor(request, { create: false });
      const owner = await ownerSummary();

      if (!visitor) {
        return NextResponse.json({
          messages: [],
          anonymous: true,
          admin: false,
          userId: "",
          contacts: [],
          owner,
          syncedAt: new Date().toISOString(),
        });
      }

      let query = supabase.from("direct_messages").select("*").eq("anon_visitor_id", visitor.id);
      if (since) query = query.or(`created_at.gt.${since},read_at.gt.${since},deleted_for_everyone_at.gt.${since}`);
      const { data, error } = await query.order("created_at", { ascending: true }).limit(500);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const viewer: Viewer = { userId: null, anonVisitorId: visitor.id };
      const response = NextResponse.json({
        messages: await signAttachments(await attachReplyPreviews(applyDeletions((data || []) as DirectMessageRow[], viewer), viewer)),
        anonymous: true,
        admin: false,
        userId: visitor.id,
        visitorLabel: visitor.label,
        contacts: [],
        owner,
        syncedAt: new Date().toISOString(),
      });
      if (issuedToken) setVisitorCookie(response, issuedToken);
      return response;
    } catch (caught) {
      return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
    }
  }

  try {
    const admin = await isSuperAdmin(user.id);

    let query = supabase.from("direct_messages").select("*");
    // The owner oversees the whole site, so they see every conversation.
    if (!admin) query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
    if (since) query = query.or(`created_at.gt.${since},read_at.gt.${since},deleted_for_everyone_at.gt.${since}`);

    const { data, error } = await query.order("created_at", { ascending: true }).limit(500);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const viewer: Viewer = { userId: user.id, anonVisitorId: null };
    const rows = applyDeletions((data || []) as DirectMessageRow[], viewer);

    if (since) {
      return NextResponse.json({
        messages: await signAttachments(await attachReplyPreviews(rows, viewer)),
        admin,
        userId: user.id,
        syncedAt: new Date().toISOString(),
      });
    }

    const { labels, ips } = await participantLabels(rows);

    return NextResponse.json({
      messages: await signAttachments(await attachReplyPreviews(rows, viewer)),
      admin,
      userId: user.id,
      threads: buildThreads(rows, viewer, labels, ips),
      labels: Object.fromEntries(labels),
      owner: await ownerSummary(),
      syncedAt: new Date().toISOString(),
    });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });

  const form = await request.formData();
  const message = String(form.get("body") || "").trim();
  const recipientId = String(form.get("recipientId") || "");
  const durationMs = Number(form.get("durationMs") || 0);
  const replyToRaw = form.get("replyToId");
  const replyToId = replyToRaw === null || replyToRaw === "" ? null : Number(replyToRaw);
  const upload = form.get("attachment") ?? form.get("image");
  const file = upload instanceof File && upload.size > 0 ? upload : null;

  if (!message && !file) {
    return NextResponse.json({ error: "Enter a message or attach a file." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Enter a message of up to 2,000 characters." }, { status: 400 });
  }
  if (replyToId !== null && !Number.isInteger(replyToId)) {
    return NextResponse.json({ error: "Invalid reply target." }, { status: 400 });
  }

  let kind: AttachmentKind | null = null;
  if (file) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json({ error: "Attachments must be smaller than 20 MB." }, { status: 400 });
    }
    kind = resolveKind(file.type, file.name);
    if (!kind) return NextResponse.json({ error: "That file type is not supported." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const user = await getAuthenticatedUser(request);
    const [adminId, admin] = await Promise.all([getAdminUserId(), user ? isSuperAdmin(user.id) : Promise.resolve(false)]);

    if (!adminId) {
      return NextResponse.json({ error: "Admin account is not configured. Mark one profile as super admin first." }, { status: 503 });
    }

    // Work out who the row belongs to before touching storage.
    let rowIdentity: Pick<DirectMessageRow, "sender_id" | "recipient_id" | "anon_visitor_id">;
    let issuedToken: string | null = null;

    if (!user) {
      // Anonymous visitor writing to the owner.
      const resolved = await resolveAnonVisitor(request, { create: true });
      if (!resolved.visitor) return NextResponse.json({ error: "Could not identify this visitor." }, { status: 400 });
      issuedToken = resolved.issuedToken;
      rowIdentity = { sender_id: null, recipient_id: adminId, anon_visitor_id: resolved.visitor.id };
    } else {
      // Any signed-in account may message any other account. With no explicit
      // recipient the message goes to the owner, which keeps "Message Sandeep"
      // working for first-time visitors.
      const target = UUID.test(recipientId) ? recipientId : adminId;
      if (target === user.id) return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });

      // Only the owner may write into an anonymous visitor's thread.
      const { data: anonTarget } = await supabase.from("anon_visitors").select("id").eq("id", target).maybeSingle();
      if (anonTarget) {
        if (!admin) return NextResponse.json({ error: "Choose someone to message." }, { status: 403 });
        rowIdentity = { sender_id: user.id, recipient_id: null, anon_visitor_id: target };
      } else {
        const { data: profile } = await supabase.from("profiles").select("id").eq("id", target).maybeSingle();
        if (!profile) return NextResponse.json({ error: "That person no longer exists." }, { status: 404 });
        rowIdentity = { sender_id: user.id, recipient_id: target, anon_visitor_id: null };
      }
    }

    // A reply may only quote a message from the same conversation.
    if (replyToId !== null) {
      const { data: quoted } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("id", replyToId)
        .maybeSingle();

      const quotedRow = quoted as DirectMessageRow | null;
      const sameThread =
        quotedRow &&
        (rowIdentity.anon_visitor_id
          ? quotedRow.anon_visitor_id === rowIdentity.anon_visitor_id
          : !quotedRow.anon_visitor_id &&
            [quotedRow.sender_id, quotedRow.recipient_id].sort().join() ===
              [rowIdentity.sender_id, rowIdentity.recipient_id].sort().join());

      if (!sameThread) {
        return NextResponse.json({ error: "You can only reply to a message in this conversation." }, { status: 400 });
      }
    }

    let attachment: Partial<DirectMessageRow> = {};
    if (file && kind) {
      const extension = extensionOf(file.name) || (kind === "audio" ? "webm" : "bin");
      const owner = rowIdentity.sender_id || rowIdentity.anon_visitor_id || "anon";
      const path = `${owner}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(DM_ATTACHMENT_BUCKET)
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

      attachment = {
        attachment_bucket: DM_ATTACHMENT_BUCKET,
        attachment_path: path,
        attachment_kind: kind,
        attachment_name: file.name.slice(0, 200),
        attachment_mime: file.type || null,
        attachment_size: file.size,
        attachment_duration_ms:
          kind === "audio" && Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs) : null,
      };
    }

    const { data, error } = await supabase
      .from("direct_messages")
      // An attachment-only message stores a single space to satisfy the body length check.
      .insert({ ...rowIdentity, body: message || " ", reply_to_id: replyToId, ...attachment })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const viewer: Viewer = user
      ? { userId: user.id, anonVisitorId: null }
      : { userId: null, anonVisitorId: rowIdentity.anon_visitor_id || null };
    const [signed] = await signAttachments(await attachReplyPreviews([data as DirectMessageRow], viewer));
    const response = NextResponse.json({ message: signed }, { status: 201 });
    if (issuedToken) setVisitorCookie(response, issuedToken);
    return response;
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}

/**
 * Deletes a message.
 *   scope "me"       - hides it from the caller only.
 *   scope "everyone" - tombstones it for both sides and drops the attachment.
 *
 * Only the message's sender may delete for everyone; the owner may do so on
 * their own site as a moderation escape hatch.
 */
export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });

  const { messageId, scope } = (await request.json()) as { messageId?: number; scope?: "me" | "everyone" };
  if (!Number.isInteger(messageId)) return NextResponse.json({ error: "Choose a message." }, { status: 400 });
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

    const { data: row, error: loadError } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("id", messageId)
      .maybeSingle();

    if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Message not found." }, { status: 404 });

    const message = row as DirectMessageRow;
    if (!viewerIsParticipant(message, viewer)) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (scope === "me") {
      const column = viewerIsSender(message, viewer) ? "deleted_by_sender_at" : "deleted_by_recipient_at";
      const { error } = await supabase.from("direct_messages").update({ [column]: now }).eq("id", messageId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ messageId, scope });
    }

    const isOwner = user ? await isSuperAdmin(user.id) : false;
    if (!viewerIsSender(message, viewer) && !isOwner) {
      return NextResponse.json({ error: "You can only delete your own messages for everyone." }, { status: 403 });
    }

    // Remove the stored file before clearing the row that points at it.
    if (message.attachment_path) {
      await supabase.storage
        .from(message.attachment_bucket || DM_ATTACHMENT_BUCKET)
        .remove([message.attachment_path])
        .catch(() => undefined);
    }

    const { error } = await supabase
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
      .eq("id", messageId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messageId, scope });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}
