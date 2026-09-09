import { NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Things is not configured." }, { status: 500 });
  const { postId, visitorId } = await request.json() as { postId?: number; visitorId?: string };
  if (!Number.isInteger(postId) || !visitorId || !/^[0-9a-f-]{36}$/i.test(visitorId)) return NextResponse.json({ error: "Invalid like." }, { status: 400 });
  try {
    const supabase = createServerSupabaseClient();
    const { data: existing, error: findError } = await supabase.from("things_likes").select("id").eq("post_id", postId).eq("visitor_id", visitorId).maybeSingle();
    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
    if (existing) { const { error } = await supabase.from("things_likes").delete().eq("id", existing.id); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ liked: false }); }
    const { error } = await supabase.from("things_likes").insert({ post_id: postId, visitor_id: visitorId });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ liked: true });
  } catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 }); }
}
