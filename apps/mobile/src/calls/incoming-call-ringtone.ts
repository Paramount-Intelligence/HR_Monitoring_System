import { Platform, Vibration } from 'react-native';
import type { AudioPlayer } from 'expo-audio/build/AudioModule.types';
import { secureLog } from '../utils/secure-log';

const INCOMING_CALL_SOUND = require('../../assets/sounds/incoming-call.wav');

let activeCallId: string | null = null;
let player: AudioPlayer | null = null;
let starting = false;

async function configurePlaybackMode(): Promise<void> {
  const { setAudioModeAsync } = await import('expo-audio');
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
    allowsRecording: false,
  });
}

/**
 * Plays a short looping ringtone and vibration while an incoming call modal is visible.
 * Idempotent per call ID — will not restart for the same call event.
 */
export async function startIncomingCallRingtone(callId: string): Promise<void> {
  if (!callId) return;
  if (activeCallId === callId && (player?.playing || starting)) return;

  await stopIncomingCallRingtone();
  activeCallId = callId;
  starting = true;

  if (Platform.OS === 'android') {
    Vibration.vibrate([0, 800, 400, 800], true);
  }

  try {
    const { createAudioPlayer } = await import('expo-audio');
    await configurePlaybackMode();
    player = createAudioPlayer(INCOMING_CALL_SOUND);
    player.loop = true;
    player.volume = 1;
    player.play();
    secureLog('CALL_MOBILE', 'incoming_ringtone_started');
  } catch {
    secureLog('CALL_MOBILE', 'incoming_ringtone_unavailable');
  } finally {
    starting = false;
  }
}

/** Stops ringtone and vibration — safe to call when idle. */
export async function stopIncomingCallRingtone(): Promise<void> {
  Vibration.cancel();
  activeCallId = null;
  starting = false;

  const current = player;
  player = null;
  if (!current) return;

  try {
    current.pause();
    current.remove();
    secureLog('CALL_MOBILE', 'incoming_ringtone_stopped');
  } catch {
    secureLog('CALL_MOBILE', 'incoming_ringtone_stop_skipped');
  }
}
