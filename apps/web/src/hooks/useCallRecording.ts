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
  onUploadFailed?: (message: string) => void;
}

function hasRecordableMedia(
  callType: 'voice' | 'video',
  localStream: MediaStream | null,
  remoteStream: MediaStream | null
): { audio: boolean; video: boolean } {
  const localAudio = streamHasLiveAudio(localStream);
  const remoteAudio = streamHasLiveAudio(remoteStream);
  const localVideo = streamHasLiveVideo(localStream);
  const remoteVideo = streamHasLiveVideo(remoteStream);

  const hasLiveAudioTrack = (stream: MediaStream | null) =>
    Boolean(stream?.getAudioTracks().some((t) => t.readyState === 'live'));

  const audio = localAudio || remoteAudio || hasLiveAudioTrack(localStream) || hasLiveAudioTrack(remoteStream);
  const video = localVideo || remoteVideo;

  if (callType === 'video') {
    return { audio, video: video || audio };
  }
  return { audio, video: false };
}

function canStartRecording(
  callType: 'voice' | 'video',
  localStream: MediaStream | null,
  remoteStream: MediaStream | null
): boolean {
  const media = hasRecordableMedia(callType, localStream, remoteStream);
  return callType === 'video' ? media.audio || media.video : media.audio;
}

export function useCallRecording({
  callId,
  callType,
  connectionStatus,
  localStream,
  remoteStream,
  onUploadFailed,
}: UseCallRecordingParams) {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const recorderRef = useRef<CallRecorder | null>(null);
  const isRecordingRef = useRef(false);
  const uploadStartedRef = useRef(false);
  const startAttemptRef = useRef(0);
  const callIdRef = useRef<string | undefined>(callId);
  const callTypeRef = useRef(callType);

  useEffect(() => {
    callIdRef.current = callId;
    callTypeRef.current = callType;
  }, [callId, callType]);

  const startRecording = useCallback(async () => {
    const activeCallId = callIdRef.current;
    const activeCallType = callTypeRef.current;
    if (!activeCallId || !activeCallType || !localStream || isRecordingRef.current) return;
    if (!canStartRecording(activeCallType, localStream, remoteStream)) return;

    const media = hasRecordableMedia(activeCallType, localStream, remoteStream);
    console.log(
      `[CALL_RECORDING_CLIENT] state=preparing call_id=${activeCallId} audio=${media.audio} video=${media.video}`
    );
    setRecordingStatus('preparing');

    try {
      const recorder = new CallRecorder();
      await recorder.start({
        callId: activeCallId,
        callType: activeCallType,
        localStream,
        remoteStream: remoteStream ?? new MediaStream(),
      });

      if (!recorder.isActive) {
        throw new Error('MediaRecorder did not enter recording state.');
      }

      recorderRef.current = recorder;
      isRecordingRef.current = true;
      setRecordingStatus('recording');
      console.log(
        `[CALL_RECORDING_CLIENT] recorder_started mime=${recorder.selectedMimeType} call_id=${activeCallId}`
      );
    } catch (err) {
      console.warn('[CALL_RECORDING_CLIENT] start_failed:', err);
      setRecordingStatus('failed');
      isRecordingRef.current = false;
      recorderRef.current = null;
    }
  }, [localStream, remoteStream]);

  const stopAndUpload = useCallback(async () => {
    if (uploadStartedRef.current) return;

    const recorder = recorderRef.current;
    const activeCallId = callIdRef.current;
    const activeCallType = callTypeRef.current;

    if (!recorder || !activeCallId) {
      if (isRecordingRef.current) {
        setRecordingStatus('failed');
      }
      return;
    }

    if (!isRecordingRef.current && !recorder.isActive) {
      console.warn('[CALL_RECORDING_CLIENT] upload skipped reason=recorder_never_started');
      return;
    }

    uploadStartedRef.current = true;
    isRecordingRef.current = false;
    setRecordingStatus('stopping');
    console.log('[CALL_RECORDING_CLIENT] stopping');

    let result = null;
    try {
      result = await recorder.stop();
    } catch (err) {
      console.warn('[CALL_RECORDING_CLIENT] stop_failed:', err);
      setRecordingStatus('failed');
      onUploadFailed?.('Recording could not be finalized.');
      return;
    }

    recorderRef.current = null;

    if (!result || result.blob.size === 0) {
      console.warn('[CALL_RECORDING_CLIENT] upload skipped reason=empty_blob');
      setRecordingStatus('failed');
      onUploadFailed?.('Recording was empty and was not uploaded.');
      return;
    }

    console.log(`[CALL_RECORDING_CLIENT] blob_ready size=${result.blob.size}`);
    if (activeCallType === 'video') {
      console.log(
        `[VIDEO_RECORDING] stopped blob_size=${result.blob.size} recording_type=${result.recordingType}`
      );
    }

    setRecordingStatus('uploading');

    const token = await ensureFreshAccessToken();
    console.log(`[CALL_RECORDING_CLIENT] using fresh token present=${Boolean(token)}`);
    if (!token) {
      setRecordingStatus('failed');
      onUploadFailed?.('Session expired. Please sign in again.');
      return;
    }

    const uploadOnce = async () => {
      const formData = new FormData();
      formData.append(
        'file',
        result!.blob,
        `call-${activeCallId}.${result!.recordingType === 'video' ? 'webm' : 'webm'}`
      );
      formData.append('recording_type', result!.recordingType);
      formData.append('duration_seconds', String(result!.durationSeconds));
      formData.append('mime_type', result!.mimeType);
      formData.append('file_size_bytes', String(result!.blob.size));
      formData.append('started_at', result!.startedAt.toISOString());
      formData.append('ended_at', result!.endedAt.toISOString());
      if (activeCallType) {
        formData.append('call_type', activeCallType);
      }

      console.log(
        `[CALL_RECORDING_CLIENT] upload_start call_id=${activeCallId} call_type=${activeCallType} recording_type=${result!.recordingType}`
      );
      if (activeCallType === 'video') {
        console.log(
          `[VIDEO_RECORDING] upload_start call_type=video recording_type=${result!.recordingType}`
        );
      }

      return callsApi.uploadCallRecording(activeCallId, formData);
    };

    try {
      const response = await uploadOnce();
      console.log(`[CALL_RECORDING_CLIENT] upload_success recording_id=${response.id}`);
      if (activeCallType === 'video') {
        console.log(`[VIDEO_RECORDING] upload_success recording_id=${response.id}`);
      }
      setRecordingStatus('uploaded');
    } catch (firstErr) {
      const status = (firstErr as { response?: { status?: number } })?.response?.status;
      const message = getErrorMessage(firstErr);
      console.warn(
        `[CALL_RECORDING_CLIENT] upload_failed status=${status ?? 'unknown'} message=${message}`
      );

      if (status === 413) {
        setRecordingStatus('failed');
        onUploadFailed?.('Recording file is too large to upload.');
        return;
      }

      await ensureFreshAccessToken();

      try {
        const response = await uploadOnce();
        console.log(`[CALL_RECORDING_CLIENT] upload_success recording_id=${response.id}`);
        if (activeCallType === 'video') {
          console.log(`[VIDEO_RECORDING] upload_success recording_id=${response.id}`);
        }
        setRecordingStatus('uploaded');
      } catch (retryErr) {
        const retryMessage = getErrorMessage(retryErr);
        console.warn(`[CALL_RECORDING_CLIENT] upload_failed status=retry message=${retryMessage}`);
        setRecordingStatus('failed');
        onUploadFailed?.(
          'Recording could not be uploaded. Admin may not see this call recording.'
        );
      }
    }
  }, [onUploadFailed]);

  useEffect(() => {
    if (connectionStatus !== 'connected' || !callId || !callType || !localStream) {
      return;
    }

    if (isRecordingRef.current || uploadStartedRef.current) return;

    const delayMs = callType === 'video' ? 1200 : 300;
    let attempts = 0;
    const maxAttempts = 20;

    const tryStart = () => {
      if (
        isRecordingRef.current ||
        uploadStartedRef.current ||
        !callIdRef.current ||
        connectionStatus !== 'connected'
      ) {
        return;
      }
      if (!canStartRecording(callType, localStream, remoteStream)) {
        attempts += 1;
        if (attempts < maxAttempts) {
          window.setTimeout(tryStart, 500);
        }
        return;
      }
      void startRecording();
    };

    const attempt = ++startAttemptRef.current;
    const timer = window.setTimeout(() => {
      if (attempt !== startAttemptRef.current) return;
      tryStart();
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
