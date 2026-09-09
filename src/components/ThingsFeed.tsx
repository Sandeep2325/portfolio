"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";

type Comment = { id: number; post_id: number; author_name: string; body: string; created_at: string };
type Like = { post_id: number; visitor_id: string };
type Post = { id: number; title: string; body: string; image_url: string | null; created_at: string; comments: Comment[]; likes: Like[] };

function visitorId() {
  const key = "things-ghost-id";
  const saved = localStorage.getItem(key);
  if (saved) return saved;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

export default function ThingsFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [postError, setPostError] = useState("");
  const [visitor, setVisitor] = useState("");
  const [openComposer, setOpenComposer] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [likingId, setLikingId] = useState<number | null>(null);
  const [commentingId, setCommentingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadPosts = async () => {
    setLoading(true);
    const response = await fetch("/api/things", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setPosts(data.posts);
    else setPostError(data.error || "Could not load posts.");
    setLoading(false);
  };

  useEffect(() => {
    setVisitor(visitorId());
    void loadPosts();
    if (!browserSupabase) return;
    void browserSupabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token || "";
      setAccessToken(token);
      if (!token) return;
      const response = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setIsAdmin((await response.json()).isAdmin);
    });
  }, []);

  const date = useMemo(() => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }), []);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPostError("");
    setPublishing(true);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/things", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      const data = await response.json();
      if (!response.ok) {
        setPostError(data.error || "Could not publish post.");
        return;
      }
      setPosts((current) => [data.post, ...current]);
      event.currentTarget.reset();
      setOpenComposer(false);
      setMessage("Post published.");
    } finally {
      setPublishing(false);
    }
  }

  async function toggleLike(postId: number) {
    if (!visitor || likingId === postId) return;
    setLikingId(postId);
    try {
      const response = await fetch("/api/things/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, visitorId: visitor }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPostError(data.error || "Could not update like.");
        return;
      }
      setPosts((current) =>
        current.map((post) =>
          post.id !== postId
            ? post
            : {
                ...post,
                likes: data.liked
                  ? [...post.likes, { post_id: postId, visitor_id: visitor }]
                  : post.likes.filter((like) => like.visitor_id !== visitor),
              },
        ),
      );
    } finally {
      setLikingId(null);
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>, postId: number) {
    event.preventDefault();
    if (commentingId === postId) return;
    setCommentingId(postId);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/things/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, body: form.get("comment"), authorName: form.get("name") || "Ghost" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPostError(data.error || "Could not add comment.");
        return;
      }
      setPosts((current) =>
        current.map((post) => (post.id === postId ? { ...post, comments: [...post.comments, data.comment] } : post)),
      );
      event.currentTarget.reset();
    } finally {
      setCommentingId(null);
    }
  }

  async function deletePost(postId: number) {
    if (!isAdmin || deletingId === postId) return;
    if (!window.confirm("Delete this post? Comments and likes will be removed too.")) return;

    setDeletingId(postId);
    setMessage("");
    setPostError("");
    try {
      const response = await fetch("/api/things", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ postId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPostError(data.error || "Could not delete post.");
        return;
      }
      setPosts((current) => current.filter((post) => post.id !== postId));
      setMessage("Post deleted.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="things-feed">
      <div className="surface composer-intro px-6 py-6">
        <div>
          <h2>Posts</h2>
          <p>Updates, notes, and work in progress.</p>
        </div>
        {isAdmin && (
          <button className="primary-button" disabled={publishing} onClick={() => setOpenComposer((open) => !open)}>
            {openComposer ? "Close" : "Create a post"}
          </button>
        )}
      </div>
      {openComposer && (
        <form className="surface composer px-6 py-6" onSubmit={createPost}>
          <h2>Create a post</h2>
          <p className="form-note">You are signed in as the portfolio admin.</p>
          <label>
            Title
            <input required name="title" maxLength={120} placeholder="What are you sharing?" disabled={publishing} />
          </label>
          <label>
            Post
            <textarea required name="body" maxLength={2000} rows={5} placeholder="Write an update..." disabled={publishing} />
          </label>
          <label>
            Image <span>(optional, max 8 MB)</span>
            <input name="image" type="file" accept="image/*" disabled={publishing} />
          </label>
          <div className="composer-footer">
            <button className="primary-button" type="submit" disabled={publishing}>
              {publishing ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      )}
      {message && <p className="feed-message">{message}</p>}
      {postError && <p className="feed-error">{postError}</p>}
      {loading ? (
        <div className="surface px-6 py-7 text-[var(--muted)]">Loading posts…</div>
      ) : posts.length === 0 ? (
        <div className="surface empty-feed px-6 py-10">
          <h2>No posts yet</h2>
          <p>Create the first post to start the conversation.</p>
        </div>
      ) : (
        posts.map((post) => {
          const liked = post.likes.some((like) => like.visitor_id === visitor);
          const liking = likingId === post.id;
          const commenting = commentingId === post.id;
          return (
            <article className="surface feed-post" key={post.id}>
              <div className="post-header">
                <div className="post-avatar">SG</div>
                <div>
                  <strong>Sandeep Gowda</strong>
                  <p>{date.format(new Date(post.created_at))}</p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    className="post-delete"
                    disabled={deletingId === post.id}
                    onClick={() => void deletePost(post.id)}
                  >
                    {deletingId === post.id ? "Deleting…" : "Delete"}
                  </button>
                )}
              </div>
              <div className="post-body">
                <h3>{post.title}</h3>
                <p>{post.body}</p>
              </div>
              {post.image_url && <img src={post.image_url} alt="" className="post-image" />}
              <div className="post-stats">
                <span>{post.likes.length ? `${post.likes.length} like${post.likes.length === 1 ? "" : "s"}` : "Be the first to like this"}</span>
                <span>
                  {post.comments.length} comment{post.comments.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="post-actions">
                <button className={liked ? "liked" : ""} disabled={liking} onClick={() => void toggleLike(post.id)}>
                  {liking ? "…" : liked ? "♥ Liked" : "♡ Like"}
                </button>
                <button onClick={() => document.getElementById(`comment-${post.id}`)?.focus()}>▢ Comment</button>
              </div>
              <div className="comments">
                {post.comments.map((comment) => (
                  <div className="comment" key={comment.id}>
                    <div className="comment-avatar">G</div>
                    <div>
                      <strong>{comment.author_name}</strong>
                      <p>{comment.body}</p>
                    </div>
                  </div>
                ))}
                <form className="comment-form" onSubmit={(event) => void addComment(event, post.id)}>
                  <input name="name" maxLength={40} placeholder="Ghost name (optional)" disabled={commenting} />
                  <input
                    id={`comment-${post.id}`}
                    name="comment"
                    maxLength={500}
                    required
                    placeholder="Add a comment as Ghost…"
                    disabled={commenting}
                  />
                  <button type="submit" disabled={commenting}>
                    {commenting ? "Sending…" : "Send"}
                  </button>
                </form>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
