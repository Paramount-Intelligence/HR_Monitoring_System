import { Platform } from 'react-native';
import { getInfoAsync } from 'expo-file-system/legacy';
import {
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';
import type { AudioRecorder } from 'expo-audio/build/AudioModule.types';
import { ensureRecordingPermission } from './recording-permissions';
import {
  computeDurationSeconds,
  inferFileName,
  inferMimeFromUri,
  logRecording,
  resolveRecordingType,
} from './recording-utils';
import { isIosCallRecordingBlocked } from './recording-platform';
import type { CallType, RecordingType } from '../types/calls';

export interface MobileRecordingStopResult {
  localUri: string;
  mimeType: string;
  fileName: string;
  fileSizeBytes: number;
  durationSeconds: number;
  recordingType: RecordingType;
  startedAt: string;
  endedAt: string;
}

type AudioModuleShape = {
  AudioRecorder: new (options: typeof RecordingPresets.HIGH_QUALITY) => AudioRecorder;
};

let audioModule: AudioModuleShape | null = null;

async function loadAudioModule(): Promise<AudioModuleShape | null> {
  if (Platform.OS === 'web') return null;
  if (audioModule) return audioModule;
  try {
    const mod = await import('expo-audio/build/AudioModule');
    audioModule = mod.default as AudioModuleShape;
    return audioModule;
  } catch {
    return null;
  }
}

export async function isMobileRecordingSupported(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (isIosCallRecordingBlocked()) {
    logRecording('unsupported reason=ios-pending-testflight-validation');
    return false;
  }
  const mod = await loadAudioModule();
  return Boolean(mod?.AudioRecorder);
}

/**
 * Records local microphone during an active call using expo-audio.
 * Does NOT capture remote WebRTC audio (no MediaRecorder / AudioContext on RN).
 */
export class MobileCallRecorder {
  private recorder: AudioRecorder | null = null;
  private callId: string | null = null;
  private startedAt: string | null = null;
  private isActive = false;

  get active(): boolean {
    return this.isActive;
  }

  async start(callId: string): Promise<void> {
    if (this.isActive) return;

    if (isIosCallRecordingBlocked()) {
      logRecording('unsupported reason=ios-pending-testflight-validation');
      throw new Error('Call recording on iOS is not enabled until TestFlight validation.');
    }

    const mod = await loadAudioModule();
    if (!mod) {
      logRecording('unsupported reason=expo-audio-unavailable');
      throw new Error('Recording is not available on this device build.');
    }

    const permitted = await ensureRecordingPermission();
    if (!permitted) {
      logRecording('unsupported reason=microphone-permission-denied');
      throw new Error('Microphone permission is required for call recording.');
    }

    logRecording(`preparing call_id=${callId}`);

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
      shouldRouteThroughEarpiece: false,
    });

    const recorder = new mod.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await recorder.prepareToRecordAsync();
    recorder.record();

    if (!recorder.isRecording) {
      throw new Error('Recorder did not enter recording state.');
    }

    this.recorder = recorder;
    this.callId = callId;
    this.startedAt = new Date().toISOString();
    this.isActive = true;
    logRecording(`started call_id=${callId} type=audio`);
  }

  async stop(callType: CallType): Promise<MobileRecordingStopResult | null> {
    if (!this.recorder || !this.callId) return null;

    const callId = this.callId;
    logRecording(`stopping call_id=${callId}`);

    try {
      await this.recorder.stop();
    } catch (error) {
      logRecording(`stop_failed call_id=${callId} message=${String(error)}`);
      this.cleanup();
      return null;
    }

    const endedAt = new Date().toISOString();
    const uri = this.recorder.uri;
    const startedAt = this.startedAt ?? endedAt;
    this.cleanup();

    if (!uri) {
      logRecording(`stopped call_id=${callId} size=0 reason=no-uri`);
      return null;
    }

    const fileInfo = await getInfoAsync(uri);
    if (!fileInfo.exists || !('size' in fileInfo) || !fileInfo.size || fileInfo.size <= 0) {
      logRecording(`stopped call_id=${callId} size=0 reason=empty-file`);
      return null;
    }

    const mimeType = inferMimeFromUri(uri);
    const fileName = inferFileName(callId, uri);
    const durationSeconds = computeDurationSeconds(startedAt, endedAt);
    const recordingType = resolveRecordingType(callType);

    logRecording(`stopped call_id=${callId} size=${fileInfo.size}`);

    return {
      localUri: uri,
      mimeType,
      fileName,
      fileSizeBytes: fileInfo.size,
      durationSeconds,
      recordingType,
      startedAt,
      endedAt,
    };
  }

  cleanup(): void {
    this.recorder = null;
    this.callId = null;
    this.startedAt = null;
    this.isActive = false;
  }
}

export const mobileCallRecorder = new MobileCallRecorder();
