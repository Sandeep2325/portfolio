import { NextResponse } from "next/server";
import { createServerSupabaseClient, getAssetBucketName, getPublicAssetUrl, isSupabaseConfigured } from "@/lib/supabase";
import { getAuthenticatedUser, getUserDisplayName, isSuperAdmin } from "@/lib/auth-server";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function withImageUrl<T extends { image_path?: string | null }>(message: T) {
  return {
    ...message,
    image_url: message.image_path ? getPublicAssetUrl(message.image_path) : null,
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) return error("Community is not configured.", 500);
  try {
    const { data, error: loadError } = await createServerSupabaseClient()
      .from("community_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (loadError) return error(loadError.message, 500);
    return NextResponse.json({ messages: (data || []).map(withImageUrl) });
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : "Unexpected server error.", 500);
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return error("Community is not configured.", 500);
  const user = await getAuthenticatedUser(request);
  if (!user) return error("Please sign in to send a message.", 401);

  const form = await request.formData();
  const message = String(form.get("body") || form.get("message") || form.get("reply") || "").trim();
  const parentRaw = form.get("parentId");
  const parentId = parentRaw === null || parentRaw === "" ? null : Number(parentRaw);
  const image = form.get("image");

  if ((!message && !(image instanceof File && image.size > 0)) || message.length > 1000) {
    return error("Enter a message or image of up to 1,000 characters.");
  }
  if (parentId !== null && !Number.isInteger(parentId)) {
    return error("Invalid reply target.");
  }

  const isOwner = await isSuperAdmin(user.id);
  const authorName = await getUserDisplayName(user);

  try {
    const supabase = createServerSupabaseClient();
    let imagePath: string | null = null;

    if (image instanceof File && image.size > 0) {
      if (!image.type.startsWith("image/") || image.size > MAX_IMAGE_SIZE) {
        return error("Upload a supported image smaller than 20 MB.");
      }
      const extension = image.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
      imagePath = `community/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(getAssetBucketName())
        .upload(imagePath, image, { contentType: image.type, upsert: false });
      if (uploadError) return error(uploadError.message, 500);
    }

    const bodyText = message || " ";
    const { data, error: insertError } = await supabase
      .from("community_messages")
      .insert({
        body: bodyText,
        author_name: authorName,
        parent_id: parentId,
        is_owner: isOwner,
        image_path: imagePath,
      })
      .select()
      .single();

    if (insertError) return error(insertError.message, 500);
    return NextResponse.json({ message: withImageUrl(data) }, { status: 201 });
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : "Unexpected server error.", 500);
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) return error("Community is not configured.", 500);
  const user = await getAuthenticatedUser(request);
  if (!user) return error("Please sign in to delete messages.", 401);
  if (!(await isSuperAdmin(user.id))) return error("Only the portfolio admin can delete community messages.", 403);

  const { messageId } = (await request.json()) as { messageId?: number };
  if (!messageId || !Number.isFinite(messageId)) return error("Choose a message to delete.");

  try {
    const supabase = createServerSupabaseClient();
    const { data: message, error: loadError } = await supabase
      .from("community_messages")
      .select("id, image_path, parent_id")
      .eq("id", messageId)
      .maybeSingle();

    if (loadError) return error(loadError.message, 500);
    if (!message) return error("Message not found.", 404);

    // Collect images from the message and its replies (thread delete when parent).
    const { data: replies } = message.parent_id
      ? { data: [] as { image_path: string | null }[] }
      : await supabase.from("community_messages").select("image_path").eq("parent_id", messageId);

    const imagePaths = [message.image_path, ...((replies || []).map((reply) => reply.image_path))]
      .filter((path): path is string => Boolean(path));

    const { error: deleteError } = await supabase.from("community_messages").delete().eq("id", messageId);
    if (deleteError) return error(deleteError.message, 500);

    if (imagePaths.length > 0) {
      await supabase.storage.from(getAssetBucketName()).remove(imagePaths);
    }

    return NextResponse.json({ success: true, messageId, deletedThread: !message.parent_id });
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : "Unexpected server error.", 500);
  }
}
