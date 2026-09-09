"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";

type Message = { id: number; sender_id: string; recipient_id: string; body: string; created_at: string };
type Contact = { id: string; email: string };

export default function DirectMessages() {
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [admin, setAdmin] = useState(false);
  const [userId, setUserId] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

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
      setMessages(payload.messages);
      setAdmin(payload.admin);
      setUserId(payload.userId);
      setContacts(payload.contacts || []);
      await supabase.realtime.setAuth(accessToken);
      channel = supabase
        .channel(`direct-messages-${payload.userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (event) => {
          const message = event.new as Message;
          setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
        })
        .subscribe();
    });
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    if (admin && !recipientId) {
      setError("Choose a guest to message first.");
      return;
    }

    setSending(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: form.get("message"), recipientId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not send message.");
        return;
      }
      setMessages((current) => (current.some((item) => item.id === data.message.id) ? current : [...current, data.message]));
      event.currentTarget.reset();
    } finally {
      setSending(false);
    }
  }

  const visibleMessages = useMemo(() => {
    if (!admin) return messages;
    if (!recipientId) return [];
    return messages.filter(
      (message) => message.sender_id === recipientId || message.recipient_id === recipientId,
    );
  }, [admin, messages, recipientId]);

  const selectedContact = contacts.find((contact) => contact.id === recipientId);

  if (!token) {
    return (
      <section className="surface px-6 py-8">
        <h2 className="text-xl font-semibold">Sign in to use direct messages</h2>
        <p className="mt-2 text-[var(--muted)]">Guest accounts can send a private message directly to Sandeep.</p>
      </section>
    );
  }

  const canSend = !(admin && !recipientId) && !sending;

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
        {admin && !recipientId ? (
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
              <p>{message.body}</p>
              <time>{new Date(message.created_at).toLocaleString()}</time>
            </div>
          ))
        )}
      </div>
      <form className="dm-form" onSubmit={send}>
        <textarea
          name="message"
          required
          maxLength={2000}
          rows={3}
          placeholder={
            admin
              ? recipientId
                ? `Message ${selectedContact?.email || "guest"}…`
                : "Choose a guest above to message…"
              : "Write a private message…"
          }
          disabled={sending || (admin && !recipientId)}
        />
        <button className="primary-button" disabled={!canSend} type="submit">
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
      {error && <p className="feed-error">{error}</p>}
    </section>
  );
}
