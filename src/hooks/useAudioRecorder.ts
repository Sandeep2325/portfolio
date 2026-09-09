"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "recorded" | "denied" | "unsupported";

export type AudioClip = { blob: Blob; url: string; durationMs: number; mime: string };

/** Voice notes longer than this are almost never wanted; stop automatically. */
const MAX_DURATION_MS = 5 * 60_000;

const PREFERRED_MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  return PREFERRED_MIMES.find((mime) => MediaRecorder.isTypeSupported(mime)) || "";
}

/**
 * WhatsApp-style voice notes: record, watch a live level meter, then review the
 * clip before sending it.
 */
export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [clip, setClip] = useState<AudioClip | null>(null);
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const clipUrlRef = useRef<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const teardown = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    recorderRef.current = null;
    setLevel(0);
  }, []);

  // Release the microphone and any object URL when the component unmounts.
  useEffect(
    () => () => {
      teardown();
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    },
    [teardown],
  );

  const start = useCallback(async () => {
    if (!supported) {
      setState("unsupported");
      setError("Voice notes are not supported in this browser.");
      return;
    }

    setError("");
    setState("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState("denied");
      setError("Microphone access was blocked. Allow it in your browser settings to record.");
      return;
    }

    streamRef.current = stream;

    // Live level meter for the waveform bars.
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);

      const measure = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const centred = (sample - 128) / 128;
          sum += centred * centred;
        }
        setLevel(Math.min(1, Math.sqrt(sum / samples.length) * 3));
        frameRef.current = requestAnimationFrame(measure);
      };
      measure();
    } catch {
      // Meter is decorative; recording continues without it.
    }

    const mime = pickMime();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = recorder;

    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const durationMs = Date.now() - startedAtRef.current;
      const type = recorder.mimeType || mime || "audio/webm";
      const blob = new Blob(chunks, { type });
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
      const url = URL.createObjectURL(blob);
      clipUrlRef.current = url;
      setClip({ blob, url, durationMs, mime: type });
      setState("recorded");
      teardown();
    };

    startedAtRef.current = Date.now();
    setElapsedMs(0);
    recorder.start();
    setState("recording");

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_DURATION_MS && recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, 100);
  }, [supported, teardown]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const discard = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      // Drop whatever onstop produces by clearing the handler first.
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    teardown();
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    clipUrlRef.current = null;
    setClip(null);
    setElapsedMs(0);
    setState("idle");
  }, [teardown]);

  return { state, supported, elapsedMs, level, clip, error, start, stop, discard };
}
