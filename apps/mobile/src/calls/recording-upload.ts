import { uploadCallRecording } from '../api/calls.api';
import { getErrorMessage } from '../api/client';
import type { CallType } from '../types/calls';
import type { MobileRecordingStopResult } from './mobile-call-recorder';
import { logRecording } from './recording-utils';

const uploadedCallIds = new Set<string>();
const uploadInFlight = new Set<string>();

export function hasUploadedRecording(callId: string): boolean {
  return uploadedCallIds.has(callId);
}

export function resetUploadTracking(): void {
  uploadedCallIds.clear();
  uploadInFlight.clear();
}

export interface RecordingUploadResult {
  recordingId: string | null;
  message: string;
  skipped?: boolean;
}

export async function uploadMobileRecording(
  callId: string,
  callType: CallType,
  recording: MobileRecordingStopResult
): Promise<RecordingUploadResult> {
  if (uploadedCallIds.has(callId) || uploadInFlight.has(callId)) {
    return { recordingId: null, message: 'Upload already completed.', skipped: true };
  }

  uploadInFlight.add(callId);
  logRecording(`upload_start call_id=${callId}`);

  const formData = new FormData();
  formData.append('file', {
    uri: recording.localUri,
    name: recording.fileName,
    type: recording.mimeType,
  } as unknown as Blob);
  formData.append('call_type', callType);
  formData.append('recording_type', recording.recordingType);
  formData.append('duration_seconds', String(recording.durationSeconds));
  formData.append('mime_type', recording.mimeType);
  formData.append('file_size_bytes', String(recording.fileSizeBytes));
  formData.append('started_at', recording.startedAt);
  formData.append('ended_at', recording.endedAt);

  try {
    const response = await uploadCallRecording(callId, formData);
    uploadedCallIds.add(callId);
    logRecording(`upload_success recording_id=${response.id}`);
    return {
      recordingId: response.id,
      message: response.message ?? 'Recording saved',
    };
  } catch (error) {
    const message = getErrorMessage(error, 'Recording upload failed.');
    const status = (error as { response?: { status?: number } })?.response?.status;
    logRecording(`upload_failed status=${status ?? 'unknown'} message=${message}`);
    throw error;
  } finally {
    uploadInFlight.delete(callId);
  }
}

export function getUploadFailureMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 413) return 'Recording file is too large to upload.';
  if (status === 403) return 'You are not allowed to upload this recording.';
  if (status === 422) return 'Recording format was rejected by the server.';
  if (status === 401) return 'Session expired while saving recording.';
  return getErrorMessage(error, 'Call ended, but recording could not be saved.');
}
