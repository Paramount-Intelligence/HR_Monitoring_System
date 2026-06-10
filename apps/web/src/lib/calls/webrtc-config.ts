/** Build WebRTC ICE servers from public env vars (STUN required, TURN optional). */
export function buildIceServers(): RTCIceServer[] {
  const stunUrl =
    process.env.NEXT_PUBLIC_STUN_URL ||
    process.env.NEXT_PUBLIC_WEBRTC_STUN_URL ||
    'stun:stun.l.google.com:19302';

  const servers: RTCIceServer[] = [{ urls: stunUrl }];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL?.trim();
  if (turnUrl) {
    const turn: RTCIceServer = { urls: turnUrl };
    const username = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
    const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();
    if (username) turn.username = username;
    if (credential) turn.credential = credential;
    servers.push(turn);
  }

  return servers;
}
