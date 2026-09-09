import { NextResponse } from "next/server";
import { getAdminUserId, getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";
import { createServerSupabaseClient, getAssetBucketName, getPublicAssetUrl, isSupabaseConfigured } from "@/lib/supabase";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

type DirectMessage = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  image_path?: string | null;
  created_at: string;
};

function withImageUrl<T extends { image_path?: string | null }>(message: T) {
  return { ...message, image_url: message.image_path ? getPublicAssetUrl(message.image_path) : null };
}

async function resolveContactEmails(userIds: string[]) {
  if (userIds.length === 0) return {} as Record<string, string>;

  const supabase = createServerSupabaseClient();
  const entries = await Promise.all(
    userIds.map(async (id) => {
      const { data, error } = await supabase.auth.admin.getUserById(id);
      if (error || !data.user?.email) return [id, id.slice(0, 8) + "…"] as const;
      return [id, data.user.email] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<string, string>;
}

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

    const messages = (data || []) as DirectMessage[];
    let contacts: { id: string; email: string }[] = [];

    if (admin) {
      const { data: guests } = await supabase.from("profiles").select("id").eq("is_super_admin", false);
      const guestIds = (guests || []).map((guest) => guest.id);
      const peerIdsFromMessages = messages
        .flatMap((message) => [message.sender_id, message.recipient_id])
        .filter((id) => id !== user.id);
      const peerIds = Array.from(new Set([...guestIds, ...peerIdsFromMessages]));
      const emails = await resolveContactEmails(peerIds);
      contacts = peerIds
        .map((id) => ({ id, email: emails[id] || `${id.slice(0, 8)}…` }))
        .sort((left, right) => left.email.localeCompare(right.email));
    }

    return NextResponse.json({ messages: messages.map(withImageUrl), admin, userId: user.id, contacts });
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
  const image = form.get("image");
  const hasImage = image instanceof File && image.size > 0;

  if (!message && !hasImage) {
    return NextResponse.json({ error: "Enter a message or attach an image." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Enter a message of up to 2,000 characters." }, { status: 400 });
  }
  if (hasImage && (!image.type.startsWith("image/") || image.size > MAX_IMAGE_SIZE)) {
    return NextResponse.json({ error: "Attach a supported image smaller than 20 MB." }, { status: 400 });
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

    if (admin) {
      const { data: profile } = await createServerSupabaseClient()
        .from("profiles")
        .select("id, is_super_admin")
        .eq("id", target)
        .maybeSingle();
      if (!profile || profile.is_super_admin) {
        return NextResponse.json({ error: "Choose a guest account to message." }, { status: 400 });
      }
    }

    const supabase = createServerSupabaseClient();
    let imagePath: string | null = null;

    if (hasImage) {
      const extension = image.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
      imagePath = `dm/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(getAssetBucketName())
        .upload(imagePath, image, { contentType: image.type, upsert: false });
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("direct_messages")
      // An image-only message stores a single space to satisfy the body length check.
      .insert({ sender_id: user.id, recipient_id: target, body: message || " ", image_path: imagePath })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: withImageUrl(data as DirectMessage) }, { status: 201 });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}
