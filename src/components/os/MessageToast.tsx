"use client";

import { useEffect } from "react";
import { HiOutlineEnvelope, HiOutlineXMark } from "react-icons/hi2";
import type { UnreadItem } from "@/hooks/useDirectMessageNotifications";

const AUTO_DISMISS_MS = 8000;

interface MessageToastProps {
  item: UnreadItem | null;
  onOpen: () => void;
  onDismiss: () => void;
}

/** In-app notification for a new direct message while the tab is focused. */
export default function MessageToast({ item, onOpen, onDismiss }: MessageToastProps) {
  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  if (!item) return null;

  return (
    <div className="dm-toast animate-scale-in" role="status" aria-live="polite">
      <button
        type="button"
        className="dm-toast-body"
        onClick={() => {
          onOpen();
          onDismiss();
        }}
      >
        <span className="dm-toast-icon">
          <HiOutlineEnvelope className="h-5 w-5" />
        </span>
        <span className="dm-toast-text">
          <strong>{item.senderLabel}</strong>
          <em>{item.preview}</em>
        </span>
      </button>
      <button type="button" className="dm-toast-close" onClick={onDismiss} aria-label="Dismiss notification">
        <HiOutlineXMark className="h-4 w-4" />
      </button>
    </div>
  );
}
