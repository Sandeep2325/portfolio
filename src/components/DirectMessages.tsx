"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlineEyeSlash,
  HiOutlinePhoto,
  HiOutlinePaperClip,
  HiOutlineMicrophone,
  HiOutlineStop,
  HiOutlineArrowPath,
  HiOutlineEllipsisHorizontal,
  HiOutlineTrash,
  HiOutlineArrowUturnLeft,
  HiOutlineXMark,
  HiOutlinePhone,
  HiOutlineVideoCamera,
  HiOutlineEllipsisVertical,
  HiOutlineChevronLeft,
  HiOutlinePhoneArrowUpRight,
  HiOutlinePhoneArrowDownLeft,
  HiOutlinePhoneXMark,
} from "react-icons/hi2";
import { browserSupabase } from "@/lib/supabase-browser";
import { primeRealtimeAuth, isDeadChannelStatus } from "@/lib/realtime";
import { useConversationChannel } from "@/hooks/useConversationChannel";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { isRecentlyActive, relativeTime } from "@/lib/relative-time";
import { setActiveConversation } from "@/lib/dm-focus";
import {
  FILE_INPUT_ACCEPT,
  MAX_ATTACHMENT_SIZE,
  formatBytes,
  formatDuration,
  resolveKind,
  type AttachmentKind,
} from "@/lib/attachments";
import MessageAttachment, { type MessageAttachmentData } from "./MessageAttachment";
import NotificationSetting from "./NotificationSetting";
import CallPanel from "./CallPanel";
import ConversationList, { type Person, type ThreadSummary } from "./ConversationList";
import { useConnections } from "@/hooks/useConnections";
import { useCall, type CallOutcome } from "@/hooks/useCall";

const PRESENCE_POLL_MS = 60_000;
/** Signed URLs last an hour; refresh a little before that. */
const RESIGN_INTERVAL_MS = 50 * 60_000;
/** Backstop sync, in case realtime silently misses something. */
const CATCH_UP_INTERVAL_MS = 20_000;
/** Anonymous visitors get no realtime (RLS blocks it), so they poll faster. */
const ANON_CATCH_UP_INTERVAL_MS = 5_000;
const REJOIN_DELAY_MS = 1500;

type Message = {
  id: number;
  /** Null on a message sent by an anonymous visitor. */
  sender_id: string | null;
  /** Null on a message the owner sent to an anonymous visitor. */
  recipient_id: string | null;
  /** Set on both sides of an anonymous thread; this is its identity. */
  anon_visitor_id?: string | null;
  body: string;
  attachment_path?: string | null;
  attachment_kind?: AttachmentKind | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  attachment_duration_ms?: number | null;
  attachment?: MessageAttachmentData | null;
  read_at?: string | null;
  deleted_for_everyone_at?: string | null;
  reply_to_id?: number | null;
  call_kind?: "voice" | "video" | null;
  call_status?: "completed" | "missed" | "declined" | null;
  call_duration_seconds?: number | null;
  reply_to?: ReplyPreview | null;
  created_at: string;
  /** Set only on locally-created bubbles that have not been confirmed yet. */
  status?: "sending" | "failed";
};

type ReplyPreview = { id: number; excerpt: string; outgoing: boolean; deleted: boolean };

type Owner = { id: string; label: string; lastSeenAt: string | null };
type Pending = { file: File; kind: AttachmentKind; previewUrl: string | null; durationMs: number | null };
type RetryPayload = { text: string; file: File | null; durationMs: number | null; replyToId: number | null };

const KIND_EXCERPT: Record<string, string> = {
  image: "📷 Photo",
  audio: "🎤 Voice message",
  file: "📎 Attachment",
};

/** Builds a quote preview from a message we already hold locally. */
function previewOf(original: Message, viewerSent: boolean): ReplyPreview {
  const text = (original.body || "").trim();
  const excerpt = original.deleted_for_everyone_at
    ? "This message was deleted"
    : text
      ? text.length > 90
        ? `${text.slice(0, 90)}…`
        : text
      : original.attachment_kind
        ? KIND_EXCERPT[original.attachment_kind]
        : "Message";
  return { id: original.id, excerpt, outgoing: viewerSent, deleted: Boolean(original.deleted_for_everyone_at) };
}

