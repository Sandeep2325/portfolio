import { NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Things is not configured." }, { status: 500 });
  const { postId, body, authorName } = await request.json() as { postId?: number; body?: string; authorName?: string };
  const message = body?.trim() || "";
  const name = authorName?.trim() || "Ghost";
  if (!Number.isInteger(postId) || !message || message.length > 500 || name.length > 40) return NextResponse.json({ error: "Enter a comment of up to 500 characters." }, { status: 400 });
  try {
    const { data, error } = await createServerSupabaseClient().from("things_comments").insert({ post_id: postId, author_name: name, body: message }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 }); }
}
