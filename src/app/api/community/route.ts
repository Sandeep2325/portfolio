import { NextResponse } from "next/server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Community is not configured." }, { status: 500 });
  try {
    const { data, error } = await createServerSupabaseClient().from("community_messages").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data || [] });
  } catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Community is not configured." }, { status: 500 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to send a message." }, { status: 401 });
  const { body, authorName, parentId } = await request.json() as { body?: string; authorName?: string; parentId?: number | null };
  const message = body?.trim() || "";
  const name = authorName?.trim() || "Ghost";
  if (!message || message.length > 1000 || name.length > 40 || (parentId !== null && parentId !== undefined && !Number.isInteger(parentId))) return NextResponse.json({ error: "Enter a message of up to 1,000 characters." }, { status: 400 });
  const isOwner = await isSuperAdmin(user.id);
  try {
    const { data, error } = await createServerSupabaseClient().from("community_messages").insert({ body: message, author_name: isOwner ? "Sandeep Gowda" : name, parent_id: parentId || null, is_owner: isOwner }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data }, { status: 201 });
  } catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 }); }
}
