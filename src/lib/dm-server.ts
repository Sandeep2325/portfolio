import { createServerSupabaseClient } from "@/lib/supabase";
import { DM_ATTACHMENT_BUCKET, SIGNED_URL_TTL_SECONDS, type AttachmentKind } from "@/lib/attachments";
import { OWNER_DISPLAY_NAME as OWNER_LABEL } from "@/lib/auth-server";
import { resolveAnonVisitor } from "@/lib/visitor-server";

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
  reply_to_id?: number | null;
  call_kind?: "voice" | "video" | null;
  call_status?: "completed" | "missed" | "declined" | null;
  call_duration_seconds?: number | null;
  created_at: string;
};

/**
 * Identity of a conversation. Anonymous threads are keyed by their visitor;
 * everything else by the unordered pair of accounts, so both participants
 * derive the same key.
 */
export function threadKeyOf(row: DirectMessageRow) {
  if (row.anon_visitor_id) return `anon:${row.anon_visitor_id}`;
  return `pair:${[row.sender_id, row.recipient_id].filter(Boolean).sort().join("|")}`;
}

export type ThreadSummary = {
  key: string;
  kind: "anon" | "pair";
  /** Who the viewer is talking to, or the pairing when they are spectating. */
  title: string;
  subtitle: string | null;
  /** The other party, when the viewer is in the thread. */
  peerId: string | null;
  /** False when the owner is looking at someone else's conversation. */
  participant: boolean;
  lastBody: string;
  lastAt: string;
  unread: number;
  ip: string | null;
};

