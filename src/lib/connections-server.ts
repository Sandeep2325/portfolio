import { createServerSupabaseClient } from "@/lib/supabase";

export type ConnectionStatus = "pending" | "accepted" | "declined";

export type ConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  created_at: string;
  responded_at: string | null;
};

/** The connection between two accounts, in whichever direction it was made. */
export async function findConnection(a: string, b: string) {
  const { data } = await createServerSupabaseClient()
    .from("connections")
    .select("*")
    .or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`)
    .maybeSingle();
  return (data as ConnectionRow | null) || null;
}

export type MessagePermission =
  | { ok: true }
  | { ok: false; reason: "not-connected" | "pending" | "declined"; error: string };

/**
 * Whether `senderId` may message `recipientId`.
 *
 * The owner is exempt in both directions, so anyone can always reach them and
 * they can always reply. Two ordinary accounts need an accepted connection.
 */
export async function canMessage(senderId: string, recipientId: string): Promise<MessagePermission> {
  const supabase = createServerSupabaseClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, is_super_admin")
    .in("id", [senderId, recipientId]);

  const involvesOwner = (profiles || []).some((profile) => profile.is_super_admin);
  if (involvesOwner) return { ok: true };

  const connection = await findConnection(senderId, recipientId);
  if (connection?.status === "accepted") return { ok: true };

  if (connection?.status === "pending") {
    return {
      ok: false,
      reason: "pending",
      error:
        connection.requester_id === senderId
          ? "Your connection request is still pending."
          : "Accept their connection request to start messaging.",
    };
  }

  if (connection?.status === "declined") {
    return { ok: false, reason: "declined", error: "This connection request was declined." };
  }

  return { ok: false, reason: "not-connected", error: "Connect with this person before messaging them." };
}
