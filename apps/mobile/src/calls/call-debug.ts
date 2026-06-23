import { secureLog } from '../utils/secure-log';

const CALL_DEBUG =
  typeof process !== 'undefined' &&
  (process.env.EXPO_PUBLIC_CALL_DEBUG === 'true' || __DEV__);

function maskCallId(callId: string | undefined | null): string {
  if (!callId) return 'unknown';
  if (callId.length <= 8) return callId;
  return `${callId.slice(0, 8)}…`;
}

export function logCallDebug(message: string, detail?: Record<string, unknown>): void {
  if (!CALL_DEBUG) return;
  if (!detail) {
    secureLog('CALL_DEBUG', message);
    return;
  }
  const safe = Object.fromEntries(
    Object.entries(detail).map(([key, value]) => {
      if (key === 'callId' && typeof value === 'string') {
        return [key, maskCallId(value)];
      }
      return [key, value];
    })
  );
  secureLog('CALL_DEBUG', `${message} ${JSON.stringify(safe)}`);
}
