/** Normalize WebRTC signal payloads from API/WS (object or JSON string). */
export function parseSignalPayload(payload: unknown): Record<string, unknown> {
  if (payload == null) return {};
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }
  return {};
}

/** Normalize ICE candidate for react-native-webrtc / backend. */
export function normalizeIceCandidate(candidate: unknown): Record<string, unknown> {
  const parsed = parseSignalPayload(candidate);
  if (parsed.candidate) return parsed;

  const raw = candidate as { toJSON?: () => Record<string, unknown> } | null;
  if (raw && typeof raw.toJSON === 'function') {
    return raw.toJSON();
  }

  return parsed;
}
