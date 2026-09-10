"use client";

import { useEffect, useState } from "react";
import { HiOutlineBellAlert, HiOutlineBellSlash, HiOutlineBell } from "react-icons/hi2";
import { currentPermission, type NotificationPermissionState } from "@/hooks/useDirectMessageNotifications";

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalled() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Compact bell in the panel header. Explanations live in a tooltip rather than
 * a banner, so the guidance costs no vertical space in the thread.
 */
export default function NotificationSetting() {
  const [permission, setPermission] = useState<NotificationPermissionState>("unsupported");
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPermission(currentPermission());
    setIos(isIos());
    setInstalled(isInstalled());
  }, []);

  // Tapping the bell on a phone reveals the tooltip; dismiss it on the next tap.
  useEffect(() => {
    if (!showHint) return;
    const close = () => setShowHint(false);
    const timer = setTimeout(close, 6000);
    document.addEventListener("pointerdown", close);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", close);
    };
  }, [showHint]);

  async function enable() {
    if (typeof Notification === "undefined" || busy) return;
    setBusy(true);
    try {
      setPermission((await Notification.requestPermission()) as NotificationPermissionState);
    } finally {
      setBusy(false);
    }
  }

  let icon = <HiOutlineBellAlert className="h-4 w-4" />;
  let hint = "Turn on notifications for new messages";
  let tone = "";
  let onClick: () => void = () => void enable();

  if (permission === "granted") {
    icon = <HiOutlineBell className="h-4 w-4" />;
    hint = "Notifications on — you'll be alerted when this tab isn't in front";
    tone = "on";
    onClick = () => setShowHint((open) => !open);
  } else if (permission === "denied") {
    icon = <HiOutlineBellSlash className="h-4 w-4" />;
    hint = "Notifications are blocked. Allow them for this site in your browser settings, then reload.";
    tone = "muted";
    onClick = () => setShowHint((open) => !open);
  } else if (permission === "unsupported") {
    icon = <HiOutlineBellSlash className="h-4 w-4" />;
    hint =
      ios && !installed
        ? "To get notifications on iPhone: tap Share, then Add to Home Screen, and open it from there."
        : "This browser doesn't support notifications. New messages still show a banner while the app is open.";
    tone = "muted";
    onClick = () => setShowHint((open) => !open);
  }

  return (
    <span className="dm-bell-wrap">
      <button
        type="button"
        className={`dm-bell ${tone}`}
        title={hint}
        aria-label={hint}
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
      >
        {icon}
      </button>
      {showHint && <span className="dm-bell-hint">{hint}</span>}
    </span>
  );
}
