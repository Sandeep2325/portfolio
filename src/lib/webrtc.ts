/**
 * ICE configuration for peer-to-peer calls.
 *
 * STUN alone lets two browsers find each other on most networks. Symmetric
 * NATs and some mobile carriers need a TURN relay, which has to be hosted; set
 * the NEXT_PUBLIC_TURN_* values to add one and those calls will connect too.
 */
export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }

  return servers;
}

export const hasTurn = () => Boolean(process.env.NEXT_PUBLIC_TURN_URL);

export function formatCallTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
