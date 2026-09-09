"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";

export type UnreadItem = {
  id: number;
  senderId: string;
  senderLabel: string;
  preview: string;
  createdAt: string;
};

export type NotificationPermissionState = "unsupported" | "default" | "granted" | "denied";

const REFRESH_DEBOUNCE_MS = 300;

function currentPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission as NotificationPermissionState;
}

/**
 * Watches the caller's inbox for unread messages: drives the dock badge, raises
 * a system notification when the tab is in the background, and surfaces an
 * in-app toast when it is not.
 */
export function useDirectMessageNotifications() {
  const [items, setItems] = useState<UnreadItem[]>([]);
  const [toast, setToast] = useState<UnreadItem | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>("unsupported");

  const seenIds = useRef<Set<number>>(new Set());
  const primed = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setPermission(currentPermission()), []);

  const load = useCallback(async () => {
    if (!browserSupabase) return;
    const { data } = await browserSupabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setItems([]);
      seenIds.current = new Set();
      primed.current = false;
      return;
    }

    try {
      const response = await fetch("/api/messages/unread", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { items: UnreadItem[] };
      const fresh = payload.items || [];
      setItems(fresh);

      // The first load is a baseline — don't announce a backlog of old unreads.
      const arrivals = fresh.filter((item) => !seenIds.current.has(item.id));
      seenIds.current = new Set(fresh.map((item) => item.id));

      if (!primed.current) {
        primed.current = true;
        return;
      }
      if (arrivals.length === 0) return;

      const latest = arrivals[arrivals.length - 1];
      if (document.visibilityState === "visible") {
        setToast(latest);
      } else if (currentPermission() === "granted") {
        const notification = new Notification(`${latest.senderLabel} sent you a message`, {
          body: latest.preview,
          tag: `dm-${latest.id}`,
          icon: "/favicon.ico",
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    } catch {
      // Transient failure; the next realtime event retries.
    }
  }, []);

  const scheduleLoad = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(), REFRESH_DEBOUNCE_MS);
  }, [load]);

  useEffect(() => {
    void load();
    if (!browserSupabase) return;
    const supabase = browserSupabase;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    void supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      await supabase.realtime.setAuth(token);
      channel = supabase
        .channel("dm-inbox-watch")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, scheduleLoad)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, scheduleLoad)
        .subscribe();
    });

    const { data: auth } = supabase.auth.onAuthStateChange(() => void load());

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      auth.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [load, scheduleLoad]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermissionState);
  }, []);

  return {
    unreadCount: items.length,
    items,
    toast,
    dismissToast: () => setToast(null),
    permission,
    requestPermission,
    refresh: load,
  };
}
