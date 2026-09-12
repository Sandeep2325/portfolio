import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";
import { apiGet } from "./api";
import { callSummary, threadKeyOf, type Message, type MessagesPayload, type ThreadSummary } from "./types";

/** Backstop in case a realtime event is missed while the app is backgrounded. */
const CATCH_UP_MS = 20_000;

function merge(current: Message[], incoming: Message[]) {
  if (incoming.length === 0) return current;
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message });
  return [...byId.values()].sort((left, right) => left.created_at.localeCompare(right.created_at));
}

export function useMessages(signedIn: boolean) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [serverThreads, setServerThreads] = useState<ThreadSummary[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState("");
  const [admin, setAdmin] = useState(false);
  const [owner, setOwner] = useState<MessagesPayload["owner"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const syncedAt = useRef("");

  const load = useCallback(async () => {
    if (!signedIn) {
      setMessages([]);
      setServerThreads([]);
      setLoading(false);
      return;
    }
    try {
      const payload = await apiGet<MessagesPayload>("/api/messages");
      setMessages(payload.messages || []);
      setServerThreads(payload.threads || []);
      setLabels(payload.labels || {});
      setUserId(payload.userId);
      setAdmin(payload.admin);
      setOwner(payload.owner);
      syncedAt.current = payload.syncedAt || new Date().toISOString();
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  /** Pulls only what changed, so a reconnect is cheap. */
  const catchUp = useCallback(async () => {
    if (!signedIn || !syncedAt.current) return;
    try {
      const payload = await apiGet<MessagesPayload>(`/api/messages?since=${encodeURIComponent(syncedAt.current)}`);
      if (payload.messages?.length) setMessages((current) => merge(current, payload.messages));
      if (payload.syncedAt) syncedAt.current = payload.syncedAt;
    } catch {
      // The next tick retries.
    }
  }, [signedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime, plus a timer and a foreground hook as backstops.
  useEffect(() => {
    if (!signedIn) return;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || cancelled) return;
      await supabase.realtime.setAuth(token);
      channel = supabase
        .channel(`dm-mobile-${Date.now()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => void catchUp())
        .subscribe();
    })();

    const timer = setInterval(() => void catchUp(), CATCH_UP_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void catchUp();
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      sub.remove();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [signedIn, catchUp]);

  const isIncoming = useCallback(
    (message: Message) => {
      if (message.anon_visitor_id) return message.sender_id === null;
      return message.sender_id !== userId;
    },
    [userId],
  );

  /** Conversations derived from the messages held locally, so the list never lags. */
  const threads = useMemo<ThreadSummary[]>(() => {
    if (messages.length === 0) return serverThreads;
    const ipByKey = new Map(serverThreads.map((thread) => [thread.key, thread.ip]));
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
        const ids = (anonId ? [anonId, last.sender_id || last.recipient_id] : [last.sender_id, last.recipient_id]).filter(
          (id): id is string => Boolean(id),
        );
        const participant = ids.includes(userId);
        const peerId = participant ? ids.find((id) => id !== userId) || null : null;

        return {
          key,
          kind: anonId ? ("anon" as const) : ("pair" as const),
          title: participant ? labels[peerId || ""] || "Unknown" : ids.map((id) => labels[id] || "Unknown").join(" ↔ "),
          subtitle: participant ? null : "not your conversation",
          peerId,
          participant,
          lastBody: last.deleted_for_everyone_at
            ? "Message deleted"
            : callSummary(last) || (last.body || "").trim() || "Attachment",
          lastAt: last.created_at,
          unread: participant ? sorted.filter((item) => !item.read_at && isIncoming(item)).length : 0,
          ip: ipByKey.get(key) ?? null,
        };
      })
      .sort((left, right) => right.lastAt.localeCompare(left.lastAt));
  }, [messages, serverThreads, labels, userId, isIncoming]);

  return { messages, setMessages, threads, labels, userId, admin, owner, loading, error, reload: load, catchUp, isIncoming };
}
