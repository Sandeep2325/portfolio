"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlineEyeSlash,
  HiOutlinePhoto,
  HiOutlinePaperClip,
  HiOutlineMicrophone,
  HiOutlineStop,
  HiOutlineArrowPath,
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
  sender_id: string;
  recipient_id: string;
  body: string;
  attachment_path?: string | null;
  attachment_kind?: AttachmentKind | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_size?: number | null;
  attachment_duration_ms?: number | null;
  attachment?: MessageAttachmentData | null;
  read_at?: string | null;
  created_at: string;
  /** Set only on locally-created bubbles that have not been confirmed yet. */
  status?: "sending" | "failed";
};

type Contact = { id: string; kind: "user" | "anon"; email: string; username: string | null; label: string; lastSeenAt: string | null; ip?: string | null };
type Owner = { id: string; label: string; lastSeenAt: string | null };
type Pending = { file: File; kind: AttachmentKind; previewUrl: string | null; durationMs: number | null };
type RetryPayload = { text: string; file: File | null; durationMs: number | null };

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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [visitorLabel, setVisitorLabel] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const syncedAtRef = useRef("");
  const optimisticSeq = useRef(0);
  const retryPayloads = useRef(new Map<number, RetryPayload>());

  const recorder = useAudioRecorder();

  const peerId = admin ? recipientId : owner?.id || "";
  const selectedContact = contacts.find((contact) => contact.id === recipientId);
  const peerLabel = admin ? selectedContact?.label || "guest" : owner?.label || "Sandeep Gowda";

  const { peerOnline, peerTyping, notifyTyping, stopTyping } = useConversationChannel(userId, peerId, token);

  // Suppress banners only while this thread is genuinely on screen. A minimized
  // window keeps this component mounted, and claiming focus from there would
  // swallow notifications and mark messages read behind the user's back.
  useEffect(() => {
    setActiveConversation(isVisible ? peerId || null : null);
    return () => setActiveConversation(null);
  }, [peerId, isVisible]);

  const authHeaders = useCallback(
    (extra: Record<string, string> = {}) => (token ? { ...extra, Authorization: `Bearer ${token}` } : extra),
    [token],
  );

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

  /** Pulls anything created or read since the last successful sync. */
  const catchUp = useCallback(
    async (accessToken: string) => {
      if (!syncedAtRef.current) return;
      try {
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
    [],
  );

  // Initial load.
  useEffect(() => {
    if (!browserSupabase) return;
    const supabase = browserSupabase;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token || "";
      setToken(accessToken);

      const response = await fetch("/api/messages", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Could not load messages.");
        return;
      }

      setMessages((payload.messages as Message[]).map(hydrate));
      setAdmin(payload.admin);
      setUserId(payload.userId);
      setContacts(payload.contacts || []);
      setOwner(payload.owner || null);
      setAnonymous(Boolean(payload.anonymous));
      setVisitorLabel(payload.visitorLabel || "");
      syncedAtRef.current = payload.syncedAt || new Date().toISOString();
      if (payload.owner) setPeerLastSeen(payload.owner.lastSeenAt);
    })();
  }, []);

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
            current.map((item) => (item.id === updated.id ? { ...item, read_at: updated.read_at } : item)),
          );
        })
        .subscribe((status) => {
          if (cancelled) return;
          // Whatever happened while we were disconnected, pull it now.
          if (status === "SUBSCRIBED") void catchUp(token);
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
  }, [userId, token, anonymous, signAttachments, catchUp]);

  // Backstop: re-sync when the tab comes back and on a slow timer.
  useEffect(() => {
    if (!token && !anonymous) return;
    const run = () => {
      if (document.visibilityState === "visible") void catchUp(token);
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

  useEffect(() => {
    if (!admin) return;
    setPeerLastSeen(selectedContact?.lastSeenAt || null);
  }, [admin, selectedContact]);

  // Poll the peer's last-seen so "last seen" stays honest without a page reload.
  useEffect(() => {
    if (!token || !peerId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/presence?userId=${peerId}`, {
          headers: authHeaders(),
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
  }, [token, peerId, authHeaders]);

  const visibleMessages = useMemo(() => {
    if (!admin) return messages;
    if (!recipientId) return [];
    return messages.filter((message) => message.sender_id === recipientId || message.recipient_id === recipientId);
  }, [admin, messages, recipientId]);

  const markRead = useCallback(async () => {
    if ((!token && !anonymous) || !peerId || !isVisible || document.visibilityState !== "visible") return;
    const unread = visibleMessages.filter((message) => message.sender_id === peerId && !message.read_at);
    if (unread.length === 0) return;

    try {
      const response = await fetch("/api/messages/read", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ peerId }),
      });
      if (!response.ok) return;
      const { readAt } = await response.json();
      const ids = new Set(unread.map((message) => message.id));
      setMessages((current) => current.map((item) => (ids.has(item.id) ? { ...item, read_at: readAt } : item)));
    } catch {
      // Retried the next time this effect runs.
    }
  }, [token, anonymous, peerId, visibleMessages, isVisible, authHeaders]);

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

        const response = await fetch("/api/messages", {
          method: "POST",
          headers: authHeaders(),
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
        retryPayloads.current.delete(optimisticId);
        setMessages((current) => {
          // Realtime may have delivered the same row while this was in flight.
          const withoutDuplicate = current.filter((item) => item.id !== saved.id);
          return merge(
            withoutDuplicate.map((item) => (item.id === optimisticId ? saved : item)),
            [],
          );
        });
        if (saved.created_at > syncedAtRef.current) syncedAtRef.current = saved.created_at;
      } catch {
        setError("Could not send message. Check your connection.");
        setMessages((current) =>
          current.map((item) => (item.id === optimisticId ? { ...item, status: "failed" } : item)),
        );
      }
    },
    [authHeaders],
  );

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (admin && !recipientId) {
      setError("Choose a guest to message first.");
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

    const payloadData: RetryPayload = { text, file: pending?.file || null, durationMs: pending?.durationMs || null };
    formElement.reset();
    // Keep the object URL alive for the optimistic bubble's preview.
    setPending(null);
    recorder.discard();
    textareaRef.current?.focus();

    void deliver(optimisticId, payloadData, recipientId);
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

  const blocked = admin && !recipientId;
  const active = peerOnline || isRecentlyActive(peerLastSeen);
  const lastSeenLabel = relativeTime(peerLastSeen);
  const recording = recorder.state === "recording" || recorder.state === "requesting";

  return (
    <section className="surface messages-panel px-6 py-6 sm:px-8">
      <div className="section-heading dm-header">
        <div>
          <h2>{admin ? "Admin inbox" : "Message Sandeep"}</h2>
          {blocked ? (
            <p>Select a guest email to view that conversation or start a new one.</p>
          ) : (
            <p className="dm-presence">
              <span className={active ? "dm-dot online" : "dm-dot"} />
              <strong>{peerLabel}</strong>
              {selectedContact?.kind === "anon" && <span className="dm-anon-tag">anonymous</span>}
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
      </div>

      {admin && (
        <select value={recipientId} onChange={(event) => setRecipientId(event.target.value)}>
          <option value="">Choose a guest to message</option>
          {contacts.map((contact) => (
            <option value={contact.id} key={contact.id}>
              {contact.kind === "anon" ? `👤 ${contact.label} · ${contact.ip || "unknown IP"}` : contact.label}
              {contact.kind === "user" && contact.username ? ` · ${contact.email}` : ""}
            </option>
          ))}
        </select>
      )}

      <div className="dm-list">
        <div className="dm-banner">
          {anonymous ? (
            <p className="dm-notify">
              <HiOutlineEyeSlash className="h-4 w-4 flex-shrink-0" />
              Anonymous{visitorLabel ? ` · ${visitorLabel}` : ""}. Replies land here on this device.{" "}
              <a href="/login" className="text-link">
                Sign in
              </a>{" "}
              to keep them.
            </p>
          ) : (
            <NotificationSetting />
          )}
        </div>

        {blocked ? (
          <p className="dm-empty">Select a guest email to view or start a private conversation.</p>
        ) : visibleMessages.length === 0 ? (
          <p className="dm-empty">
            {admin ? `No messages with ${peerLabel} yet. Send the first message below.` : "No messages yet. Say hello below."}
          </p>
        ) : (
          visibleMessages.map((message) => {
            const outgoing = message.sender_id === userId;
            return (
              <div
                className={`${outgoing ? "dm outgoing" : "dm incoming"}${message.status === "sending" ? " dm-sending" : ""}${
                  message.status === "failed" ? " dm-failed" : ""
                }`}
                key={message.id}
              >
                {message.body.trim() ? <p>{message.body}</p> : null}
                {message.attachment ? <MessageAttachment attachment={message.attachment} /> : null}

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
                    {outgoing && (
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
            <span>
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

      {error && <p className="feed-error">{error}</p>}
    </section>
  );
}
