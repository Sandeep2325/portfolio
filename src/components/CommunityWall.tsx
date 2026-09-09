"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";

type Message = { id: number; parent_id: number | null; author_name: string; body: string; is_owner: boolean; created_at: string };

export default function CommunityWall() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState("");
  const [sending, setSending] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const date = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    [],
  );

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/community", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setMessages(data.messages);
      else setError(data.error || "Could not load messages.");
      setLoading(false);
    })();
    if (browserSupabase) void browserSupabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token || ""));
  }, []);

  useEffect(() => {
    if (replyTo !== null) replyInputRef.current?.focus();
  }, [replyTo]);

  async function publish(options: {
    body: string;
    authorName: string;
    parentId: number | null;
    form: HTMLFormElement;
  }) {
    setError("");
    const response = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        body: options.body,
        authorName: options.authorName,
        parentId: options.parentId,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not send message.");
      return false;
    }
    setMessages((current) => [data.message, ...current]);
    options.form.reset();
    setReplyTo(null);
    return true;
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !accessToken) return;
    setSending(true);
    try {
      const form = event.currentTarget;
      const data = new FormData(form);
      await publish({
        body: String(data.get("message") || ""),
        authorName: String(data.get("name") || ""),
        parentId: null,
        form,
      });
    } finally {
      setSending(false);
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>, parentId: number) {
    event.preventDefault();
    if (replySending || !accessToken) return;
    setReplySending(true);
    try {
      const form = event.currentTarget;
      const data = new FormData(form);
      await publish({
        body: String(data.get("reply") || ""),
        authorName: String(data.get("name") || ""),
        parentId,
        form,
      });
    } finally {
      setReplySending(false);
    }
  }

  function startReply(messageId: number) {
    if (!accessToken) {
      setError("Sign in to reply.");
      return;
    }
    setError("");
    setReplyTo(messageId);
  }

  const roots = messages.filter((message) => !message.parent_id);
  const replies = (id: number) => messages.filter((message) => message.parent_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const replyTarget = replyTo ? messages.find((message) => message.id === replyTo) : null;

  return (
    <section className="community-wall surface px-6 py-7 sm:px-8">
      <div className="section-heading">
        <div>
          <h2>Community messages</h2>
          <p>Say hello, ask a question, or leave a note. Posts are visible to everyone.</p>
        </div>
      </div>

      <form className="community-form" onSubmit={sendMessage}>
        <div className="reply-status">
          <span>{accessToken ? "Start a new community post" : "Sign in to join the conversation"}</span>
        </div>
        <div className="community-fields">
          <input name="name" maxLength={40} placeholder="Your display name (optional)" disabled={!accessToken || sending} />
        </div>
        <textarea
          name="message"
          required
          disabled={!accessToken || sending}
          maxLength={1000}
          rows={3}
          placeholder={accessToken ? "Write a new message…" : "Sign in to write a message"}
        />
        <button className="primary-button" disabled={!accessToken || sending} type="submit">
          {sending ? "Posting…" : "Post message"}
        </button>
      </form>

      {error && <p className="feed-error">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-[var(--muted)]">Loading community…</p>
      ) : roots.length === 0 ? (
        <div className="empty-community">No messages yet. Start the conversation.</div>
      ) : (
        <div className="message-list">
          {roots.map((message) => {
            const threadReplies = replies(message.id);
            const isReplying = replyTo === message.id;
            return (
              <article className="community-message" key={message.id}>
                <div className={message.is_owner ? "message-avatar owner" : "message-avatar"}>{message.is_owner ? "SG" : "G"}</div>
                <div className="message-main">
                  <div>
                    <strong>{message.author_name}</strong>
                    {message.is_owner && <span className="owner-badge">Owner</span>}
                    <time>{date.format(new Date(message.created_at))}</time>
                  </div>
                  <p>{message.body}</p>

                  {!isReplying && (
                    <button type="button" className="reply-button" onClick={() => startReply(message.id)}>
                      Reply
                    </button>
                  )}

                  {threadReplies.map((reply) => (
                    <div className="community-reply" key={reply.id}>
                      <div className={reply.is_owner ? "message-avatar owner" : "message-avatar"}>{reply.is_owner ? "SG" : "G"}</div>
                      <div>
                        <strong>{reply.author_name}</strong>
                        {reply.is_owner && <span className="owner-badge">Owner</span>}
                        <time>{date.format(new Date(reply.created_at))}</time>
                        <p>{reply.body}</p>
                      </div>
                    </div>
                  ))}

                  {isReplying && (
                    <form className="inline-reply-form" onSubmit={(event) => void sendReply(event, message.id)}>
                      <div className="inline-reply-heading">
                        <span>
                          Replying to <strong>{replyTarget?.author_name || "this message"}</strong>
                        </span>
                        <button type="button" disabled={replySending} onClick={() => setReplyTo(null)}>
                          Cancel
                        </button>
                      </div>
                      <input
                        name="name"
                        maxLength={40}
                        placeholder="Your display name (optional)"
                        disabled={!accessToken || replySending}
                      />
                      <textarea
                        ref={replyInputRef}
                        name="reply"
                        required
                        disabled={!accessToken || replySending}
                        maxLength={1000}
                        rows={2}
                        placeholder={`Reply to ${replyTarget?.author_name || "this message"}…`}
                      />
                      <div className="inline-reply-actions">
                        <button className="primary-button" disabled={!accessToken || replySending} type="submit">
                          {replySending ? "Sending…" : "Send reply"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
