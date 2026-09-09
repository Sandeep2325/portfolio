import { NextResponse } from "next/server";
import { OWNER_DISPLAY_NAME, getAdminUserId, getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { DM_ATTACHMENT_BUCKET, MAX_ATTACHMENT_SIZE, extensionOf, resolveKind, type AttachmentKind } from "@/lib/attachments";
import { resolveContacts, signAttachments, type Contact, type DirectMessageRow } from "@/lib/dm-server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  try {
    const supabase = createServerSupabaseClient();
    const admin = await isSuperAdmin(user.id);
    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data || []) as DirectMessageRow[];
    let contacts: Contact[] = [];
    let owner: { id: string; label: string; lastSeenAt: string | null } | null = null;

    if (admin) {
      const { data: guests } = await supabase.from("profiles").select("id").eq("is_super_admin", false);
      const guestIds = (guests || []).map((guest) => guest.id);
      const peerIdsFromMessages = rows
        .flatMap((message) => [message.sender_id, message.recipient_id])
        .filter((id) => id !== user.id);
      const peerIds = Array.from(new Set([...guestIds, ...peerIdsFromMessages]));
      contacts = (await resolveContacts(peerIds)).sort((left, right) => left.label.localeCompare(right.label));
    } else {
      // Guests only ever talk to the owner, so ship that one peer's presence.
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("id, last_seen_at")
        .eq("is_super_admin", true)
        .maybeSingle();
      if (ownerProfile) {
        owner = {
          id: ownerProfile.id as string,
          label: OWNER_DISPLAY_NAME,
          lastSeenAt: (ownerProfile.last_seen_at as string | null) || null,
        };
      }
    }

    return NextResponse.json({
      messages: await signAttachments(rows),
      admin,
      userId: user.id,
      contacts,
      owner,
    });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to send a direct message." }, { status: 401 });

  const form = await request.formData();
  const message = String(form.get("body") || "").trim();
  const recipientId = String(form.get("recipientId") || "");
  const durationMs = Number(form.get("durationMs") || 0);
  const upload = form.get("attachment") ?? form.get("image");
  const file = upload instanceof File && upload.size > 0 ? upload : null;

  if (!message && !file) {
    return NextResponse.json({ error: "Enter a message or attach a file." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Enter a message of up to 2,000 characters." }, { status: 400 });
  }

  let kind: AttachmentKind | null = null;
  if (file) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json({ error: "Attachments must be smaller than 20 MB." }, { status: 400 });
    }
    kind = resolveKind(file.type, file.name);
    if (!kind) {
      return NextResponse.json({ error: "That file type is not supported." }, { status: 400 });
    }
  }

  try {
    const adminId = await getAdminUserId();
    if (!adminId) {
      return NextResponse.json({ error: "Admin account is not configured. Mark one profile as super admin first." }, { status: 503 });
    }

    const admin = await isSuperAdmin(user.id);
    const target = admin ? recipientId : adminId;
    if (!target || !/^[0-9a-f-]{36}$/i.test(target)) {
      return NextResponse.json({ error: "Choose a recipient." }, { status: 400 });
    }
    if (target === user.id) {
      return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    if (admin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_super_admin")
        .eq("id", target)
        .maybeSingle();
      if (!profile || profile.is_super_admin) {
        return NextResponse.json({ error: "Choose a guest account to message." }, { status: 400 });
      }
    }

    let attachment: Partial<DirectMessageRow> = {};
    if (file && kind) {
      const extension = extensionOf(file.name) || (kind === "audio" ? "webm" : "bin");
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
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
        attachment_duration_ms: kind === "audio" && Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs) : null,
      };
    }

    const { data, error } = await supabase
      .from("direct_messages")
      // An attachment-only message stores a single space to satisfy the body length check.
      .insert({ sender_id: user.id, recipient_id: target, body: message || " ", ...attachment })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const [signed] = await signAttachments([data as DirectMessageRow]);
    return NextResponse.json({ message: signed }, { status: 201 });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}
