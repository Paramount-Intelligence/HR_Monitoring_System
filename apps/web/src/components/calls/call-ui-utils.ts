import type { CallConnectionStatus } from '@/hooks/useCallManager';
import type { RecordingStatus } from '@/hooks/useCallRecording';

export function formatCallTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function getCallStatusLabel(
  status: CallConnectionStatus,
  durationSec: number,
  iceState?: string
): string {
  if (status === 'connected') {
    if (iceState === 'disconnected' || iceState === 'failed') return 'Reconnecting...';
    if (iceState === 'checking' || iceState === 'connecting') return 'Connecting...';
    return formatCallTimer(durationSec);
  }
  if (status === 'calling') return 'Calling...';
  if (status === 'incoming') return 'Incoming call';
  if (status === 'connecting') return 'Connecting...';
  if (status === 'failed') return 'Connection failed';
  if (status === 'ended') return 'Call ended';
  return 'Connecting...';
}

export function getCallStatusTone(
  status: CallConnectionStatus,
  iceState?: string
): 'connected' | 'warning' | 'danger' | 'neutral' {
  if (status === 'connected') {
    if (iceState === 'disconnected' || iceState === 'failed') return 'warning';
    if (iceState === 'checking' || iceState === 'connecting') return 'warning';
    return 'connected';
  }
  if (status === 'failed') return 'danger';
  if (status === 'calling' || status === 'connecting') return 'warning';
  return 'neutral';
}

export function shouldShowRecordingBadge(status: RecordingStatus, isRecordingActive: boolean): boolean {
  return isRecordingActive || status === 'recording';
}

export function shouldShowRecordingConsent(status: RecordingStatus, isRecordingActive: boolean): boolean {
  return isRecordingActive || status === 'recording' || status === 'preparing';
}
