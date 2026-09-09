"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlinePhoto } from "react-icons/hi2";
import { browserSupabase, publicAssetUrl } from "@/lib/supabase-browser";
import { useConversationChannel } from "@/hooks/useConversationChannel";
import { isRecentlyActive, relativeTime } from "@/lib/relative-time";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const PRESENCE_POLL_MS = 60_000;

type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  image_path?: string | null;
  image_url?: string | null;
  read_at?: string | null;
  created_at: string;
};

type Contact = { id: string; email: string; username: string | null; label: string; lastSeenAt: string | null };
type Owner = { id: string; label: string; lastSeenAt: string | null };

/** Realtime rows carry image_path only, so derive the URL when it is missing. */
function withImageUrl(message: Message): Message {
  return { ...message, image_url: message.image_url ?? publicAssetUrl(message.image_path) };
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
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  const peerId = admin ? recipientId : owner?.id || "";
  const selectedContact = contacts.find((contact) => contact.id === recipientId);
  const peerLabel = admin ? selectedContact?.label || "guest" : owner?.label || "Sandeep Gowda";

  const { peerOnline, peerTyping, notifyTyping, stopTyping } = useConversationChannel(userId, peerId, token);

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

      setMessages((payload.messages as Message[]).map(withImageUrl));
      setAdmin(payload.admin);
      setUserId(payload.userId);
      setContacts(payload.contacts || []);
      setOwner(payload.owner || null);
      if (payload.owner) setPeerLastSeen(payload.owner.lastSeenAt);

      await supabase.realtime.setAuth(accessToken);
      channel = supabase
        .channel(`direct-messages-${payload.userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (event) => {
          const message = withImageUrl(event.new as Message);
          setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
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
  }, []);

  // Track the selected guest's last-seen when the admin switches conversation.
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

  // Mark the peer's messages read while this conversation is on screen.
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

  // Keep the local preview URL in step with the chosen file.
  useEffect(() => {
    if (!attachment) {
      setAttachmentUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(attachment);
    setAttachmentUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [attachment]);

  function chooseAttachment(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE) {
      setError("Attach a supported image smaller than 20 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setAttachment(file);
  }

  function clearAttachment() {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    if (!text && !attachment) {
      setError("Write a message or attach an image.");
      return;
    }

    setSending(true);
    setError("");
    stopTyping();
    try {
      const payload = new FormData();
      payload.set("body", text);
      payload.set("recipientId", recipientId);
      if (attachment) payload.set("image", attachment);

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

      const message = withImageUrl(data.message as Message);
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      formElement.reset();
      clearAttachment();
    } finally {
      setSending(false);
    }
  }

  if (!token) {
    return (
      <section className="surface px-6 py-8">
        <h2 className="font-display text-xl font-semibold">Sign in to use direct messages</h2>
        <p className="mt-2 text-[var(--muted)]">Guest accounts can send a private message — with photos — directly to Sandeep.</p>
      </section>
    );
  }

  const blocked = admin && !recipientId;
  const active = peerOnline || isRecentlyActive(peerLastSeen);
  const lastSeenLabel = relativeTime(peerLastSeen);

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
                {message.image_url ? (
                  <a href={message.image_url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={message.image_url} alt="Attachment" className="dm-image" />
                  </a>
                ) : null}
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
          disabled={sending || blocked}
          onChange={notifyTyping}
          onBlur={stopTyping}
        />

        {attachment && attachmentUrl && (
          <div className="dm-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachmentUrl} alt="Selected attachment" />
            <span>{attachment.name}</span>
            <button type="button" onClick={clearAttachment} disabled={sending}>
              Remove
            </button>
          </div>
        )}

        <div className="dm-form-footer">
          <label className="dm-attach">
            <HiOutlinePhoto className="h-4 w-4" />
            {attachment ? "Change photo" : "Add photo"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={chooseAttachment}
              disabled={sending || blocked}
            />
          </label>
          <button className="primary-button" disabled={sending || blocked} type="submit">
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>

      {error && <p className="feed-error">{error}</p>}
    </section>
  );
}
