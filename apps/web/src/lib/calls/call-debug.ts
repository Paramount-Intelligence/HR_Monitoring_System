const CALL_DEBUG =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CALL_DEBUG === 'true';

function maskCallId(callId: string | undefined | null): string {
  if (!callId) return 'unknown';
  if (callId.length <= 8) return callId;
  return `${callId.slice(0, 8)}…`;
}

export function logCallDebug(message: string, detail?: Record<string, unknown>): void {
  if (!CALL_DEBUG && process.env.NODE_ENV === 'production') return;
  const safeDetail = detail
    ? Object.fromEntries(
        Object.entries(detail).map(([key, value]) => {
          if (key === 'callId' && typeof value === 'string') {
            return [key, maskCallId(value)];
          }
          return [key, value];
        })
      )
    : undefined;
  if (safeDetail) {
    console.log(`[CallDebug] ${message}`, safeDetail);
  } else {
    console.log(`[CallDebug] ${message}`);
  }
}

/** Shared web/mobile realtime call event contract (backend RealtimeService). */
export const CALL_REALTIME_EVENTS = {
  incoming: ['call_incoming', 'incoming_call'] as const,
  accepted: 'call_accepted',
  declined: 'call_declined',
  ended: 'call_ended',
  missed: 'call_missed',
  signal: 'call_signal',
} as const;

export const CALL_SIGNAL_TYPES = ['offer', 'answer', 'ice_candidate', 'end'] as const;
