import { NextResponse } from "next/server";
import { createServerSupabaseClient, getAssetBucketName, getPublicAssetUrl, isSupabaseConfigured } from "@/lib/supabase";
import { getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function GET() {
  if (!isSupabaseConfigured()) return error("Things is not configured.", 500);
  try {
    const supabase = createServerSupabaseClient();
    const [{ data: posts, error: postError }, { data: comments, error: commentError }, { data: likes, error: likeError }] = await Promise.all([
      supabase.from("things_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("things_comments").select("*").order("created_at", { ascending: true }),
      supabase.from("things_likes").select("post_id, visitor_id"),
    ]);
    if (postError || commentError || likeError) return error(postError?.message || commentError?.message || likeError?.message || "Could not load posts.", 500);
    return NextResponse.json({ posts: (posts || []).map((post) => ({ ...post, image_url: post.image_path ? getPublicAssetUrl(post.image_path) : null, comments: (comments || []).filter((comment) => comment.post_id === post.id), likes: (likes || []).filter((like) => like.post_id === post.id) })) });
  } catch (caught) { return error(caught instanceof Error ? caught.message : "Unexpected server error.", 500); }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return error("Things is not configured.", 500);
  const user = await getAuthenticatedUser(request);
  if (!user) return error("Please sign in to post.", 401);
  if (!await isSuperAdmin(user.id)) return error("Only the portfolio admin can create posts.", 403);
  const form = await request.formData();
  const title = String(form.get("title") || "").trim();
  const body = String(form.get("body") || "").trim();
  const image = form.get("image");
  if (!title || !body) return error("A title and post text are required.");
  if (title.length > 120 || body.length > 2000) return error("Post is too long.");
  try {
    const supabase = createServerSupabaseClient();
    let imagePath: string | null = null;
    if (image instanceof File && image.size > 0) {
      if (!image.type.startsWith("image/") || image.size > MAX_IMAGE_SIZE) return error("Upload a supported image smaller than 20 MB.");
      const extension = image.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
      imagePath = `things/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(getAssetBucketName()).upload(imagePath, image, { contentType: image.type, upsert: false });
      if (uploadError) return error(uploadError.message, 500);
    }
    const { data, error: insertError } = await supabase.from("things_posts").insert({ title, body, image_path: imagePath }).select().single();
    if (insertError) return error(insertError.message, 500);
    return NextResponse.json({ post: { ...data, image_url: imagePath ? getPublicAssetUrl(imagePath) : null, comments: [], likes: [] } }, { status: 201 });
  } catch (caught) { return error(caught instanceof Error ? caught.message : "Unexpected server error.", 500); }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) return error("Things is not configured.", 500);
  const user = await getAuthenticatedUser(request);
  if (!user) return error("Please sign in to delete posts.", 401);
  if (!(await isSuperAdmin(user.id))) return error("Only the portfolio admin can delete posts.", 403);

  const { postId } = (await request.json()) as { postId?: number };
  if (!postId || !Number.isFinite(postId)) return error("Choose a post to delete.");

  try {
    const supabase = createServerSupabaseClient();
    const { data: post, error: loadError } = await supabase.from("things_posts").select("id, image_path").eq("id", postId).maybeSingle();
    if (loadError) return error(loadError.message, 500);
    if (!post) return error("Post not found.", 404);

    const { error: deleteError } = await supabase.from("things_posts").delete().eq("id", postId);
    if (deleteError) return error(deleteError.message, 500);

    if (post.image_path) {
      await supabase.storage.from(getAssetBucketName()).remove([post.image_path]);
    }

    return NextResponse.json({ success: true, postId });
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : "Unexpected server error.", 500);
  }
}
