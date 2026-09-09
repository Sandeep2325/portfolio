"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlinePhoto, HiOutlinePaperClip, HiOutlineMicrophone, HiOutlineStop, HiOutlineBellAlert } from "react-icons/hi2";
import { browserSupabase } from "@/lib/supabase-browser";
import { useConversationChannel } from "@/hooks/useConversationChannel";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { isRecentlyActive, relativeTime } from "@/lib/relative-time";
import {
  FILE_INPUT_ACCEPT,
  MAX_ATTACHMENT_SIZE,
  formatBytes,
  formatDuration,
  resolveKind,
  type AttachmentKind,
} from "@/lib/attachments";
import MessageAttachment, { type MessageAttachmentData } from "./MessageAttachment";

const PRESENCE_POLL_MS = 60_000;
/** Signed URLs last an hour; refresh a little before that. */
const RESIGN_INTERVAL_MS = 50 * 60_000;

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
};

type Contact = { id: string; email: string; username: string | null; label: string; lastSeenAt: string | null };
type Owner = { id: string; label: string; lastSeenAt: string | null };
type Pending = { file: File; kind: AttachmentKind; previewUrl: string | null; durationMs: number | null };

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

export default function DirectMessages() {
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [admin, setAdmin] = useState(false);
  const [userId, setUserId] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  const recorder = useAudioRecorder();

  const peerId = admin ? recipientId : owner?.id || "";
  const selectedContact = contacts.find((contact) => contact.id === recipientId);
  const peerLabel = admin ? selectedContact?.label || "guest" : owner?.label || "Sandeep Gowda";

  const { peerOnline, peerTyping, notifyTyping, stopTyping } = useConversationChannel(userId, peerId, token);

  useEffect(() => {
    if (typeof Notification !== "undefined") setNotifyPermission(Notification.permission);
  }, []);

  /** Fetches fresh signed URLs for the given messages. */
  const signAttachments = useCallback(
    async (ids: number[], accessToken: string) => {
      if (ids.length === 0 || !accessToken) return;
      try {
        const response = await fetch("/api/messages/attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ ids }),
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
    },
    [],
  );

  useEffect(() => {
    if (!browserSupabase) return;
    const supabase = browserSupabase;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    void supabase.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      setToken(accessToken);
      if (!accessToken) return;

      const response = await fetch("/api/messages", { headers: { Authorization: `Bearer ${accessToken}` } });
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
      if (payload.owner) setPeerLastSeen(payload.owner.lastSeenAt);

      await supabase.realtime.setAuth(accessToken);
      channel = supabase
        .channel(`direct-messages-${payload.userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (event) => {
          const message = hydrate(event.new as Message);
          setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
          // Realtime carries the storage path, never a usable URL.
          if (message.attachment) void signAttachments([message.id], accessToken);
        })
        // Read receipts: the peer stamping read_at arrives as an UPDATE.
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, (event) => {
          const updated = event.new as Message;
          setMessages((current) =>
            current.map((item) => (item.id === updated.id ? { ...item, read_at: updated.read_at } : item)),
          );
        })
        .subscribe();
    });

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [signAttachments]);

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
          headers: { Authorization: `Bearer ${token}` },
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
    if (!admin) return messages;
    if (!recipientId) return [];
    return messages.filter((message) => message.sender_id === recipientId || message.recipient_id === recipientId);
  }, [admin, messages, recipientId]);

  const markRead = useCallback(async () => {
    if (!token || !peerId || document.visibilityState !== "visible") return;
    const unread = visibleMessages.filter((message) => message.sender_id === peerId && !message.read_at);
    if (unread.length === 0) return;

    try {
      const response = await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ peerId }),
      });
      if (!response.ok) return;
      const { readAt } = await response.json();
      const ids = new Set(unread.map((message) => message.id));
      setMessages((current) => current.map((item) => (ids.has(item.id) ? { ...item, read_at: readAt } : item)));
    } catch {
      // Retried the next time this effect runs.
    }
  }, [token, peerId, visibleMessages]);

  useEffect(() => {
    void markRead();
    const onVisible = () => void markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  useEffect(() => {
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
    setPending({
      file,
      kind,
      previewUrl: kind === "image" ? URL.createObjectURL(file) : null,
      durationMs: null,
    });
  }

  const clearPending = useCallback(() => {
    setPending((current) => {
      if (current?.previewUrl && current.kind === "image") URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    recorder.discard();
  }, [recorder]);

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    setNotifyPermission(await Notification.requestPermission());
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
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

    setSending(true);
    setError("");
    stopTyping();
    try {
      const payload = new FormData();
      payload.set("body", text);
      payload.set("recipientId", recipientId);
      if (pending) {
        payload.set("attachment", pending.file);
        if (pending.durationMs) payload.set("durationMs", String(pending.durationMs));
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not send message.");
        return;
      }

      const message = hydrate(data.message as Message);
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      formElement.reset();
      clearPending();
    } finally {
      setSending(false);
    }
  }

  if (!token) {
    return (
      <section className="surface px-6 py-8">
        <h2 className="font-display text-xl font-semibold">Sign in to use direct messages</h2>
        <p className="mt-2 text-[var(--muted)]">
          Guest accounts can send private messages, photos, voice notes and documents directly to Sandeep.
        </p>
      </section>
    );
  }

  const blocked = admin && !recipientId;
  const active = peerOnline || isRecentlyActive(peerLastSeen);
  const lastSeenLabel = relativeTime(peerLastSeen);
  const recording = recorder.state === "recording" || recorder.state === "requesting";
  const composerDisabled = sending || blocked;

  return (
    <section className="surface messages-panel px-6 py-7 sm:px-8">
      <div className="section-heading">
        <div>
          <h2>{admin ? "Admin inbox" : "Message Sandeep"}</h2>
          {blocked ? (
            <p>Select a guest email to view that conversation or start a new one.</p>
          ) : (
            <p className="dm-presence">
              <span className={active ? "dm-dot online" : "dm-dot"} />
              <strong>{peerLabel}</strong>
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

      {notifyPermission === "default" && (
        <button type="button" className="dm-notify-cta" onClick={() => void enableNotifications()}>
          <HiOutlineBellAlert className="h-4 w-4" />
          Turn on notifications for new messages
        </button>
      )}

      {admin && (
        <select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} disabled={sending}>
          <option value="">Choose a guest to message</option>
          {contacts.map((contact) => (
            <option value={contact.id} key={contact.id}>
              {contact.label}
              {contact.username ? ` · ${contact.email}` : ""}
            </option>
          ))}
        </select>
      )}

      <div className="dm-list">
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
              <div className={outgoing ? "dm outgoing" : "dm incoming"} key={message.id}>
                {message.body.trim() ? <p>{message.body}</p> : null}
                {message.attachment ? <MessageAttachment attachment={message.attachment} /> : null}
                <time>
                  {new Date(message.created_at).toLocaleString()}
                  {outgoing && (
                    <span className={message.read_at ? "dm-receipt read" : "dm-receipt"}>
                      {message.read_at ? "✓✓ Read" : "✓ Sent"}
                    </span>
                  )}
                </time>
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
          name="message"
          maxLength={2000}
          rows={3}
          placeholder={
            admin ? (recipientId ? `Message ${peerLabel}…` : "Choose a guest above to message…") : "Write a private message…"
          }
          disabled={composerDisabled}
          onChange={notifyTyping}
          onBlur={stopTyping}
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
            <button type="button" onClick={clearPending} disabled={sending}>
              Remove
            </button>
          </div>
        )}

        {recorder.error && <p className="feed-error">{recorder.error}</p>}

        <div className="dm-form-footer">
          <div className="dm-tools">
            <label className="dm-attach" aria-disabled={composerDisabled}>
              <HiOutlinePhoto className="h-4 w-4" />
              Photo
              <input ref={imageInputRef} type="file" accept="image/*" onChange={choose} disabled={composerDisabled} />
            </label>

            <label className="dm-attach" aria-disabled={composerDisabled}>
              <HiOutlinePaperClip className="h-4 w-4" />
              File
              <input ref={fileInputRef} type="file" accept={FILE_INPUT_ACCEPT} onChange={choose} disabled={composerDisabled} />
            </label>

            {recorder.supported && !recording && (
              <button
                type="button"
                className="dm-attach"
                onClick={() => void recorder.start()}
                disabled={composerDisabled}
              >
                <HiOutlineMicrophone className="h-4 w-4" />
                {pending?.kind === "audio" ? "Re-record" : "Voice"}
              </button>
            )}
          </div>

          <button className="primary-button" disabled={composerDisabled || recording} type="submit">
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>

      {error && <p className="feed-error">{error}</p>}
    </section>
  );
}
