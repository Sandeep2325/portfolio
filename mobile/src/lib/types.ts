export type AttachmentKind = "image" | "audio" | "file";

export type Attachment = {
  url: string | null;
  kind: AttachmentKind;
  name: string;
  mime: string;
  size: number;
  durationMs: number | null;
};

export type ReplyPreview = { id: number; excerpt: string; outgoing: boolean; deleted: boolean };

export type Message = {
  id: number;
  sender_id: string | null;
  recipient_id: string | null;
  anon_visitor_id?: string | null;
  body: string;
  attachment?: Attachment | null;
  reply_to_id?: number | null;
  reply_to?: ReplyPreview | null;
  read_at?: string | null;
  deleted_for_everyone_at?: string | null;
  call_kind?: "voice" | "video" | null;
  call_status?: "completed" | "missed" | "declined" | null;
  call_duration_seconds?: number | null;
  created_at: string;
  /** Client-only, for optimistic bubbles. */
  status?: "sending" | "failed";
};

export type ThreadSummary = {
  key: string;
  kind: "anon" | "pair";
  title: string;
  subtitle: string | null;
  peerId: string | null;
  participant: boolean;
  lastBody: string;
  lastAt: string;
  unread: number;
  ip: string | null;
};

export type MessagesPayload = {
  messages: Message[];
  admin: boolean;
  userId: string;
  threads: ThreadSummary[];
  labels: Record<string, string>;
  owner: { id: string; label: string; lastSeenAt: string | null } | null;
  syncedAt: string;
};

export type Person = { id: string; label: string; isOwner: boolean; lastSeenAt: string | null };

export type Connection = {
  id: string;
  peerId: string;
  peerLabel: string;
  status: "pending" | "accepted" | "declined";
  outgoing: boolean;
  createdAt: string;
};

export type ThingsPost = {
  id: number;
  title: string;
  body: string;
  image_url: string | null;
  created_at: string;
  comments: { id: number; post_id: number; author_name: string; body: string; created_at: string }[];
  likes: { post_id: number; visitor_id: string }[];
};

/** Mirrors the server's conversation key so the client groups identically. */
export function threadKeyOf(message: Message) {
  if (message.anon_visitor_id) return `anon:${message.anon_visitor_id}`;
  return `pair:${[message.sender_id, message.recipient_id].filter(Boolean).sort().join("|")}`;
}

export function callSummary(message: Message) {
  if (!message.call_kind) return null;
  const noun = message.call_kind === "video" ? "Video call" : "Voice call";
  if (message.call_status === "declined") return `${noun} declined`;
  if (message.call_status === "missed") return `Missed ${noun.toLowerCase()}`;
  const total = message.call_duration_seconds || 0;
  return `${noun} · ${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function relativeTime(value: string | null | undefined) {
  if (!value) return "";
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed < 60_000) return "now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  if (elapsed < 604_800_000) return `${Math.floor(elapsed / 86_400_000)}d`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
