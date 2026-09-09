import { NextResponse } from "next/server";
import { getAdminUserId, getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type DirectMessage = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

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
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const messages = (data || []) as DirectMessage[];
    let contacts: { id: string; email: string }[] = [];

    if (admin) {
      const peerIds = Array.from(
        new Set(messages.flatMap((message) => [message.sender_id, message.recipient_id]).filter((id) => id !== user.id)),
      );
      const emails = await resolveContactEmails(peerIds);
      contacts = peerIds.map((id) => ({ id, email: emails[id] || `${id.slice(0, 8)}…` }));
    }

    return NextResponse.json({ messages, admin, userId: user.id, contacts });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to send a direct message." }, { status: 401 });

  const { body, recipientId } = (await request.json()) as { body?: string; recipientId?: string };
  const message = body?.trim() || "";
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: "Enter a message of up to 2,000 characters." }, { status: 400 });
  }

  try {
    const adminId = await getAdminUserId();
    if (!adminId) {
      return NextResponse.json({ error: "Admin account is not configured. Mark one profile as super admin first." }, { status: 503 });
    }

    const target = (await isSuperAdmin(user.id)) ? recipientId : adminId;
    if (!target || !/^[0-9a-f-]{36}$/i.test(target)) {
      return NextResponse.json({ error: "Choose a recipient." }, { status: 400 });
    }

    const { data, error } = await createServerSupabaseClient()
      .from("direct_messages")
      .insert({ sender_id: user.id, recipient_id: target, body: message })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data }, { status: 201 });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}