/** Sidebar preview for a call event, mirroring the server's wording. */
function callPreview(message: Message) {
  if (!message.call_kind) return null;
  const noun = message.call_kind === "video" ? "Video call" : "Voice call";
  if (message.call_status === "declined") return `${noun} declined`;
  if (message.call_status === "missed") return `Missed ${noun.toLowerCase()}`;
  const total = message.call_duration_seconds || 0;
  return `${noun} · ${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Mirrors the server's thread key so the client can group the same way. */
function threadKeyOf(message: Message) {
  if (message.anon_visitor_id) return `anon:${message.anon_visitor_id}`;
  return `pair:${[message.sender_id, message.recipient_id].filter(Boolean).sort().join("|")}`;
}

/** Realtime rows arrive as raw columns; rebuild the attachment shape the UI uses. */
function hydrate(row: Message): Message {
  if (row.attachment) return row;
  if (!row.attachment_path) return { ...row, attachment: null };
  return {
    ...row,
    attachment: {
      url: null,
      kind: row.attachment_kind || "file",
      name: row.attachment_name || "attachment",
      mime: row.attachment_mime || "",
      size: row.attachment_size || 0,
      durationMs: row.attachment_duration_ms || null,
    },
  };
}

/** Upsert by id and keep the thread in send order. */
function merge(current: Message[], incoming: Message[]) {
  if (incoming.length === 0) return current;
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message });
  return [...byId.values()].sort((left, right) => left.created_at.localeCompare(right.created_at));
}

export default function DirectMessages({ isVisible = true }: { isVisible?: boolean }) {
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [admin, setAdmin] = useState(false);
  const [userId, setUserId] = useState("");
  const [serverThreads, setServerThreads] = useState<ThreadSummary[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [people, setPeople] = useState<Person[]>([]);
  const [activeKey, setActiveKey] = useState("");
  const [draftPeer, setDraftPeer] = useState<Person | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);

  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [threadMenu, setThreadMenu] = useState(false);
  // Narrow screens show either the list or the thread, never both.
  const [mobilePane, setMobilePane] = useState<"list" | "thread">("list");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [visitorLabel, setVisitorLabel] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const syncedAtRef = useRef("");
  const optimisticSeq = useRef(0);
  const retryPayloads = useRef(new Map<number, RetryPayload>());

  const recorder = useAudioRecorder();
  const connections = useConnections(!anonymous && Boolean(token));

  /**
   * Which side of the thread a message sits on. Anonymous threads cannot use
   * sender_id, because it is null for whichever side the visitor sent.
   */
  const isIncoming = useCallback(
    (message: Message) => {
      if (message.anon_visitor_id) {
        // Viewer is the anonymous visitor: the owner's replies come in.
        // Viewer is the owner: the visitor's messages (no sender) come in.
        return anonymous ? message.sender_id !== null : message.sender_id === null;
      }
      return message.sender_id !== userId;
    },
    [anonymous, userId],
  );

  const threads = useMemo(() => {
    if (messages.length === 0) return serverThreads;
    const ipByKey = new Map(serverThreads.map((thread) => [thread.key, thread.ip]));
    const viewerId = userId;

    const grouped = new Map<string, Message[]>();
    for (const message of messages) {
      const key = threadKeyOf(message);
      grouped.set(key, [...(grouped.get(key) || []), message]);
    }

    return [...grouped.entries()]
      .map(([key, group]) => {
        const sorted = [...group].sort((left, right) => left.created_at.localeCompare(right.created_at));
        const last = sorted[sorted.length - 1];
        const anonId = last.anon_visitor_id || null;
        const ids = (anonId
          ? [anonId, last.sender_id || last.recipient_id]
          : [last.sender_id, last.recipient_id]
        ).filter((id): id is string => Boolean(id));

        const participant = Boolean(viewerId && ids.includes(viewerId));
        const peerId = participant ? ids.find((id) => id !== viewerId) || null : null;
        const title = participant
          ? labels[peerId || ""] || "Unknown"
          : ids.map((id) => labels[id] || "Unknown").join(" ↔ ");

        return {
          key,
          kind: anonId ? ("anon" as const) : ("pair" as const),
          title,
          subtitle: participant ? null : "not your conversation",
          peerId,
          participant,
          lastBody: last.deleted_for_everyone_at
            ? "Message deleted"
            : callPreview(last) || (last.body || "").trim() || "Attachment",
          lastAt: last.created_at,
          unread: participant ? sorted.filter((item) => !item.read_at && isIncoming(item)).length : 0,
          ip: ipByKey.get(key) ?? null,
        };
      })
      .sort((left, right) => right.lastAt.localeCompare(left.lastAt));
  }, [messages, serverThreads, labels, userId, isIncoming]);

  const activeThread = threads.find((thread) => thread.key === activeKey) || null;

  // A draft is a chosen person with no messages yet; it behaves like a thread.
  /*
   * An anonymous visitor only ever has one conversation - with the owner - and
   * it does not exist until their first message, so they must be able to write
   * before any thread is on record.
   */
  const peerId = anonymous ? owner?.id || "" : draftPeer?.id || activeThread?.peerId || "";
  const recipientId = anonymous ? "" : peerId;
  const canWrite = anonymous ? true : Boolean(draftPeer) || (activeThread ? activeThread.participant : false);
  const peerLabel =
    draftPeer?.label || activeThread?.title || (anonymous ? owner?.label || "Sandeep Gowda" : "Select a chat");

  const { peerOnline, peerTyping, notifyTyping, stopTyping } = useConversationChannel(userId, peerId, token);


  useEffect(() => {
    if (menuFor === null) return;
    // pointerdown fires before click, so a naive close would unmount the menu
    // item before its own click could land. Ignore presses inside the menu.
    const close = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest?.(".dm-menu")) return;
      setMenuFor(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuFor]);

  useEffect(() => {
    if (!threadMenu) return;
    const close = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest?.(".dm-thread-menu")) return;
      setThreadMenu(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [threadMenu]);

  // Suppress banners only while this thread is genuinely on screen. A minimized
  // window keeps this component mounted, and claiming focus from there would
  // swallow notifications and mark messages read behind the user's back.
  useEffect(() => {
    setActiveConversation(isVisible ? peerId || null : null);
    return () => setActiveConversation(null);
  }, [peerId, isVisible]);

  /**
   * Reads the current access token straight from Supabase rather than from
   * React state, so a token refreshed since mount is picked up immediately.
   */
  const currentToken = useCallback(async () => {
    if (!browserSupabase) return "";
    const { data } = await browserSupabase.auth.getSession();
    const accessToken = data.session?.access_token || "";
    setToken((previous) => (previous === accessToken ? previous : accessToken));
    return accessToken;
  }, []);

  /** Fetches fresh signed URLs for the given messages. */
  const signAttachments = useCallback(async (ids: number[], accessToken: string) => {
    const real = ids.filter((id) => id > 0);
    if (real.length === 0) return;
    try {
      const response = await fetch("/api/messages/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ids: real }),
      });
      if (!response.ok) return;
      const { urls } = (await response.json()) as { urls: Record<string, string> };
      setMessages((current) =>
        current.map((item) =>
          item.attachment && urls[item.id] ? { ...item, attachment: { ...item.attachment, url: urls[item.id] } } : item,
        ),
      );
    } catch {
      // Attachment shows as unavailable until the next refresh.
    }
  }, []);

  /** The caller logs the call into the thread once it finishes. */
  const logCall = useCallback(
    async (outcome: CallOutcome) => {
      try {
        const accessToken = await currentToken();
        const response = await fetch("/api/messages/call", {
          method: "POST",
          headers: accessToken
            ? { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }
            : { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientId,
            callKind: outcome.kind,
            callStatus: outcome.status,
            durationSeconds: outcome.durationSeconds,
          }),
        });
        if (!response.ok) return;
        const data = await response.json();
        const saved = hydrate(data.message as Message);
        setMessages((current) => (current.some((item) => item.id === saved.id) ? current : merge(current, [saved])));
      } catch {
        // A missing history row should never surface as a call failure.
      }
    },
    [currentToken, recipientId],
  );

  const call = useCall(userId, peerId, logCall);

  /** Pulls anything created or read since the last successful sync. */
  const catchUp = useCallback(
    async () => {
      if (!syncedAtRef.current) return;
      try {
        const accessToken = await currentToken();
        const response = await fetch(`/api/messages?since=${encodeURIComponent(syncedAtRef.current)}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = await response.json();
        const incoming = (payload.messages as Message[]).map(hydrate);
        if (incoming.length > 0) setMessages((current) => merge(current, incoming));
        if (payload.syncedAt) syncedAtRef.current = payload.syncedAt;
      } catch {
        // Next tick tries again.
      }
    },
    [currentToken],
  );

  /** Loads the thread and the viewer's role. Safe to re-run at any time. */
  const loadThread = useCallback(async () => {
    if (!browserSupabase) return;

    const fetchOnce = async (accessToken: string) =>
      fetch("/api/messages", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: "no-store",
      });

    let accessToken = await currentToken();
    let response = await fetchOnce(accessToken);
    let payload = await response.json();

    // The session can still be settling on a cold load. If the server says we
    // are anonymous while a session actually exists, refresh once and retry
    // rather than leaving the panel stuck on the signed-out view.
    if (response.ok && payload.anonymous) {
      const { data: refreshed } = await browserSupabase.auth.refreshSession();
      const retryToken = refreshed.session?.access_token || (await currentToken());
      if (retryToken && retryToken !== accessToken) {
        accessToken = retryToken;
        setToken(retryToken);
        response = await fetchOnce(retryToken);
        payload = await response.json();
      }
    }

    if (!response.ok) {
      setError(payload.error || "Could not load messages.");
      return;
    }

    setError("");
    setMessages((payload.messages as Message[]).map(hydrate));
    setAdmin(payload.admin);
    setUserId(payload.userId);
    const nextThreads = (payload.threads || []) as ThreadSummary[];
    setServerThreads(nextThreads);
    setLabels(payload.labels || {});
    // Keep the current chat selected across refreshes; otherwise open the newest.
    setActiveKey((current) => {
      if (current && nextThreads.some((thread) => thread.key === current)) return current;
      return nextThreads[0]?.key || "";
    });
    setOwner(payload.owner || null);
    setAnonymous(Boolean(payload.anonymous));
    setVisitorLabel(payload.visitorLabel || "");
    syncedAtRef.current = payload.syncedAt || new Date().toISOString();
    if (payload.owner) setPeerLastSeen(payload.owner.lastSeenAt);
  }, [currentToken]);

  useEffect(() => {
    void loadThread();
    if (!browserSupabase) return;

    // Signing in, signing out, or a token refresh all change who this panel is
    // for. Without this the thread keeps whatever state it had at mount, which
    // is how a signed-in visitor could end up staring at the sign-in chip.
    const { data } = browserSupabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        void loadThread();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [loadThread]);

  // Everyone a signed-in visitor can start a chat with.
  useEffect(() => {
    if (anonymous || !token) return;
    void (async () => {
      try {
        const response = await fetch("/api/users/directory", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = await response.json();
        setPeople(payload.people || []);
      } catch {
        // Picker just stays empty.
      }
    })();
  }, [anonymous, token]);

  // Realtime, with re-auth on token refresh and a rejoin if the channel dies.
  useEffect(() => {
    if (!browserSupabase || !userId || !token || anonymous) return;
    const supabase = browserSupabase;

    let channel: ReturnType<typeof supabase.channel> | undefined;
    let rejoinTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = async () => {
      if (cancelled) return;
      await primeRealtimeAuth(supabase);
      if (cancelled) return;

      channel = supabase
        .channel(`direct-messages-${userId}-${Date.now()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (event) => {
          const incoming = hydrate(event.new as Message);
          setMessages((current) => {
            // Realtime carries reply_to_id but no preview; build it locally.
            if (incoming.reply_to_id && !incoming.reply_to) {
              const original = current.find((item) => item.id === incoming.reply_to_id);
              if (original) incoming.reply_to = previewOf(original, !isIncoming(original));
            }
            if (current.some((item) => item.id === incoming.id)) return current;
            // Our own send may already be on screen as an optimistic bubble.
            const optimistic = current.find(
              (item) => item.status === "sending" && item.sender_id === incoming.sender_id && item.body === incoming.body,
            );
            if (optimistic) {
              retryPayloads.current.delete(optimistic.id);
              return current.map((item) => (item.id === optimistic.id ? incoming : item));
            }
            return [...current, incoming];
          });
          if (incoming.created_at > syncedAtRef.current) syncedAtRef.current = incoming.created_at;
          if (incoming.attachment) void signAttachments([incoming.id], token);
        })
        // Read receipts: the peer stamping read_at arrives as an UPDATE.
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, (event) => {
          const updated = event.new as Message;
          setMessages((current) =>
            current.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    read_at: updated.read_at,
                    deleted_for_everyone_at: updated.deleted_for_everyone_at,
                    // A tombstone drops its content on both sides.
                    ...(updated.deleted_for_everyone_at ? { body: " ", attachment: null } : {}),
                  }
                : item,
            ),
          );
        })
        .subscribe((status) => {
          if (cancelled) return;
          // Whatever happened while we were disconnected, pull it now.
          if (status === "SUBSCRIBED") void catchUp();
          else if (isDeadChannelStatus(status)) {
            if (rejoinTimer) clearTimeout(rejoinTimer);
            rejoinTimer = setTimeout(() => {
              if (cancelled) return;
              if (channel) void supabase.removeChannel(channel);
              void connect();
            }, REJOIN_DELAY_MS);
          }
        });
    };

    void connect();

    return () => {
      cancelled = true;
      if (rejoinTimer) clearTimeout(rejoinTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, token, anonymous, signAttachments, catchUp, isIncoming]);

  // Backstop: re-sync when the tab comes back and on a slow timer.
  useEffect(() => {
    if (!token && !anonymous) return;
    const run = () => {
      if (document.visibilityState === "visible") void catchUp();
    };
    const timer = setInterval(run, anonymous ? ANON_CATCH_UP_INTERVAL_MS : CATCH_UP_INTERVAL_MS);
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [token, anonymous, catchUp]);

  // Signed URLs expire, so re-sign everything still on screen periodically.
  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      const ids = messages.filter((message) => message.attachment).map((message) => message.id);
      void signAttachments(ids, token);
    }, RESIGN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [token, messages, signAttachments]);

  // Poll the peer's last-seen so "last seen" stays honest without a page reload.
  useEffect(() => {
    if (!token || !peerId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/presence?userId=${peerId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const data = await response.json();
        setPeerLastSeen(data.lastSeenAt || null);
      } catch {
        // Keep the previous value.
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), PRESENCE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token, peerId]);

  const visibleMessages = useMemo(() => {
    // An anonymous visitor is only ever served their own single thread.
    if (anonymous) return messages;
    if (!activeKey) return [];
    return messages.filter((message) => threadKeyOf(message) === activeKey);
  }, [messages, activeKey, anonymous]);

  const markRead = useCallback(async () => {
    if ((!token && !anonymous) || !peerId || !isVisible || document.visibilityState !== "visible") return;
    const unread = visibleMessages.filter(
      (message) => !message.read_at && (message.anon_visitor_id ? isIncoming(message) : message.sender_id === peerId),
    );
    if (unread.length === 0) return;

    try {
      const accessToken = await currentToken();
      const response = await fetch("/api/messages/read", {
        method: "POST",
        headers: accessToken
          ? { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }
          : { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId }),
      });
      if (!response.ok) return;
      const { readAt } = await response.json();
      const ids = new Set(unread.map((message) => message.id));
      setMessages((current) => current.map((item) => (ids.has(item.id) ? { ...item, read_at: readAt } : item)));
    } catch {
      // Retried the next time this effect runs.
    }
  }, [token, anonymous, peerId, visibleMessages, isVisible, isIncoming, currentToken]);

  useEffect(() => {
    void markRead();
    const onVisible = () => void markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  useEffect(() => {
    // Only chase the newest message once there is one, otherwise an empty
    // thread scrolls its own banner out of view.
    if (visibleMessages.length === 0) return;
    listEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [visibleMessages.length, peerTyping]);

  // A finished recording becomes the pending attachment.
  useEffect(() => {
    if (!recorder.clip) return;
    const extension = recorder.clip.mime.includes("mp4") ? "m4a" : "webm";
    const file = new File([recorder.clip.blob], `voice-message.${extension}`, { type: recorder.clip.mime });
    setPending({ file, kind: "audio", previewUrl: recorder.clip.url, durationMs: recorder.clip.durationMs });
  }, [recorder.clip]);

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError("Attachments must be smaller than 20 MB.");
      return;
    }
    const kind = resolveKind(file.type, file.name);
    if (!kind) {
      setError("That file type is not supported.");
      return;
    }

    setError("");
    recorder.discard();
    setPending({ file, kind, previewUrl: kind === "image" ? URL.createObjectURL(file) : null, durationMs: null });
  }

  const clearPending = useCallback(() => {
    setPending((current) => {
      if (current?.previewUrl && current.kind === "image") URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    recorder.discard();
  }, [recorder]);

  /**
   * Posts a message that is already on screen as an optimistic bubble, then
   * swaps in the server row (or marks the bubble failed).
   */
  const deliver = useCallback(
    async (optimisticId: number, payloadData: RetryPayload, target: string) => {
      retryPayloads.current.set(optimisticId, payloadData);
      setMessages((current) =>
        current.map((item) => (item.id === optimisticId ? { ...item, status: "sending" } : item)),
      );

      try {
        const payload = new FormData();
        payload.set("body", payloadData.text);
        payload.set("recipientId", target);
        if (payloadData.file) {
          payload.set("attachment", payloadData.file);
          if (payloadData.durationMs) payload.set("durationMs", String(payloadData.durationMs));
        }
        if (payloadData.replyToId) payload.set("replyToId", String(payloadData.replyToId));

        const accessToken = await currentToken();
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          body: payload,
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Could not send message.");
          setMessages((current) =>
            current.map((item) => (item.id === optimisticId ? { ...item, status: "failed" } : item)),
          );
          return;
        }

        const saved = hydrate(data.message as Message);
        setDraftPeer(null);
        setActiveKey(threadKeyOf(saved));
        retryPayloads.current.delete(optimisticId);
        setMessages((current) => {
          /*
           * Realtime may have delivered this row before the POST returned, in
           * which case it already replaced the optimistic bubble. Dropping the
           * optimistic id and then upserting is safe either way; the previous
           * version removed the real row and then had no optimistic left to
           * swap, losing the message from the sender's own thread.
           */
          const withoutOptimistic = current.filter((item) => item.id !== optimisticId);
          return withoutOptimistic.some((item) => item.id === saved.id)
            ? withoutOptimistic
            : merge(withoutOptimistic, [saved]);
        });
        if (saved.created_at > syncedAtRef.current) syncedAtRef.current = saved.created_at;
      } catch {
        setError("Could not send message. Check your connection.");
        setMessages((current) =>
          current.map((item) => (item.id === optimisticId ? { ...item, status: "failed" } : item)),
        );
      }
    },
    [currentToken],
  );

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      setError(activeThread && !activeThread.participant ? "This is not your conversation." : "Choose someone to message first.");
      return;
    }

    const formElement = event.currentTarget;
    const text = String(new FormData(formElement).get("message") || "").trim();
    if (!text && !pending) {
      setError("Write a message or attach something.");
      return;
    }

    setError("");
    stopTyping();

    // Render it straight away; the network round trip happens behind the bubble.
    optimisticSeq.current -= 1;
    const optimisticId = optimisticSeq.current;
    const optimistic: Message = {
      id: optimisticId,
      sender_id: userId,
      recipient_id: peerId,
      body: text || " ",
      created_at: new Date().toISOString(),
      read_at: null,
      status: "sending",
      reply_to_id: replyTo?.id || null,
      reply_to: replyTo,
      attachment: pending
        ? {
            url: pending.previewUrl,
            kind: pending.kind,
            name: pending.file.name,
            mime: pending.file.type,
            size: pending.file.size,
            durationMs: pending.durationMs,
          }
        : null,
    };

    setMessages((current) => [...current, optimistic]);

    const payloadData: RetryPayload = {
      text,
      file: pending?.file || null,
      durationMs: pending?.durationMs || null,
      replyToId: replyTo?.id || null,
    };
    formElement.reset();
    // Keep the object URL alive for the optimistic bubble's preview.
    setPending(null);
    setReplyTo(null);
    recorder.discard();
    textareaRef.current?.focus();

    void deliver(optimisticId, payloadData, recipientId);
  }

  async function remove(messageId: number, scope: "me" | "everyone") {
    if (deletingId !== null) return;
    if (scope === "everyone" && !window.confirm("Delete this message for everyone? This cannot be undone.")) return;

    setMenuFor(null);
    setDeletingId(messageId);
    setError("");
    try {
      const accessToken = await currentToken();
      const response = await fetch("/api/messages", {
        method: "DELETE",
        headers: accessToken
          ? { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }
          : { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, scope }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not delete message.");
        return;
      }

      if (scope === "me") {
        setMessages((current) => current.filter((item) => item.id !== messageId));
      } else {
        // Both sides show a tombstone; the peer gets it over realtime.
        setMessages((current) =>
          current.map((item) =>
            item.id === messageId
              ? { ...item, deleted_for_everyone_at: new Date().toISOString(), body: " ", attachment: null }
              : item,
          ),
        );
      }
    } catch {
      setError("Could not delete message. Check your connection.");
    } finally {
      setDeletingId(null);
    }
  }

  async function removeConversation(scope: "me" | "everyone") {
    if (!activeKey) return;
    const label = scope === "everyone" ? "for everyone" : "for you";
    if (!window.confirm(`Delete this conversation ${label}? This cannot be undone.`)) return;

    setError("");
    try {
      const accessToken = await currentToken();
      const response = await fetch("/api/messages/conversation", {
        method: "DELETE",
        headers: accessToken
          ? { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }
          : { "Content-Type": "application/json" },
        body: JSON.stringify({ threadKey: activeKey, scope }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not delete the conversation.");
        return;
      }
      await loadThread();
      if (scope === "me") setActiveKey("");
    } catch {
      setError("Could not delete the conversation.");
    }
  }

  function jumpTo(messageId: number) {
    const node = document.getElementById(`dm-${messageId}`);
    if (!node) return;
    node.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlightId(messageId);
    setTimeout(() => setHighlightId((current) => (current === messageId ? null : current)), 1600);
  }

  function retry(optimisticId: number) {
    const payloadData = retryPayloads.current.get(optimisticId);
    if (!payloadData) return;
    setError("");
    void deliver(optimisticId, payloadData, recipientId);
  }

  function discardFailed(optimisticId: number) {
    retryPayloads.current.delete(optimisticId);
    setMessages((current) => current.filter((item) => item.id !== optimisticId));
  }

  const blocked = !canWrite;
  const spectating = Boolean(!anonymous && activeThread && !activeThread.participant);

  /*
   * The owner is reachable by anyone and can reach anyone, so the gate only
   * applies between two ordinary accounts.
   */
  const peerIsOwner = Boolean(peerId && peerId === owner?.id);
  const peerState = peerId && !anonymous && !admin && !peerIsOwner ? connections.stateFor(peerId) : "connected";
  const needsConnection = peerState !== "connected";
  const pendingConnection = peerId ? connections.connectionFor(peerId) : null;
  const active = peerOnline || isRecentlyActive(peerLastSeen);
  const lastSeenLabel = relativeTime(peerLastSeen);
  const recording = recorder.state === "recording" || recorder.state === "requesting";

  return (
    <section
      className={`surface messages-panel px-6 py-6 sm:px-8${anonymous ? "" : " has-sidebar"} pane-${mobilePane}`}
    >
      {!anonymous && (
        <ConversationList
          threads={threads}
          people={people}
          activeKey={activeKey}
          onSelect={(thread) => {
            setDraftPeer(null);
            setActiveKey(thread.key);
            setThreadMenu(false);
            setMobilePane("thread");
          }}
          onStartWith={(person) => {
            const key = `pair:${[userId, person.id].sort().join("|")}`;
            const existing = threads.find((thread) => thread.key === key);
            if (existing) {
              setDraftPeer(null);
              setActiveKey(existing.key);
            } else {
              setDraftPeer(person);
              setActiveKey(key);
            }
            setMobilePane("thread");
          }}
          onlineIds={new Set(peerOnline && peerId ? [peerId] : [])}
          incoming={connections.incoming}
          busyId={connections.busyId}
          stateFor={connections.stateFor}
          onRespond={(id, action) => void connections.respond(id, action)}
          onRequest={(id) => void connections.request(id)}
        />
      )}

      <div className="dm-thread">
      <div className="section-heading dm-header">
        {!anonymous && (
          <button
            type="button"
            className="dm-back"
            aria-label="Back to chats"
            onClick={() => setMobilePane("list")}
          >
            <HiOutlineChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="dm-header-main">
          <h2>{activeThread || draftPeer || anonymous ? (admin ? "Admin inbox" : peerLabel) : "Messages"}</h2>
          {blocked ? (
            <p>Pick a chat on the left, or tap ✎ to start a new one.</p>
          ) : (
            <p className="dm-presence">
              <span className={active ? "dm-dot online" : "dm-dot"} />
              <strong>{peerLabel}</strong>
              {activeThread?.kind === "anon" && <span className="dm-anon-tag">anonymous</span>}
              {peerTyping ? (
                <span className="dm-typing-label">typing…</span>
              ) : active ? (
                <span>Active now</span>
              ) : lastSeenLabel ? (
                <span>Last seen {lastSeenLabel}</span>
              ) : (
                <span>Offline</span>
              )}
            </p>
          )}
        </div>

        <div className="dm-header-actions">
          {call.supported && peerId && !needsConnection && !spectating && call.state === "idle" && (
            <>
              <button
                type="button"
                className="dm-call-btn"
                title={`Voice call ${peerLabel}`}
                aria-label={`Voice call ${peerLabel}`}
                onClick={() => void call.startCall(false)}
              >
                <HiOutlinePhone className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="dm-call-btn"
                title={`Video call ${peerLabel}`}
                aria-label={`Video call ${peerLabel}`}
                onClick={() => void call.startCall(true)}
              >
                <HiOutlineVideoCamera className="h-4 w-4" />
              </button>
            </>
          )}
          {anonymous && (
            <a href="/login" className="dm-chip" title={`Messaging anonymously${visitorLabel ? ` as ${visitorLabel}` : ""}. Sign in to keep your history.`}>
              <HiOutlineEyeSlash className="h-3.5 w-3.5" />
              Sign in
            </a>
          )}
          {!anonymous && <NotificationSetting />}

          {activeKey && (
            <div className="dm-thread-menu">
              <button
                type="button"
                className="dm-thread-btn"
                aria-label="Conversation options"
                onClick={(event) => {
                  event.stopPropagation();
                  setThreadMenu((open) => !open);
                }}
              >
                <HiOutlineEllipsisVertical className="h-4 w-4" />
              </button>
              {threadMenu && (
                <div className="dm-menu-list" onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => { setThreadMenu(false); void removeConversation("me"); }}>
                    <HiOutlineTrash className="h-3.5 w-3.5" />
                    Delete chat for me
                  </button>
                  {admin && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => { setThreadMenu(false); void removeConversation("everyone"); }}
                    >
                      <HiOutlineTrash className="h-3.5 w-3.5" />
                      Delete for everyone
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="dm-list">
        {blocked ? (
          <p className="dm-empty">No conversation selected.</p>
        ) : visibleMessages.length === 0 ? (
          <p className="dm-empty">
            {admin ? `No messages with ${peerLabel} yet. Send the first message below.` : "No messages yet. Say hello below."}
          </p>
        ) : (
          visibleMessages.map((message) => {
            const outgoing = spectating ? false : !isIncoming(message);

            if (message.call_kind) {
              const noun = message.call_kind === "video" ? "Video call" : "Voice call";
              const missed = message.call_status !== "completed";
              const total = message.call_duration_seconds || 0;
              const detail =
                message.call_status === "declined"
                  ? "Declined"
                  : message.call_status === "missed"
                    ? outgoing
                      ? "No answer"
                      : "Missed"
                    : `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;

              return (
                <div className={`dm-call-event${missed ? " missed" : ""}`} key={message.id} id={`dm-${message.id}`}>
                  <span className="dm-call-icon">
                    {missed ? (
                      <HiOutlinePhoneXMark className="h-4 w-4" />
                    ) : outgoing ? (
                      <HiOutlinePhoneArrowUpRight className="h-4 w-4" />
                    ) : (
                      <HiOutlinePhoneArrowDownLeft className="h-4 w-4" />
                    )}
                  </span>
                  <span>
                    {noun} · {detail}
                  </span>
                  <time>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                </div>
              );
            }

            const removed = Boolean(message.deleted_for_everyone_at);
            // Only a confirmed message can be deleted, and "for everyone" is
            // the sender's call (the owner can moderate anything).
            const canDelete = message.id > 0 && !message.status;
            const canDeleteForAll = canDelete && !removed && (outgoing || admin);

            return (
              <div
                className={`${outgoing ? "dm outgoing" : "dm incoming"}${message.status === "sending" ? " dm-sending" : ""}${
                  message.status === "failed" ? " dm-failed" : ""
                }${removed ? " dm-removed" : ""}${highlightId === message.id ? " dm-highlight" : ""}`}
                key={message.id}
                id={`dm-${message.id}`}
              >
                {canDelete && (
                  <div className="dm-menu">
                    <button
                      type="button"
                      className="dm-menu-trigger"
                      aria-label="Message options"
                      disabled={deletingId === message.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuFor((current) => (current === message.id ? null : message.id));
                      }}
                    >
                      <HiOutlineEllipsisHorizontal className="h-4 w-4" />
                    </button>

                    {menuFor === message.id && (
                      <div className="dm-menu-list" onClick={(event) => event.stopPropagation()}>
                        {!removed && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyTo(previewOf(message, outgoing));
                              setMenuFor(null);
                              textareaRef.current?.focus();
                            }}
                          >
                            <HiOutlineArrowUturnLeft className="h-3.5 w-3.5" />
                            Reply
                          </button>
                        )}
                        <button type="button" onClick={() => void remove(message.id, "me")}>
                          <HiOutlineTrash className="h-3.5 w-3.5" />
                          Delete for me
                        </button>
                        {canDeleteForAll && (
                          <button type="button" className="danger" onClick={() => void remove(message.id, "everyone")}>
                            <HiOutlineTrash className="h-3.5 w-3.5" />
                            Delete for everyone
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {spectating && (
                  <span className="dm-sender">
                    {message.sender_id
                      ? labels[message.sender_id] || "Unknown"
                      : labels[message.anon_visitor_id || ""] || "Anonymous"}
                  </span>
                )}

                {message.reply_to && !removed && (
                  <button type="button" className="dm-quote" onClick={() => jumpTo(message.reply_to!.id)}>
                    <span className="dm-quote-who">{message.reply_to.outgoing ? "You" : peerLabel}</span>
                    <span className={message.reply_to.deleted ? "dm-quote-text deleted" : "dm-quote-text"}>
                      {message.reply_to.excerpt}
                    </span>
                  </button>
                )}

                {removed ? (
                  <p className="dm-removed-text">
                    <HiOutlineTrash className="h-3.5 w-3.5" />
                    This message was deleted
                  </p>
                ) : (
                  <>
                    {message.body.trim() ? <p>{message.body}</p> : null}
                    {message.attachment ? <MessageAttachment attachment={message.attachment} /> : null}
                  </>
                )}

                {message.status === "failed" ? (
                  <div className="dm-retry">
                    <span>Not sent</span>
                    <button type="button" onClick={() => retry(message.id)}>
                      <HiOutlineArrowPath className="h-3.5 w-3.5" />
                      Retry
                    </button>
                    <button type="button" onClick={() => discardFailed(message.id)}>
                      Discard
                    </button>
                  </div>
                ) : (
                  <time>
                    {new Date(message.created_at).toLocaleString()}
                    {outgoing && !removed && (
                      <span className={message.read_at ? "dm-receipt read" : "dm-receipt"}>
                        {message.status === "sending" ? "· Sending…" : message.read_at ? "✓✓ Read" : "✓ Sent"}
                      </span>
                    )}
                  </time>
                )}
              </div>
            );
          })
        )}

        {peerTyping && !blocked && (
          <div className="dm incoming dm-typing" aria-live="polite">
            <span className="dm-typing-dots">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <div ref={listEndRef} />
      </div>

      {spectating ? (
        <p className="dm-readonly">
          You are viewing this conversation as the owner. Replying is disabled because you are not a participant.
        </p>
      ) : peerId && needsConnection ? (
        <div className="dm-connect-gate">
          <strong>
            {peerState === "awaiting-them"
              ? `Waiting for ${peerLabel} to accept`
              : peerState === "awaiting-you"
                ? `${peerLabel} wants to connect`
                : `Connect with ${peerLabel} to start messaging`}
          </strong>
          <span>You can only message people you are connected with.</span>
          <div className="dm-connect-actions">
            {peerState === "awaiting-you" && pendingConnection ? (
              <>
                <button
                  type="button"
                  className="primary-button"
                  disabled={connections.busyId === pendingConnection.id}
                  onClick={() => void connections.respond(pendingConnection.id, "accept")}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={connections.busyId === pendingConnection.id}
                  onClick={() => void connections.respond(pendingConnection.id, "decline")}
                >
                  Decline
                </button>
              </>
            ) : peerState === "awaiting-them" && pendingConnection ? (
              <button
                type="button"
                className="secondary-button"
                disabled={connections.busyId === pendingConnection.id}
                onClick={() => void connections.remove(pendingConnection.id)}
              >
                Withdraw request
              </button>
            ) : (
              <button
                type="button"
                className="primary-button"
                disabled={connections.busyId === peerId}
                onClick={() => void connections.request(peerId)}
              >
                {peerState === "declined" ? "Ask again" : "Send connection request"}
              </button>
            )}
          </div>
        </div>
      ) : (
      <form className="dm-form" onSubmit={send}>
        <textarea
          ref={textareaRef}
          name="message"
          maxLength={2000}
          rows={3}
          placeholder={
            admin ? (recipientId ? `Message ${peerLabel}…` : "Choose a guest above to message…") : "Write a private message…"
          }
          disabled={blocked}
          onChange={notifyTyping}
          onBlur={stopTyping}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter makes a new line.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />

        {replyTo && (
          <div className="dm-reply-bar">
            <HiOutlineArrowUturnLeft className="h-4 w-4 flex-shrink-0 text-[#4da8ff]" />
            <span className="dm-reply-bar-text">
              <strong>Replying to {replyTo.outgoing ? "yourself" : peerLabel}</strong>
              <em>{replyTo.excerpt}</em>
            </span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
              <HiOutlineXMark className="h-4 w-4" />
            </button>
          </div>
        )}

        {recording && (
          <div className="dm-recording" role="status">
            <span className="dm-recording-dot" />
            <span className="dm-recording-time">{formatDuration(recorder.elapsedMs)}</span>
            <span className="dm-level">
              {Array.from({ length: 14 }).map((_, index) => (
                <i
                  key={index}
                  style={{
                    transform: `scaleY(${
                      0.2 + Math.min(1, Math.max(0, recorder.level * 2 - Math.abs(index - 6.5) / 9)) * 0.8
                    })`,
                  }}
                />
              ))}
            </span>
            <button type="button" className="dm-recording-stop" onClick={recorder.stop}>
              <HiOutlineStop className="h-4 w-4" />
              Stop
            </button>
            <button type="button" className="dm-recording-cancel" onClick={recorder.discard}>
              Cancel
            </button>
          </div>
        )}

        {pending && !recording && (
          <div className="dm-preview">
            {pending.kind === "image" && pending.previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={pending.previewUrl} alt="Selected attachment" />
            ) : pending.kind === "audio" && pending.previewUrl ? (
              <audio controls src={pending.previewUrl} className="dm-audio-player" />
            ) : (
              <span className="dm-preview-icon">
                <HiOutlinePaperClip className="h-5 w-5" />
              </span>
            )}
            <span className="dm-preview-name">
              {pending.kind === "audio" ? `Voice message · ${formatDuration(pending.durationMs)}` : pending.file.name}
              {pending.kind !== "audio" ? ` · ${formatBytes(pending.file.size)}` : ""}
            </span>
            <button type="button" onClick={clearPending}>
              Remove
            </button>
          </div>
        )}

        {recorder.error && <p className="feed-error">{recorder.error}</p>}

        <div className="dm-form-footer">
          <div className="dm-tools">
            <label className="dm-attach" aria-disabled={blocked}>
              <HiOutlinePhoto className="h-4 w-4" />
              <span className="dm-attach-label">Photo</span>
              <input type="file" accept="image/*" onChange={choose} disabled={blocked} />
            </label>

            <label className="dm-attach" aria-disabled={blocked}>
              <HiOutlinePaperClip className="h-4 w-4" />
              <span className="dm-attach-label">File</span>
              <input ref={fileInputRef} type="file" accept={FILE_INPUT_ACCEPT} onChange={choose} disabled={blocked} />
            </label>

            {recorder.supported && !recording && (
              <button type="button" className="dm-attach" onClick={() => void recorder.start()} disabled={blocked}>
                <HiOutlineMicrophone className="h-4 w-4" />
                <span className="dm-attach-label">{pending?.kind === "audio" ? "Re-record" : "Voice"}</span>
              </button>
            )}
          </div>

          <button className="primary-button" disabled={blocked || recording} type="submit">
            Send
          </button>
        </div>
      </form>
      )}

        {error && <p className="feed-error">{error}</p>}
      </div>

      <CallPanel call={call} peerLabel={peerLabel} />
    </section>
  );
}
