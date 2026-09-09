"use client";

/**
 * Which conversation the viewer currently has on screen.
 *
 * The notification layer lives in the OS shell while the thread lives in the
 * Messages app, so this tiny module-level signal lets the former ask "is the
 * user already looking at this sender?" without threading props through the
 * whole window tree.
 */
let activePeerId: string | null = null;

export function setActiveConversation(peerId: string | null) {
  activePeerId = peerId;
}

export function isConversationOnScreen(peerId: string) {
  return activePeerId === peerId && document.visibilityState === "visible" && document.hasFocus();
}
