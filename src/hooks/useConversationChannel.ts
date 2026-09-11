"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { browserSupabase } from "@/lib/supabase-browser";
import { primeRealtimeAuth, isDeadChannelStatus } from "@/lib/realtime";

/** Stop showing "typing…" if the peer goes quiet without sending a stop event. */
const TYPING_TIMEOUT_MS = 3500;
/** Don't broadcast more than once per this window while someone types. */
const TYPING_THROTTLE_MS = 1500;
/** Idle gap after which we tell the peer we stopped typing. */
const TYPING_IDLE_MS = 2500;

/**
 * One realtime channel per conversation, carrying both presence ("is the peer
 * looking at this thread right now") and typing broadcasts. The channel name is
 * derived from the sorted pair of user ids so both sides land on the same one.
 */
export function useConversationChannel(userId: string, peerId: string, token: string) {
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPeerOnline(false);
    setPeerTyping(false);

    // No token requirement: broadcast and presence work for anonymous
    // visitors too, they just cannot use postgres_changes.
    if (!browserSupabase || !userId || !peerId) return;
    const supabase = browserSupabase;
    const name = `dm-${[userId, peerId].sort().join("-")}`;

    let channel: RealtimeChannel | undefined;
    let cancelled = false;

    void (async () => {
      await primeRealtimeAuth(supabase);
      if (cancelled) return;

      channel = supabase.channel(name, {
        config: { presence: { key: userId }, broadcast: { self: false } },
      });

      const syncPresence = () => {
        const state = channel?.presenceState() || {};
        setPeerOnline(Boolean(state[peerId]?.length));
      };

      channel
        .on("presence", { event: "sync" }, syncPresence)
        .on("presence", { event: "join" }, syncPresence)
        .on("presence", { event: "leave" }, syncPresence)
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.userId !== peerId) return;
          if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
          if (payload.typing) {
            setPeerTyping(true);
            peerTypingTimerRef.current = setTimeout(() => setPeerTyping(false), TYPING_TIMEOUT_MS);
          } else {
            setPeerTyping(false);
          }
        })
        .subscribe((status) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") void channel?.track({ userId, at: Date.now() });
          // Presence and typing go silent on a dead channel; drop the stale state.
          else if (isDeadChannelStatus(status)) {
            setPeerOnline(false);
            setPeerTyping(false);
          }
        });

      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, peerId, token]);

  const sendTyping = useCallback((typing: boolean) => {
    const channel = channelRef.current;
    if (!channel) return;

    const now = Date.now();
    if (typing && now - lastSentRef.current < TYPING_THROTTLE_MS) return;
    lastSentRef.current = typing ? now : 0;

    void channel.send({ type: "broadcast", event: "typing", payload: { userId, typing } });
  }, [userId]);

  /** Call on every keystroke: broadcasts "typing", then "stopped" once idle. */
  const notifyTyping = useCallback(() => {
    sendTyping(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => sendTyping(false), TYPING_IDLE_MS);
  }, [sendTyping]);

  const stopTyping = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    sendTyping(false);
  }, [sendTyping]);

  return { peerOnline, peerTyping, notifyTyping, stopTyping };
}
