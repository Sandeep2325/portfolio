"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

/** `undefined` until mounted, so the shell can avoid a desktop/mobile flash. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const sync = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return isMobile;
}
