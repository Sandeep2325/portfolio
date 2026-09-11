"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { browserSupabase } from "@/lib/supabase-browser";
import { primeRealtimeAuth } from "@/lib/realtime";
import { iceServers } from "@/lib/webrtc";

export type CallState = "idle" | "calling" | "ringing" | "connecting" | "active" | "ended";

type Signal =
  | { type: "offer"; from: string; sdp: RTCSessionDescriptionInit; video: boolean }
  | { type: "answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; from: string; candidate: RTCIceCandidateInit }
  | { type: "end"; from: string; reason: "declined" | "hangup" | "busy" | "unavailable" };

/** Omit across a union keeps each member's own fields; a plain Omit collapses
 *  them to the shared keys. */
type Without<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type OutgoingSignal = Without<Signal, "from">;

/** Give up on an unanswered call rather than ringing forever. */
const RING_TIMEOUT_MS = 45_000;

export function useCall(selfId: string, peerId: string) {
  const [state, setState] = useState<CallState>("idle");
  const [isVideo, setIsVideo] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState("");
  const [endedReason, setEndedReason] = useState("");
  const [seconds, setSeconds] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const incomingOffer = useRef<{ sdp: RTCSessionDescriptionInit; video: boolean } | null>(null);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<CallState>("idle");

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const send = useCallback((signal: OutgoingSignal) => {
    void channelRef.current?.send({ type: "broadcast", event: "call", payload: { ...signal, from: selfId } });
  }, [selfId]);

  /** Tears down media and the peer connection, leaving signalling intact. */
  const cleanup = useCallback(() => {
    if (ringTimer.current) clearTimeout(ringTimer.current);
    ringTimer.current = null;
    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    pendingIce.current = [];
    incomingOffer.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
    setSeconds(0);
  }, []);

  const finish = useCallback(
    (reason: string, notifyPeer: boolean) => {
      if (notifyPeer && stateRef.current !== "idle") {
        send({ type: "end", reason: reason === "declined" ? "declined" : "hangup" });
      }
      cleanup();
      setEndedReason(reason);
      setState("ended");
      setTimeout(() => setState((current) => (current === "ended" ? "idle" : current)), 2200);
    },
    [cleanup, send],
  );

  /** Builds the peer connection and wires media + ICE through the channel. */
  const createConnection = useCallback(
    async (video: boolean) => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      } catch {
        setError(video ? "Camera or microphone was blocked." : "Microphone was blocked.");
        throw new Error("media-denied");
      }

      localRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      pcRef.current = pc;
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      const remote = new MediaStream();
      setRemoteStream(remote);
      pc.ontrack = (event) => {
        for (const track of event.streams[0]?.getTracks() || []) remote.addTrack(track);
        setRemoteStream(new MediaStream(remote.getTracks()));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) send({ type: "ice", candidate: event.candidate.toJSON() });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setState("active");
        if (pc.connectionState === "failed") finish("Connection failed", false);
      };

      return pc;
    },
    [send, finish],
  );

  const startCall = useCallback(
    async (video: boolean) => {
      if (stateRef.current !== "idle" || !peerId) return;
      setError("");
      setEndedReason("");
      setIsVideo(video);
      setState("calling");

      try {
        const pc = await createConnection(video);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: "offer", sdp: offer, video });

        ringTimer.current = setTimeout(() => {
          if (stateRef.current === "calling") finish("No answer", true);
        }, RING_TIMEOUT_MS);
      } catch {
        cleanup();
        setState("idle");
      }
    },
    [peerId, createConnection, send, finish, cleanup],
  );

  const accept = useCallback(async () => {
    const offer = incomingOffer.current;
    if (!offer) return;
    setState("connecting");

    try {
      const pc = await createConnection(offer.video);
      await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      for (const candidate of pendingIce.current) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      pendingIce.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: "answer", sdp: answer });
    } catch {
      finish("Could not start call", true);
    }
  }, [createConnection, send, finish]);

  const decline = useCallback(() => finish("declined", true), [finish]);
  const hangUp = useCallback(() => finish("Call ended", true), [finish]);

  const toggleMute = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOff(!track.enabled);
  }, []);

  // Signalling channel, shared by both sides of the conversation.
  useEffect(() => {
    if (!browserSupabase || !selfId || !peerId) return;
    const supabase = browserSupabase;
    const name = `call-${[selfId, peerId].sort().join("-")}`;
    let channel: RealtimeChannel | undefined;
    let cancelled = false;

    void (async () => {
      await primeRealtimeAuth(supabase);
      if (cancelled) return;

      channel = supabase.channel(name, { config: { broadcast: { self: false } } });
      channel.on("broadcast", { event: "call" }, async ({ payload }) => {
        const signal = payload as Signal;
        if (signal.from === selfId) return;

        if (signal.type === "offer") {
          // Already busy: let them know instead of silently ignoring it.
          if (stateRef.current !== "idle") {
            void channel?.send({ type: "broadcast", event: "call", payload: { type: "end", from: selfId, reason: "busy" } });
            return;
          }
          incomingOffer.current = { sdp: signal.sdp, video: signal.video };
          setIsVideo(signal.video);
          setState("ringing");
          return;
        }

        if (signal.type === "answer") {
          if (!pcRef.current) return;
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          for (const candidate of pendingIce.current) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          pendingIce.current = [];
          // ICE can complete while the awaits above are still running, so never
          // step back from "active" - that left the caller stuck on Connecting.
          setState((current) => (current === "active" ? current : "connecting"));
          return;
        }

        if (signal.type === "ice") {
          // Candidates can arrive before the remote description is set.
          if (pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
          else pendingIce.current.push(signal.candidate);
          return;
        }

        if (signal.type === "end") {
          const label =
            signal.reason === "declined" ? "Call declined" : signal.reason === "busy" ? "Peer is busy" : "Call ended";
          cleanup();
          setEndedReason(label);
          setState("ended");
          setTimeout(() => setState((current) => (current === "ended" ? "idle" : current)), 2200);
        }
      });

      channel.subscribe();
      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [selfId, peerId, cleanup]);

  // Call duration.
  useEffect(() => {
    if (state !== "active") return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  // Never leave the camera light on.
  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    const onUnload = () => {
      if (stateRef.current !== "idle") send({ type: "end", reason: "hangup" });
    };
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, [send]);

  return {
    state,
    isVideo,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    error,
    endedReason,
    seconds,
    supported:
      typeof window !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof window.RTCPeerConnection === "function",
    startCall,
    accept,
    decline,
    hangUp,
    toggleMute,
    toggleCamera,
  };
}
