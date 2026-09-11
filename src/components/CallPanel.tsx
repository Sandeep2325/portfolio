"use client";

import { useCallback } from "react";
import {
  HiOutlinePhone,
  HiOutlinePhoneXMark,
  HiOutlineVideoCamera,
  HiOutlineVideoCameraSlash,
  HiOutlineMicrophone,
  HiMiniSpeakerXMark,
} from "react-icons/hi2";
import { formatCallTime } from "@/lib/webrtc";
import type { useCall } from "@/hooks/useCall";

type Call = ReturnType<typeof useCall>;

/**
 * Attaches a MediaStream to whichever video element is currently mounted.
 *
 * A plain ref + effect is not enough here: the element swaps when the call
 * moves from the avatar view to the video view, and the effect would not re-run
 * for the new node, leaving it with no srcObject.
 */
function useStream(stream: MediaStream | null) {
  return useCallback(
    (node: HTMLVideoElement | null) => {
      if (node && node.srcObject !== stream) node.srcObject = stream;
    },
    [stream],
  );
}

export default function CallPanel({ call, peerLabel }: { call: Call; peerLabel: string }) {
  const remoteRef = useStream(call.remoteStream);
  const localRef = useStream(call.localStream);

  if (call.state === "idle") return null;

  const ringing = call.state === "ringing";
  const calling = call.state === "calling";
  const live = call.state === "active" || call.state === "connecting";

  const status =
    call.state === "ringing"
      ? `Incoming ${call.isVideo ? "video" : "voice"} call`
      : call.state === "calling"
        ? "Ringing…"
        : call.state === "connecting"
          ? "Connecting…"
          : call.state === "active"
            ? formatCallTime(call.seconds)
            : call.endedReason || "Call ended";

  return (
    <div className="call-overlay" role="dialog" aria-label="Call">
      <div className="call-panel">
        <div className="call-stage">
          {call.isVideo && live ? (
            <>
              <video ref={remoteRef} className="call-remote" autoPlay playsInline />
              <video ref={localRef} className="call-local" autoPlay playsInline muted />
            </>
          ) : (
            <div className="call-avatar-wrap">
              <div className={`call-avatar${calling || ringing ? " pulsing" : ""}`}>
                {peerLabel.slice(0, 1).toUpperCase()}
              </div>
              {/* Voice calls still need the audio element to play the remote track. */}
              <video ref={remoteRef} autoPlay playsInline className="sr-only-audio" />
            </div>
          )}
        </div>

        <div className="call-meta">
          <strong>{peerLabel}</strong>
          <span>{status}</span>
          {call.error && <em className="call-error">{call.error}</em>}
        </div>

        <div className="call-actions">
          {ringing ? (
            <>
              <button type="button" className="call-btn decline" onClick={call.decline} aria-label="Decline call">
                <HiOutlinePhoneXMark className="h-5 w-5" />
              </button>
              <button type="button" className="call-btn accept" onClick={() => void call.accept()} aria-label="Accept call">
                <HiOutlinePhone className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`call-btn toggle${call.muted ? " on" : ""}`}
                onClick={call.toggleMute}
                aria-label={call.muted ? "Unmute" : "Mute"}
              >
                {call.muted ? <HiMiniSpeakerXMark className="h-5 w-5" /> : <HiOutlineMicrophone className="h-5 w-5" />}
              </button>

              {call.isVideo && (
                <button
                  type="button"
                  className={`call-btn toggle${call.cameraOff ? " on" : ""}`}
                  onClick={call.toggleCamera}
                  aria-label={call.cameraOff ? "Turn camera on" : "Turn camera off"}
                >
                  {call.cameraOff ? (
                    <HiOutlineVideoCameraSlash className="h-5 w-5" />
                  ) : (
                    <HiOutlineVideoCamera className="h-5 w-5" />
                  )}
                </button>
              )}

              <button type="button" className="call-btn decline" onClick={call.hangUp} aria-label="End call">
                <HiOutlinePhoneXMark className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
