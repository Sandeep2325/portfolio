import { NextResponse } from "next/server";
import { getAdminUserId, getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    const supabase = createServerSupabaseClient();
    const admin = await isSuperAdmin(user.id);
    let query = supabase.from("direct_messages").select("*").order("created_at", { ascending: true }).limit(200);
    if (admin) query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
    else query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data || [], admin, userId: user.id });
  } catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to send a direct message." }, { status: 401 });
  const { body, recipientId } = await request.json() as { body?: string; recipientId?: string };
  const message = body?.trim() || "";
  if (!message || message.length > 2000) return NextResponse.json({ error: "Enter a message of up to 2,000 characters." }, { status: 400 });
  try {
    const adminId = await getAdminUserId();
    if (!adminId) return NextResponse.json({ error: "Admin account is not configured. Mark one profile as super admin first." }, { status: 503 });
    const target = await isSuperAdmin(user.id) ? recipientId : adminId;
    if (!target || !/^[0-9a-f-]{36}$/i.test(target)) return NextResponse.json({ error: "Choose a recipient." }, { status: 400 });
    const { data, error } = await createServerSupabaseClient().from("direct_messages").insert({ sender_id: user.id, recipient_id: target, body: message }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data }, { status: 201 });
  } catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 }); }
}
