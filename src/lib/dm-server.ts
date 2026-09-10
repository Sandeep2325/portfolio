import { createServerSupabaseClient } from "@/lib/supabase";
import { DM_ATTACHMENT_BUCKET, SIGNED_URL_TTL_SECONDS, type AttachmentKind } from "@/lib/attachments";

export type DirectMessageRow = {
  id: number;
  sender_id: string | null;
  recipient_id: string | null;
  anon_visitor_id?: string | null;
  body: string;
  image_path?: string | null;
  attachment_bucket?: string | null;
  attachment_path?: string | null;
  attachment_kind?: AttachmentKind | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  attachment_duration_ms?: number | null;
  read_at?: string | null;
  deleted_by_sender_at?: string | null;
  deleted_by_recipient_at?: string | null;
  deleted_for_everyone_at?: string | null;
  created_at: string;
};

/** Who is looking at a thread: an account, or an anonymous visitor. */
export type Viewer = { userId: string | null; anonVisitorId: string | null };

/**
 * Whether the viewer is the party that sent this message. Anonymous threads
 * cannot use sender_id alone, because it is null for whichever side the
 * visitor sent.
 */
export function viewerIsSender(row: DirectMessageRow, viewer: Viewer) {
  if (row.anon_visitor_id) {
    return viewer.anonVisitorId ? row.sender_id === null : row.sender_id === viewer.userId;
  }
  return Boolean(viewer.userId) && row.sender_id === viewer.userId;
}

export function viewerIsParticipant(row: DirectMessageRow, viewer: Viewer) {
  if (row.anon_visitor_id) {
    if (viewer.anonVisitorId) return row.anon_visitor_id === viewer.anonVisitorId;
    return row.sender_id === viewer.userId || row.recipient_id === viewer.userId;
  }
  return Boolean(viewer.userId) && (row.sender_id === viewer.userId || row.recipient_id === viewer.userId);
}

/** A message the viewer deleted just for themselves is dropped entirely. */
export function hiddenFromViewer(row: DirectMessageRow, viewer: Viewer) {
  return viewerIsSender(row, viewer) ? Boolean(row.deleted_by_sender_at) : Boolean(row.deleted_by_recipient_at);
}

/**
 * Strips the content of a message deleted for everyone. Done server-side so
 * the text never reaches the client to be hidden by CSS.
 */
export function tombstone(row: DirectMessageRow): DirectMessageRow {
  if (!row.deleted_for_everyone_at) return row;
  return {
    ...row,
    body: " ",
    image_path: null,
    attachment_bucket: null,
    attachment_path: null,
    attachment_kind: null,
    attachment_name: null,
    attachment_mime: null,
    attachment_size: null,
    attachment_duration_ms: null,
  };
}

/** Applies both deletion rules before anything is signed or serialised. */
export function applyDeletions(rows: DirectMessageRow[], viewer: Viewer) {
  return rows.filter((row) => !hiddenFromViewer(row, viewer)).map(tombstone);
}

export type Contact = {
  id: string;
  /** "user" for an account, "anon" for an anonymous visitor thread. */
  kind: "user" | "anon";
  email: string;
  username: string | null;
  /** What the UI shows: username when claimed, otherwise the email or guest label. */
  label: string;
  lastSeenAt: string | null;
  ip?: string | null;
};

/**
 * Attachments live in a private bucket, so every URL handed to the client is a
 * short-lived signed one. Signing is batched per bucket to keep this to one
 * storage round trip.
 */
export async function signAttachments(rows: DirectMessageRow[]) {
  const byBucket = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.attachment_path) continue;
    const bucket = row.attachment_bucket || DM_ATTACHMENT_BUCKET;
    byBucket.set(bucket, [...(byBucket.get(bucket) || []), row.attachment_path]);
  }

  const signed = new Map<string, string>();
  if (byBucket.size > 0) {
    const supabase = createServerSupabaseClient();
    await Promise.all(
      [...byBucket].map(async ([bucket, paths]) => {
        const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
        for (const item of data || []) {
          if (item.signedUrl && item.path) signed.set(`${bucket}:${item.path}`, item.signedUrl);
        }
      }),
    );
  }

  return rows.map((row) => {
    if (!row.attachment_path) return { ...row, attachment: null, image_url: null };
    const bucket = row.attachment_bucket || DM_ATTACHMENT_BUCKET;
    const url = signed.get(`${bucket}:${row.attachment_path}`) || null;
    const kind = row.attachment_kind || "file";
    return {
      ...row,
      attachment: {
        url,
        kind,
        name: row.attachment_name || "attachment",
        mime: row.attachment_mime || "",
        size: row.attachment_size || 0,
        durationMs: row.attachment_duration_ms || null,
      },
      image_url: kind === "image" ? url : null,
    };
  });
}

export async function resolveContacts(userIds: string[]): Promise<Contact[]> {
  if (userIds.length === 0) return [];

  const supabase = createServerSupabaseClient();
  const { data: profiles } = await supabase.from("profiles").select("id, username, last_seen_at").in("id", userIds);
  const byId = new Map((profiles || []).map((profile) => [profile.id as string, profile]));

  return Promise.all(
    userIds.map(async (id) => {
      const profile = byId.get(id);
      const { data, error } = await supabase.auth.admin.getUserById(id);
      const email = error || !data.user?.email ? `${id.slice(0, 8)}…` : data.user.email;
      const username = (profile?.username as string | null) || null;
      return {
        id,
        kind: "user" as const,
        email,
        username,
        label: username || email,
        lastSeenAt: (profile?.last_seen_at as string | null) || null,
      };
    }),
  );
}

/** Anonymous visitors that have an open thread with the owner. */
export async function resolveAnonContacts(): Promise<Contact[]> {
  const supabase = createServerSupabaseClient();

  const { data: threads } = await supabase
    .from("direct_messages")
    .select("anon_visitor_id")
    .not("anon_visitor_id", "is", null);

  const ids = Array.from(new Set((threads || []).map((row) => row.anon_visitor_id as string)));
  if (ids.length === 0) return [];

  const { data: visitors } = await supabase
    .from("anon_visitors")
    .select("id, label, ip, last_seen_at")
    .in("id", ids);

  return (visitors || []).map((visitor) => ({
    id: visitor.id as string,
    kind: "anon" as const,
    email: (visitor.ip as string | null) || "unknown IP",
    username: null,
    label: visitor.label as string,
    lastSeenAt: (visitor.last_seen_at as string | null) || null,
    ip: (visitor.ip as string | null) || null,
  }));
}
