"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppId } from "@/lib/os-apps";
import type { OSData } from "@/lib/os-data";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { useVisitLogger } from "@/hooks/useVisitLogger";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { useDirectMessageNotifications } from "@/hooks/useDirectMessageNotifications";
import BootScreen from "./BootScreen";
import Desktop from "./Desktop";
import UsernamePrompt from "./UsernamePrompt";
import MobileHomeScreen from "@/components/mobile/MobileHomeScreen";

const BOOT_FLAG = "sandeep-os-booted";

/** Builds the boot log out of whatever real portfolio content is available. */
function bootLines(data: OSData) {
  const lines = ["[OK] Initializing Sandeep OS v1.0…"];

  const role = data.profile?.role;
  if (role) lines.push(`[OK] Loading profile: ${role}…`);

  const experience = data.experiences[0];
  if (experience) lines.push(`[OK] Loading experience: ${experience.role} @ ${experience.company}…`);

  const projects = data.projects.slice(0, 2).map((project) => project.name);
  if (projects.length) lines.push(`[OK] Loading projects: ${projects.join(" & ")}…`);

  const skills = data.featuredSkills.slice(0, 3);
  if (skills.length) lines.push(`[OK] Loading skills: ${skills.join(", ")}…`);

  lines.push("[OK] Mounting community wall and message inbox…");
  lines.push("[OK] System ready. Welcome!");
  return lines;
}

export default function OSShell({ data, initialApp = null }: { data: OSData; initialApp?: AppId | null }) {
  const isMobile = useIsMobile();
  const [booted, setBooted] = useState(false);
  const [checkedBootFlag, setCheckedBootFlag] = useState(false);
  const { token, profile, refresh } = useViewerProfile();

  const { unreadCount, toast, dismissToast } = useDirectMessageNotifications();

  usePresenceHeartbeat();
  useVisitLogger();

  // Boot once per browser session; later visits go straight to the desktop.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(BOOT_FLAG)) setBooted(true);
    } catch {
      // Private mode or blocked storage: just boot again.
    }
    setCheckedBootFlag(true);
  }, []);

  const finishBoot = useCallback(() => {
    try {
      sessionStorage.setItem(BOOT_FLAG, "1");
    } catch {
      // Non-fatal — the boot screen simply replays next time.
    }
    setBooted(true);
  }, []);

  const lines = useMemo(() => bootLines(data), [data]);

  // Hold a plain dark screen until we know the viewport and the boot flag,
  // so neither shell flashes on first paint.
  if (!checkedBootFlag || isMobile === undefined) {
    return <div className="fixed inset-0 bg-[#0a0a0f]" />;
  }

  if (!booted) return <BootScreen lines={lines} onComplete={finishBoot} />;

  return (
    <>
      {isMobile ? (
        <MobileHomeScreen
          data={data}
          initialApp={initialApp}
          unreadCount={unreadCount}
          toast={toast}
          onDismissToast={dismissToast}
          isAdmin={Boolean(profile?.isAdmin)}
        />
      ) : (
        <Desktop
          data={data}
          initialApp={initialApp}
          unreadCount={unreadCount}
          toast={toast}
          onDismissToast={dismissToast}
          isAdmin={Boolean(profile?.isAdmin)}
        />
      )}

      {profile?.needsUsername && <UsernamePrompt token={token} email={profile.email} onClaimed={refresh} />}
    </>
  );
}
