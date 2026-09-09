"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlinePhoto } from "react-icons/hi2";
import { browserSupabase, publicAssetUrl } from "@/lib/supabase-browser";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  image_path?: string | null;
  image_url?: string | null;
  created_at: string;
};

type Contact = { id: string; email: string };

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
  const [recipientId, setRecipientId] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      await supabase.realtime.setAuth(accessToken);
      channel = supabase
        .channel(`direct-messages-${payload.userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (event) => {
          const message = withImageUrl(event.new as Message);
          setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
        })
        .subscribe();
    });

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

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

  const visibleMessages = useMemo(() => {
    if (!admin) return messages;
    if (!recipientId) return [];
    return messages.filter((message) => message.sender_id === recipientId || message.recipient_id === recipientId);
  }, [admin, messages, recipientId]);

  const selectedContact = contacts.find((contact) => contact.id === recipientId);

  if (!token) {
    return (
      <section className="surface px-6 py-8">
        <h2 className="font-display text-xl font-semibold">Sign in to use direct messages</h2>
        <p className="mt-2 text-[var(--muted)]">Guest accounts can send a private message — with photos — directly to Sandeep.</p>
      </section>
    );
  }

  const blocked = admin && !recipientId;

  return (
    <section className="surface messages-panel px-6 py-7 sm:px-8">
      <div className="section-heading">
        <div>
          <h2>{admin ? "Admin inbox" : "Message Sandeep"}</h2>
          <p>
            {admin
              ? "Select a guest email to view that conversation or start a new one."
              : "This conversation is visible only to you and the portfolio owner."}
          </p>
        </div>
      </div>

      {admin && (
        <select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} disabled={sending}>
          <option value="">Choose a guest to message</option>
          {contacts.map((contact) => (
            <option value={contact.id} key={contact.id}>
              {contact.email}
            </option>
          ))}
        </select>
      )}

      <div className="dm-list">
        {blocked ? (
          <p className="dm-empty">Select a guest email to view or start a private conversation.</p>
        ) : visibleMessages.length === 0 ? (
          <p className="dm-empty">
            {admin
              ? `No messages with ${selectedContact?.email || "this guest"} yet. Send the first message below.`
              : "No messages yet. Say hello below."}
          </p>
        ) : (
          visibleMessages.map((message) => (
            <div className={message.sender_id === userId ? "dm outgoing" : "dm incoming"} key={message.id}>
              {message.body.trim() ? <p>{message.body}</p> : null}
              {message.image_url ? (
                <a href={message.image_url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={message.image_url} alt="Attachment" className="dm-image" />
                </a>
              ) : null}
              <time>{new Date(message.created_at).toLocaleString()}</time>
            </div>
          ))
        )}
      </div>

      <form className="dm-form" onSubmit={send}>
        <textarea
          name="message"
          maxLength={2000}
          rows={3}
          placeholder={
            admin
              ? recipientId
                ? `Message ${selectedContact?.email || "guest"}…`
                : "Choose a guest above to message…"
              : "Write a private message…"
          }
          disabled={sending || blocked}
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
