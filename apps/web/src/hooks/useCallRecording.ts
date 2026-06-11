'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CallRecorder, RecordingStatus } from '@/lib/calls/call-recorder';
import { streamHasLiveAudio, streamHasLiveVideo } from '@/lib/calls/media';
import { callsApi } from '@/lib/api/calls';
import { ensureFreshAccessToken } from '@/lib/auth/token-utils';
import { getErrorMessage } from '@/lib/api/client';

export type { RecordingStatus };

interface UseCallRecordingParams {
  callId: string | undefined;
  callType: 'voice' | 'video' | undefined;
  connectionStatus: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

function canStartRecording(
  callType: 'voice' | 'video',
  localStream: MediaStream | null,
  remoteStream: MediaStream | null
): boolean {
  const localAudio = streamHasLiveAudio(localStream);
  const remoteAudio = streamHasLiveAudio(remoteStream);
  const localVideo = streamHasLiveVideo(localStream);
  const remoteVideo = streamHasLiveVideo(remoteStream);

  if (callType === 'video') {
    return localAudio || remoteAudio || localVideo || remoteVideo;
  }

  return localAudio || remoteAudio;
}

export function useCallRecording({
  callId,
  callType,
  connectionStatus,
  localStream,
  remoteStream,
}: UseCallRecordingParams) {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const recorderRef = useRef<CallRecorder | null>(null);
  const isRecordingRef = useRef(false);
  const uploadStartedRef = useRef(false);
  const startAttemptRef = useRef(0);

  const startRecording = useCallback(() => {
    if (!callId || !callType || !localStream || isRecordingRef.current) return;
    if (!canStartRecording(callType, localStream, remoteStream)) return;

    try {
      setRecordingStatus('preparing');
      const recorder = new CallRecorder();
      recorder.start({
        callId,
        callType,
        localStream,
        remoteStream: remoteStream ?? new MediaStream(),
      });
      recorderRef.current = recorder;
      isRecordingRef.current = true;
      setRecordingStatus('recording');
    } catch (err) {
      console.warn('[VIDEO_RECORDING] Failed to start:', err);
      setRecordingStatus('failed');
      isRecordingRef.current = false;
    }
  }, [callId, callType, localStream, remoteStream]);

  const stopAndUpload = useCallback(async () => {
    if (uploadStartedRef.current) return;
    const recorder = recorderRef.current;
    if (!recorder || !callId || !isRecordingRef.current) {
      setRecordingStatus((prev) => (prev === 'recording' ? 'idle' : prev));
      return;
    }

    uploadStartedRef.current = true;
    isRecordingRef.current = false;
    setRecordingStatus('stopping');

    let result = null;
    try {
      result = await recorder.stop();
    } catch (err) {
      console.warn('[VIDEO_RECORDING] Stop failed:', err);
      setRecordingStatus('failed');
      return;
    }

    recorderRef.current = null;

    if (!result || result.blob.size === 0) {
      console.warn('[VIDEO_RECORDING] upload skipped reason=empty_blob');
      setRecordingStatus('failed');
      return;
    }

    setRecordingStatus('uploading');

    const token = await ensureFreshAccessToken();
    console.log(`[CALL_RECORDING_UPLOAD_CLIENT] current token present=${Boolean(token)}`);

    const uploadOnce = async () => {
      const formData = new FormData();
      formData.append(
        'file',
        result!.blob,
        `call-${callId}.${result!.recordingType === 'video' ? 'webm' : 'webm'}`
      );
      formData.append('recording_type', result!.recordingType);
      formData.append('duration_seconds', String(result!.durationSeconds));
      formData.append('mime_type', result!.mimeType);
      formData.append('file_size_bytes', String(result!.blob.size));
      formData.append('started_at', result!.startedAt.toISOString());
      formData.append('ended_at', result!.endedAt.toISOString());
      if (callType) {
        formData.append('call_type', callType);
      }

      console.log(
        `[VIDEO_RECORDING] uploading call_type=${callType} recording_type=${result!.recordingType}`
      );

      return callsApi.uploadCallRecording(callId, formData);
    };

    try {
      const response = await uploadOnce();
      console.log(`[VIDEO_RECORDING] upload success recording_id=${response.id}`);
      setRecordingStatus('uploaded');
    } catch (firstErr) {
      const status = (firstErr as { response?: { status?: number } })?.response?.status;
      console.warn(
        `[VIDEO_RECORDING] upload failed reason=${getErrorMessage(firstErr)} status=${status ?? 'unknown'}`
      );

      if (status === 413) {
        setRecordingStatus('failed');
        return;
      }

      await ensureFreshAccessToken();

      try {
        const response = await uploadOnce();
        console.log(`[VIDEO_RECORDING] upload success recording_id=${response.id}`);
        setRecordingStatus('uploaded');
      } catch (retryErr) {
        console.warn(`[VIDEO_RECORDING] upload failed reason=${getErrorMessage(retryErr)}`);
        setRecordingStatus('failed');
      }
    }
  }, [callId, callType]);

  useEffect(() => {
    if (
      connectionStatus !== 'connected' ||
      !callId ||
      !callType ||
      !localStream ||
      isRecordingRef.current
    ) {
      return;
    }

    if (!canStartRecording(callType, localStream, remoteStream)) {
      return;
    }

    const delayMs = callType === 'video' ? 800 : 0;
    const attempt = ++startAttemptRef.current;

    const timer = setTimeout(() => {
      if (attempt !== startAttemptRef.current || isRecordingRef.current) return;
      startRecording();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [connectionStatus, callId, callType, localStream, remoteStream, startRecording]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (isRecordingRef.current) {
        void stopAndUpload();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [stopAndUpload]);

  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        void stopAndUpload();
      }
    };
  }, [stopAndUpload]);

  const resetRecording = useCallback(() => {
    recorderRef.current = null;
    isRecordingRef.current = false;
    uploadStartedRef.current = false;
    startAttemptRef.current = 0;
    setRecordingStatus('idle');
  }, []);

  const isRecordingActive = recordingStatus === 'recording';

  return {
    recordingStatus,
    isRecordingActive,
    stopAndUpload,
    resetRecording,
  };
}
