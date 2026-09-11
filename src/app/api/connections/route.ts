import { NextResponse } from "next/server";
import { OWNER_DISPLAY_NAME, getAuthenticatedUser } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { findConnection, type ConnectionRow } from "@/lib/connections-server";

const UUID = /^[0-9a-f-]{36}$/i;

async function labelsFor(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const { data } = await createServerSupabaseClient()
    .from("profiles")
    .select("id, username, display_name, is_super_admin")
    .in("id", ids);

  return new Map(
    (data || []).map((profile) => [
      profile.id as string,
      // Usernames only; addresses never travel with a connection request.
      profile.is_super_admin
        ? OWNER_DISPLAY_NAME
        : (profile.username as string | null) || (profile.display_name as string | null) || "Guest",
    ]),
  );
}

/** Everything the viewer needs to render connection state. */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data, error } = await createServerSupabaseClient()
    .from("connections")
    .select("*")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []) as ConnectionRow[];
  const labels = await labelsFor(
    Array.from(new Set(rows.flatMap((row) => [row.requester_id, row.addressee_id]))).filter((id) => id !== user.id),
  );

  const shape = (row: ConnectionRow) => {
    const peerId = row.requester_id === user.id ? row.addressee_id : row.requester_id;
    return {
      id: row.id,
      peerId,
      peerLabel: labels.get(peerId) || "Guest",
      status: row.status,
      outgoing: row.requester_id === user.id,
      createdAt: row.created_at,
    };
  };

  const all = rows.map(shape);
  return NextResponse.json({
    connections: all,
    incoming: all.filter((row) => row.status === "pending" && !row.outgoing),
    outgoing: all.filter((row) => row.status === "pending" && row.outgoing),
    accepted: all.filter((row) => row.status === "accepted"),
  });
}

/** Sends a connection request. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { userId } = (await request.json()) as { userId?: string };
  if (!userId || !UUID.test(userId)) return NextResponse.json({ error: "Choose someone to connect with." }, { status: 400 });
  if (userId === user.id) return NextResponse.json({ error: "You cannot connect with yourself." }, { status: 400 });

  try {
    const supabase = createServerSupabaseClient();
    const { data: target } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!target) return NextResponse.json({ error: "That person no longer exists." }, { status: 404 });

    const existing = await findConnection(user.id, userId);
    if (existing) {
      // A previously declined request can be sent again; re-open that same row
      // rather than leaving a dead record behind.
      if (existing.status === "declined") {
        const { data, error } = await supabase
          .from("connections")
          .update({ status: "pending", requester_id: user.id, addressee_id: userId, responded_at: null })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ connection: data }, { status: 200 });
      }
      return NextResponse.json({ connection: existing, alreadyExists: true });
    }

    const { data, error } = await supabase
      .from("connections")
      .insert({ requester_id: user.id, addressee_id: userId })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ connection: data }, { status: 201 });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}

/** Accepts or declines a request addressed to the caller. */
export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id, action } = (await request.json()) as { id?: string; action?: "accept" | "decline" };
  if (!id || !UUID.test(id)) return NextResponse.json({ error: "Choose a request." }, { status: 400 });
  if (action !== "accept" && action !== "decline") return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("connections")
    .update({ status: action === "accept" ? "accepted" : "declined", responded_at: new Date().toISOString() })
    // Only the addressee may answer, and only while it is still pending.
    .eq("id", id)
    .eq("addressee_id", user.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  return NextResponse.json({ connection: data });
}

/** Removes a connection or withdraws a request. */
export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = (await request.json()) as { id?: string };
  if (!id || !UUID.test(id)) return NextResponse.json({ error: "Choose a connection." }, { status: 400 });

  const { data, error } = await createServerSupabaseClient()
    .from("connections")
    .delete()
    .eq("id", id)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  return NextResponse.json({ id });
}
