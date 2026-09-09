"use client";

import { useEffect, useState } from "react";
import { HiOutlineBellAlert, HiOutlineBellSlash, HiOutlineCheckCircle, HiOutlineArrowUpOnSquare } from "react-icons/hi2";
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
 * Always-visible notification control. Previously this only rendered while the
 * permission was "default", which meant phones that cannot grant it (iOS Safari
 * outside an installed PWA) showed nothing at all.
 */
export default function NotificationSetting() {
  const [permission, setPermission] = useState<NotificationPermissionState>("unsupported");
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPermission(currentPermission());
    setIos(isIos());
    setInstalled(isInstalled());
  }, []);

  async function enable() {
    if (typeof Notification === "undefined" || busy) return;
    setBusy(true);
    try {
      setPermission((await Notification.requestPermission()) as NotificationPermissionState);
    } finally {
      setBusy(false);
    }
  }

  if (permission === "granted") {
    return (
      <p className="dm-notify granted">
        <HiOutlineCheckCircle className="h-4 w-4 flex-shrink-0" />
        Notifications are on. You&apos;ll get an alert whenever this tab isn&apos;t in front.
      </p>
    );
  }

  if (permission === "denied") {
    return (
      <p className="dm-notify blocked">
        <HiOutlineBellSlash className="h-4 w-4 flex-shrink-0" />
        Notifications are blocked. Allow them for this site in your browser settings, then reload.
      </p>
    );
  }

  if (permission === "unsupported") {
    // iOS only exposes the Notification API to a home-screen install.
    if (ios && !installed) {
      return (
        <p className="dm-notify">
          <HiOutlineArrowUpOnSquare className="h-4 w-4 flex-shrink-0" />
          To get notifications on iPhone, tap Share then <strong>Add to Home Screen</strong>, and open it from there.
        </p>
      );
    }
    return (
      <p className="dm-notify">
        <HiOutlineBellSlash className="h-4 w-4 flex-shrink-0" />
        This browser doesn&apos;t support notifications. New messages still show a banner while the app is open.
      </p>
    );
  }

  return (
    <button type="button" className="dm-notify-cta" onClick={() => void enable()} disabled={busy}>
      <HiOutlineBellAlert className="h-4 w-4" />
      {busy ? "Waiting for permission…" : "Turn on notifications for new messages"}
    </button>
  );
}
