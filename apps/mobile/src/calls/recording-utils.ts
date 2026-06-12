import { Platform } from 'react-native';
import type { CallType, RecordingType } from '../types/calls';
import { secureLog } from '../utils/secure-log';

/** Mobile records local microphone only — not mixed remote audio (platform limitation). */
export const MOBILE_RECORDING_LIMITATION =
  'Mobile recordings capture this device microphone only. Remote participant audio is not mixed.';

export function inferMimeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.caf')) return 'audio/mp4';
  if (lower.endsWith('.mp4')) return 'audio/mp4';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.aac')) return 'audio/aac';
  return Platform.OS === 'ios' ? 'audio/mp4' : 'audio/mp4';
}

export function inferFileName(callId: string, uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() || 'm4a';
  return `call-${callId}.${ext}`;
}

/** Mobile always uploads audio tracks; video calls use recording_type=audio metadata. */
export function resolveRecordingType(_callType: CallType): RecordingType {
  return 'audio';
}

export function computeDurationSeconds(startedAt: string | null, endedAt: string): number {
  if (!startedAt) return 0;
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.max(1, Math.round((end - start) / 1000));
}

export function logRecording(message: string): void {
  secureLog('CALL_RECORDING_MOBILE', message);
}
