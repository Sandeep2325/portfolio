import { NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { getAuthenticatedUser, getUserDisplayName } from "@/lib/auth-server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Things is not configured." }, { status: 500 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to comment." }, { status: 401 });

  const { postId, body } = (await request.json()) as { postId?: number; body?: string };
  const message = body?.trim() || "";
  if (!Number.isInteger(postId) || !message || message.length > 500) {
    return NextResponse.json({ error: "Enter a comment of up to 500 characters." }, { status: 400 });
  }

  try {
    const authorName = await getUserDisplayName(user);
    const { data, error } = await createServerSupabaseClient()
      .from("things_comments")
      .insert({ post_id: postId, author_name: authorName, body: message })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}