/** Compact snapshot of the message a reply is quoting. */
export type ReplyPreview = {
  id: number;
  excerpt: string;
  /** True when the quoted message was sent by the viewer. */
  outgoing: boolean;
  deleted: boolean;
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

const KIND_EXCERPT: Record<string, string> = {
  image: "📷 Photo",
  audio: "🎤 Voice message",
  file: "📎 Attachment",
};

export function callSummary(row: DirectMessageRow) {
  if (!row.call_kind) return null;
  const noun = row.call_kind === "video" ? "Video call" : "Voice call";
  if (row.call_status === "declined") return `${noun} declined`;
  if (row.call_status === "missed") return `Missed ${noun.toLowerCase()}`;
  const total = row.call_duration_seconds || 0;
  const stamp = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  return `${noun} · ${stamp}`;
}

function excerptOf(row: DirectMessageRow) {
  if (row.deleted_for_everyone_at) return "This message was deleted";
  const call = callSummary(row);
  if (call) return call;
  const text = (row.body || "").trim();
  if (text) return text.length > 90 ? `${text.slice(0, 90)}…` : text;
  return row.attachment_kind ? KIND_EXCERPT[row.attachment_kind] : "Message";
}

/**
 * Resolves the quoted message for every reply. Most originals are already in
 * the loaded page; only the ones that fall outside it cost an extra query.
 */
export async function attachReplyPreviews(rows: DirectMessageRow[], viewer: Viewer) {
  const wanted = new Set(rows.map((row) => row.reply_to_id).filter((id): id is number => Boolean(id)));
  if (wanted.size === 0) return rows.map((row) => ({ ...row, reply_to: null as ReplyPreview | null }));

  const known = new Map(rows.map((row) => [row.id, row]));
  const missing = [...wanted].filter((id) => !known.has(id));

  if (missing.length > 0) {
    const { data } = await createServerSupabaseClient().from("direct_messages").select("*").in("id", missing);
    for (const row of (data || []) as DirectMessageRow[]) known.set(row.id, row);
  }

  return rows.map((row) => {
    const original = row.reply_to_id ? known.get(row.reply_to_id) : undefined;
    if (!original) return { ...row, reply_to: null as ReplyPreview | null };
    return {
      ...row,
      reply_to: {
        id: original.id,
        excerpt: excerptOf(original),
        outgoing: viewerIsSender(original, viewer),
        deleted: Boolean(original.deleted_for_everyone_at),
      } as ReplyPreview,
    };
  });
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

/** id -> display label for every participant referenced by the given rows. */
export async function participantLabels(rows: DirectMessageRow[]) {
  const supabase = createServerSupabaseClient();
  const userIds = new Set<string>();
  const anonIds = new Set<string>();

  for (const row of rows) {
    if (row.anon_visitor_id) anonIds.add(row.anon_visitor_id);
    if (row.sender_id) userIds.add(row.sender_id);
    if (row.recipient_id) userIds.add(row.recipient_id);
  }

  const labels = new Map<string, string>();
  const ips = new Map<string, string | null>();

  if (userIds.size > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, is_super_admin")
      .in("id", [...userIds]);
    for (const profile of data || []) {
      // Usernames only. Emails are never sent to the client here.
      const label = profile.is_super_admin
        ? OWNER_LABEL
        : (profile.username as string | null) || (profile.display_name as string | null) || "Guest";
      labels.set(profile.id as string, label);
    }
  }

  if (anonIds.size > 0) {
    const { data } = await supabase.from("anon_visitors").select("id, label, ip").in("id", [...anonIds]);
    for (const visitor of data || []) {
      labels.set(visitor.id as string, visitor.label as string);
      ips.set(visitor.id as string, (visitor.ip as string | null) || null);
    }
  }

  return { labels, ips };
}

/** Groups messages into conversations for the sidebar. */
export function buildThreads(
  rows: DirectMessageRow[],
  viewer: Viewer,
  labels: Map<string, string>,
  ips: Map<string, string | null>,
): ThreadSummary[] {
  const byKey = new Map<string, DirectMessageRow[]>();
  for (const row of rows) {
    const key = threadKeyOf(row);
    byKey.set(key, [...(byKey.get(key) || []), row]);
  }

  const viewerId = viewer.userId || viewer.anonVisitorId;

  return [...byKey.entries()]
    .map(([key, group]) => {
      const sorted = [...group].sort((left, right) => left.created_at.localeCompare(right.created_at));
      const last = sorted[sorted.length - 1];
      const anonId = last.anon_visitor_id || null;

      const ids = anonId
        ? [anonId, last.sender_id || last.recipient_id].filter((id): id is string => Boolean(id))
        : [last.sender_id, last.recipient_id].filter((id): id is string => Boolean(id));

      const participant = Boolean(viewerId && ids.includes(viewerId));
      const peerId = participant ? ids.find((id) => id !== viewerId) || null : null;

      const title = participant
        ? labels.get(peerId || "") || "Unknown"
        : ids.map((id) => labels.get(id) || "Unknown").join(" ↔ ");

      const unread = sorted.filter(
        (row) => !row.read_at && !row.deleted_for_everyone_at && viewerId && !viewerIsSender(row, viewer),
      ).length;

      return {
        key,
        kind: anonId ? ("anon" as const) : ("pair" as const),
        title,
        subtitle: participant ? null : "not your conversation",
        peerId,
        participant,
        lastBody: last.deleted_for_everyone_at
          ? "Message deleted"
          : callSummary(last) || (last.body || "").trim() || "Attachment",
        lastAt: last.created_at,
        unread: participant ? unread : 0,
        ip: anonId ? ips.get(anonId) || null : null,
      };
    })
    .sort((left, right) => right.lastAt.localeCompare(left.lastAt));
}

const UUID_RE = /^[0-9a-f-]{36}$/i;

export type RowIdentity = Pick<DirectMessageRow, "sender_id" | "recipient_id" | "anon_visitor_id">;

/**
 * Works out which conversation a new row belongs to, applying the same rules
 * for messages and call events: anonymous visitors always reach the owner,
 * only the owner may write into an anonymous thread, and any signed-in account
 * may message any other.
 */
export async function resolveRowIdentity(options: {
  request: Request;
  userId: string | null;
  admin: boolean;
  adminId: string;
  recipientId: string;
}): Promise<{ identity?: RowIdentity; issuedToken?: string | null; error?: string; status?: number }> {
  const supabase = createServerSupabaseClient();

  if (!options.userId) {
    const resolved = await resolveAnonVisitor(options.request, { create: true });
    if (!resolved.visitor) return { error: "Could not identify this visitor.", status: 400 };
    return {
      identity: { sender_id: null, recipient_id: options.adminId, anon_visitor_id: resolved.visitor.id },
      issuedToken: resolved.issuedToken,
    };
  }

  const target = UUID_RE.test(options.recipientId) ? options.recipientId : options.adminId;
  if (target === options.userId) return { error: "You cannot message yourself.", status: 400 };

  const { data: anonTarget } = await supabase.from("anon_visitors").select("id").eq("id", target).maybeSingle();
  if (anonTarget) {
    if (!options.admin) return { error: "Choose someone to message.", status: 403 };
    return { identity: { sender_id: options.userId, recipient_id: null, anon_visitor_id: target } };
  }

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", target).maybeSingle();
  if (!profile) return { error: "That person no longer exists.", status: 404 };
  return { identity: { sender_id: options.userId, recipient_id: target, anon_visitor_id: null } };
}
