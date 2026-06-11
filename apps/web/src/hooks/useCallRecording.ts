'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CallRecorder, RecordingStatus } from '@/lib/calls/call-recorder';
import { callsApi } from '@/lib/api/calls';

export type { RecordingStatus };

interface UseCallRecordingParams {
  callId: string | undefined;
  callType: 'voice' | 'video' | undefined;
  connectionStatus: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
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

  const startRecording = useCallback(() => {
    if (!callId || !callType || !localStream || isRecordingRef.current) return;
    const remoteAudioReady = remoteStream?.getAudioTracks().some((t) => t.readyState === 'live');
    if (!remoteAudioReady) return;

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
      console.warn('[CallRecording] Failed to start:', err);
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
      console.warn('[CallRecording] Stop failed:', err);
      setRecordingStatus('failed');
      return;
    }

    recorderRef.current = null;

    if (!result || result.blob.size === 0) {
      setRecordingStatus('failed');
      return;
    }

    setRecordingStatus('uploading');

    const uploadOnce = async () => {
      const formData = new FormData();
      formData.append('file', result!.blob, `call-${callId}.${result!.recordingType === 'video' ? 'webm' : 'webm'}`);
      formData.append('recording_type', result!.recordingType);
      formData.append('duration_seconds', String(result!.durationSeconds));
      formData.append('mime_type', result!.mimeType);
      formData.append('file_size_bytes', String(result!.blob.size));
      formData.append('started_at', result!.startedAt.toISOString());
      formData.append('ended_at', result!.endedAt.toISOString());
      if (callType) {
        formData.append('call_type', callType);
      }
      await callsApi.uploadCallRecording(callId, formData);
    };

    try {
      await uploadOnce();
      setRecordingStatus('uploaded');
    } catch (firstErr) {
      console.warn('[CallRecording] Upload failed, retrying once:', firstErr);
      try {
        await uploadOnce();
        setRecordingStatus('uploaded');
      } catch (retryErr) {
        console.warn('[CallRecording] Upload retry failed:', retryErr);
        setRecordingStatus('failed');
      }
    }
  }, [callId, callType]);

  useEffect(() => {
    const remoteAudioReady = Boolean(
      remoteStream?.getAudioTracks().some((t) => t.readyState === 'live')
    );
    if (
      connectionStatus === 'connected' &&
      callId &&
      callType &&
      localStream &&
      remoteAudioReady &&
      !isRecordingRef.current
    ) {
      startRecording();
    }
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
