import { NextResponse } from "next/server";
import { getAdminUserId, getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { resolveRowIdentity, signAttachments, type DirectMessageRow } from "@/lib/dm-server";
import { setVisitorCookie } from "@/lib/visitor-server";
import { canMessage } from "@/lib/connections-server";

const KINDS = new Set(["voice", "video"]);
const STATUSES = new Set(["completed", "missed", "declined"]);

/**
 * Records a finished call in the conversation.
 *
 * Only the caller writes the row, so a call produces exactly one entry that
 * both sides then see — the same reason a single writer avoids duplicates in
 * any two-party log.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Messages are not configured." }, { status: 500 });

  const { recipientId, callKind, callStatus, durationSeconds } = (await request.json()) as {
    recipientId?: string;
    callKind?: string;
    callStatus?: string;
    durationSeconds?: number;
  };

  if (!callKind || !KINDS.has(callKind)) return NextResponse.json({ error: "Invalid call kind." }, { status: 400 });
  if (!callStatus || !STATUSES.has(callStatus)) return NextResponse.json({ error: "Invalid call status." }, { status: 400 });

  try {
    const supabase = createServerSupabaseClient();
    const user = await getAuthenticatedUser(request);
    const [adminId, admin] = await Promise.all([
      getAdminUserId(),
      user ? isSuperAdmin(user.id) : Promise.resolve(false),
    ]);
    if (!adminId) return NextResponse.json({ error: "Admin account is not configured." }, { status: 503 });

    const resolved = await resolveRowIdentity({
      request,
      userId: user?.id || null,
      admin,
      adminId,
      recipientId: String(recipientId || ""),
    });
    if (!resolved.identity) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status || 400 });
    }
    const rowIdentity = resolved.identity;

    // Two ordinary accounts must be connected first; the owner is exempt.
    if (rowIdentity.sender_id && rowIdentity.recipient_id) {
      const permission = await canMessage(rowIdentity.sender_id, rowIdentity.recipient_id);
      if (!permission.ok) {
        return NextResponse.json({ error: permission.error, reason: permission.reason }, { status: 403 });
      }
    }

    const duration =
      callStatus === "completed" && Number.isFinite(durationSeconds) ? Math.max(0, Math.round(durationSeconds as number)) : null;

    const { data, error } = await supabase
      .from("direct_messages")
      // Body stays blank: call_* carries the content, and the length check on
      // body still needs a non-empty value.
      .insert({
        ...rowIdentity,
        body: " ",
        call_kind: callKind,
        call_status: callStatus,
        call_duration_seconds: duration,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const [signed] = await signAttachments([data as DirectMessageRow]);
    const response = NextResponse.json({ message: signed }, { status: 201 });
    if (resolved.issuedToken) setVisitorCookie(response, resolved.issuedToken);
    return response;
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}
