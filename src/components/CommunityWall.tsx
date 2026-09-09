"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { browserSupabase } from "@/lib/supabase-browser";

type Message = {
  id: number;
  parent_id: number | null;
  author_name: string;
  body: string;
  image_url?: string | null;
  is_owner: boolean;
  created_at: string;
};

export default function CommunityWall() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sending, setSending] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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
    if (!browserSupabase) return;
    void browserSupabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token || "";
      setAccessToken(token);
      if (!token) return;
      const me = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!me.ok) return;
      const profile = await me.json();
      setDisplayName(profile.displayName || "");
      setIsAdmin(Boolean(profile.isAdmin));
    });
  }, []);

  useEffect(() => {
    if (replyTo !== null) replyInputRef.current?.focus();
  }, [replyTo]);

  async function publish(form: HTMLFormElement, parentId: number | null) {
    setError("");
    const payload = new FormData(form);
    if (parentId !== null) payload.set("parentId", String(parentId));
    else payload.delete("parentId");

    const response = await fetch("/api/community", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not send message.");
      return false;
    }
    setMessages((current) => [data.message, ...current]);
    form.reset();
    setReplyTo(null);
    return true;
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !accessToken) return;
    setSending(true);
    try {
      await publish(event.currentTarget, null);
    } finally {
      setSending(false);
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>, parentId: number) {
    event.preventDefault();
    if (replySending || !accessToken) return;
    setReplySending(true);
    try {
      await publish(event.currentTarget, parentId);
    } finally {
      setReplySending(false);
    }
  }

  async function deleteMessage(messageId: number, isThread: boolean) {
    if (!isAdmin || deletingId === messageId) return;
    const confirmText = isThread
      ? "Delete this message and its entire reply thread?"
      : "Delete this reply?";
    if (!window.confirm(confirmText)) return;

    setDeletingId(messageId);
    setError("");
    try {
      const response = await fetch("/api/community", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ messageId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not delete message.");
        return;
      }
      setMessages((current) =>
        current.filter((message) => message.id !== messageId && message.parent_id !== messageId),
      );
      if (replyTo === messageId) setReplyTo(null);
    } finally {
      setDeletingId(null);
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
          {accessToken ? (
            <span>
              Posting as <strong>{displayName || "you"}</strong>
            </span>
          ) : (
            <span>
              <Link href="/login" className="text-link">
                Sign in
              </Link>{" "}
              to join the conversation
            </span>
          )}
        </div>
        <textarea
          name="body"
          disabled={!accessToken || sending}
          maxLength={1000}
          rows={3}
          placeholder={accessToken ? "Write a new message…" : "Sign in to write a message"}
        />
        <label className="community-image-field">
          <span>Photo (optional — upload or take a photo, max 20 MB)</span>
          <input name="image" type="file" accept="image/*" disabled={!accessToken || sending} />
        </label>
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
                <div className={message.is_owner ? "message-avatar owner" : "message-avatar"}>
                  {message.is_owner ? "SG" : message.author_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="message-main">
                  <div className="message-meta">
                    <div>
                      <strong>{message.author_name}</strong>
                      {message.is_owner && <span className="owner-badge">Owner</span>}
                      <time>{date.format(new Date(message.created_at))}</time>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        className="post-delete"
                        disabled={deletingId === message.id}
                        onClick={() => void deleteMessage(message.id, true)}
                      >
                        {deletingId === message.id ? "Deleting…" : "Delete thread"}
                      </button>
                    )}
                  </div>
                  {message.body.trim() ? <p>{message.body}</p> : null}
                  {message.image_url ? <img src={message.image_url} alt="" className="community-image" /> : null}

                  {!isReplying && (
                    <button type="button" className="reply-button" onClick={() => startReply(message.id)}>
                      Reply
                    </button>
                  )}

                  {threadReplies.map((reply) => (
                    <div className="community-reply" key={reply.id}>
                      <div className={reply.is_owner ? "message-avatar owner" : "message-avatar"}>
                        {reply.is_owner ? "SG" : reply.author_name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="community-reply-body">
                        <div className="message-meta">
                          <div>
                            <strong>{reply.author_name}</strong>
                            {reply.is_owner && <span className="owner-badge">Owner</span>}
                            <time>{date.format(new Date(reply.created_at))}</time>
                          </div>
                          {isAdmin && (
                            <button
                              type="button"
                              className="post-delete"
                              disabled={deletingId === reply.id}
                              onClick={() => void deleteMessage(reply.id, false)}
                            >
                              {deletingId === reply.id ? "Deleting…" : "Delete"}
                            </button>
                          )}
                        </div>
                        {reply.body.trim() ? <p>{reply.body}</p> : null}
                        {reply.image_url ? <img src={reply.image_url} alt="" className="community-image" /> : null}
                      </div>
                    </div>
                  ))}

                  {isReplying && (
                    <form className="inline-reply-form" onSubmit={(event) => void sendReply(event, message.id)}>
                      <div className="inline-reply-heading">
                        <span>
                          Replying to <strong>{replyTarget?.author_name || "this message"}</strong> as{" "}
                          <strong>{displayName || "you"}</strong>
                        </span>
                        <button type="button" disabled={replySending} onClick={() => setReplyTo(null)}>
                          Cancel
                        </button>
                      </div>
                      <textarea
                        ref={replyInputRef}
                        name="body"
                        disabled={!accessToken || replySending}
                        maxLength={1000}
                        rows={2}
                        placeholder={`Reply to ${replyTarget?.author_name || "this message"}…`}
                      />
                      <label className="community-image-field">
                        <span>Photo (optional, max 20 MB)</span>
                        <input name="image" type="file" accept="image/*" disabled={!accessToken || replySending} />
                      </label>
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
