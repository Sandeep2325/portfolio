"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";
import { primeRealtimeAuth, isDeadChannelStatus } from "@/lib/realtime";
import { isConversationOnScreen } from "@/lib/dm-focus";
import type { AttachmentKind } from "@/lib/attachments";

export type UnreadItem = {
  id: number | string;
  senderId: string;
  senderLabel: string;
  preview: string;
  createdAt: string;
  /** Connection requests are announced alongside messages. */
  kind?: "message" | "connection";
};

export type NotificationPermissionState = "unsupported" | "default" | "granted" | "denied";

const REFRESH_DEBOUNCE_MS = 300;

const KIND_PREVIEW: Record<AttachmentKind, string> = {
  image: "📷 Photo",
  audio: "🎤 Voice message",
  file: "📎 Attachment",
};

export function currentPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission as NotificationPermissionState;
}

function preview(body: string, kind: AttachmentKind | null) {
  const text = (body || "").trim();
  if (text) return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  return kind ? KIND_PREVIEW[kind] : "New message";
}

/**
 * Announces incoming direct messages and keeps the unread badge in step.
 *
 * Announcements are driven by the realtime INSERT itself, not by the unread
 * list: with the Messages window open, a message is marked read within a few
 * hundred milliseconds of arriving, so anything keyed off "still unread" would
 * never fire.
 */
export function useDirectMessageNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [toast, setToast] = useState<UnreadItem | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>("unsupported");

  const userIdRef = useRef("");
  const labelCache = useRef(new Map<string, string>());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setPermission(currentPermission()), []);

  /** Badge count only — announcements are handled on arrival. */
  const refreshUnread = useCallback(async () => {
    if (!browserSupabase) return;
    const { data } = await browserSupabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const response = await fetch("/api/messages/unread", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { items: UnreadItem[] };
      setUnreadCount((payload.items || []).length);
      for (const item of payload.items || []) labelCache.current.set(item.senderId, item.senderLabel);
    } catch {
      // Next event retries.
    }
  }, []);

  const knownRequests = useRef<Set<string>>(new Set());
  const requestsPrimed = useRef(false);

  /** Pending connection requests: badge count plus a one-off announcement. */
  const refreshRequests = useCallback(async () => {
    if (!browserSupabase) return;
    const { data } = await browserSupabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setPendingRequests(0);
      return;
    }
    try {
      const response = await fetch("/api/connections", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        incoming: { id: string; peerId: string; peerLabel: string; createdAt: string }[];
      };
      const incoming = payload.incoming || [];
      setPendingRequests(incoming.length);

      const arrivals = incoming.filter((row) => !knownRequests.current.has(row.id));
      knownRequests.current = new Set(incoming.map((row) => row.id));

      // The first pass is a baseline, so an existing backlog stays quiet.
      if (!requestsPrimed.current) {
        requestsPrimed.current = true;
        return;
      }
      const latest = arrivals[arrivals.length - 1];
      if (!latest) return;

      const item: UnreadItem = {
        id: `conn-${latest.id}`,
        senderId: latest.peerId,
        senderLabel: latest.peerLabel,
        preview: "wants to connect with you",
        createdAt: latest.createdAt,
        kind: "connection",
      };

      if (currentPermission() === "granted" && (document.visibilityState !== "visible" || !document.hasFocus())) {
        try {
          new Notification(`${item.senderLabel} wants to connect`, { body: "Open Messages to respond.", tag: item.id as string });
          return;
        } catch {
          // Fall through to the in-app toast.
        }
      }
      setToast(item);
    } catch {
      // Next event retries.
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void refreshUnread();
      void refreshRequests();
    }, REFRESH_DEBOUNCE_MS);
  }, [refreshUnread, refreshRequests]);

  const labelFor = useCallback(async (senderId: string, token: string) => {
    const cached = labelCache.current.get(senderId);
    if (cached) return cached;
    try {
      const response = await fetch(`/api/messages/sender?id=${senderId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return "New message";
      const { label } = await response.json();
      labelCache.current.set(senderId, label);
      return label as string;
    } catch {
      return "New message";
    }
  }, []);

  const announce = useCallback(
    async (
      row: {
        id: number;
        sender_id: string | null;
        anon_visitor_id?: string | null;
        body: string;
        attachment_kind?: AttachmentKind | null;
        created_at: string;
      },
      token: string,
    ) => {
      // An anonymous thread is identified by its visitor, not by a sender id.
      const peerKey = row.anon_visitor_id || row.sender_id;
      if (!peerKey) return;

      // Already reading this thread? Nothing to announce.
      if (isConversationOnScreen(peerKey)) return;

      const item: UnreadItem = {
        id: row.id,
        senderId: peerKey,
        senderLabel: await labelFor(peerKey, token),
        preview: preview(row.body, row.attachment_kind || null),
        createdAt: row.created_at,
      };

      const canNotify = currentPermission() === "granted";
      const inBackground = document.visibilityState !== "visible" || !document.hasFocus();

      // A system notification when the tab is not in front, a toast when it is.
      if (canNotify && inBackground) {
        try {
          const notification = new Notification(`${item.senderLabel} sent you a message`, {
            body: item.preview,
            tag: `dm-${item.id}`,
            icon: "/icon.svg",
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
          return;
        } catch {
          // Fall through to the toast if the constructor is unavailable.
        }
      }

      setToast(item);
    },
    [labelFor],
  );

  useEffect(() => {
    void refreshUnread();
    void refreshRequests();
    if (!browserSupabase) return;
    const supabase = browserSupabase;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const user = data.session?.user;
      if (!token || !user || cancelled) return;
      userIdRef.current = user.id;

      await primeRealtimeAuth(supabase);
      if (cancelled) return;

      channel = supabase
        .channel(`dm-inbox-watch-${Date.now()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (event) => {
          const row = event.new as {
            id: number;
            sender_id: string | null;
            recipient_id: string | null;
            anon_visitor_id?: string | null;
            body: string;
            attachment_kind?: AttachmentKind | null;
            created_at: string;
          };
          scheduleRefresh();
          if (row.recipient_id !== userIdRef.current) return;
          void announce(row, token);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, scheduleRefresh)
        .subscribe((status) => {
          // A dropped socket would otherwise leave the badge frozen.
          if (status === "SUBSCRIBED" || isDeadChannelStatus(status)) scheduleRefresh();
        });
    })();

    // Backstop for a socket that never recovers.
    const onFocus = () => scheduleRefresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    const { data: auth } = supabase.auth.onAuthStateChange(() => void refreshUnread());

    return () => {
      cancelled = true;
      if (debounce.current) clearTimeout(debounce.current);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      auth.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refreshUnread, refreshRequests, scheduleRefresh, announce]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported" as const;
    const result = (await Notification.requestPermission()) as NotificationPermissionState;
    setPermission(result);
    return result;
  }, []);

  return {
    // The dock badge covers unread messages and pending requests together.
    unreadCount: unreadCount + pendingRequests,
    messageCount: unreadCount,
    pendingRequests,
    toast,
    dismissToast: () => setToast(null),
    permission,
    requestPermission,
    refresh: refreshUnread,
    refreshRequests,
  };
}
