import { Platform, Vibration } from 'react-native';
import { secureLog } from '../utils/secure-log';

let activeCallId: string | null = null;

/**
 * Vibrates while an incoming call modal is visible (foreground).
 * Sound uses the device default via the `incoming-calls` notification channel
 * when a push arrives in background — no custom app ringtone is played.
 */
export async function startIncomingCallRingtone(callId: string): Promise<void> {
  if (!callId) return;
  if (activeCallId === callId) return;

  await stopIncomingCallRingtone();
  activeCallId = callId;

  if (Platform.OS === 'android') {
    Vibration.vibrate([0, 800, 400, 800, 400, 800], true);
  }

  secureLog('CALL_MOBILE', 'incoming_vibration_started');
}

/** Stops vibration — safe to call when idle. */
export async function stopIncomingCallRingtone(): Promise<void> {
  Vibration.cancel();
  activeCallId = null;
  secureLog('CALL_MOBILE', 'incoming_vibration_stopped');
}
