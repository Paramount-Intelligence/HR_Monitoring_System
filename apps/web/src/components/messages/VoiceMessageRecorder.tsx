'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceMessagePreview } from '@/components/messages/VoiceMessagePreview';
import {
  VOICE_NOTE_MAX_SECONDS,
  buildVoiceNoteFilename,
  formatDurationSeconds,
  isMediaRecorderSupported,
  pickRecorderMimeType,
} from '@/lib/messages/voice-messages';
import { stopActiveVoicePlayback } from '@/lib/messages/voice-playback-controller';

type RecorderPhase = 'idle' | 'recording' | 'preview' | 'unsupported';

interface VoiceMessageRecorderProps {
  disabled?: boolean;
  isSending?: boolean;
  onSendVoice: (file: File, durationSeconds: number) => Promise<void>;
  onError?: (message: string) => void;
}

export function VoiceMessageRecorder({
  disabled = false,
  isSending = false,
  onSendVoice,
  onError,
}: VoiceMessageRecorderProps) {
  const [phase, setPhase] = useState<RecorderPhase>(() =>
    isMediaRecorderSupported() ? 'idle' : 'unsupported'
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewMime, setPreviewMime] = useState('audio/webm');
  const [previewExtension, setPreviewExtension] = useState('webm');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const cleanupStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetRecorder = useCallback(() => {
    cleanupStream();
    setPreviewBlob(null);
    setPreviewDuration(0);
    setElapsedSeconds(0);
    setPhase(isMediaRecorderSupported() ? 'idle' : 'unsupported');
  }, [cleanupStream]);

  useEffect(() => {
    return () => {
      cleanupStream();
      stopActiveVoicePlayback();
    };
  }, [cleanupStream]);

  const startRecording = async () => {
    if (disabled || isSending || phase === 'recording') return;
    if (!isMediaRecorderSupported()) {
      setPhase('unsupported');
      onError?.('Voice messages are not supported in this browser.');
      return;
    }

    try {
      stopActiveVoicePlayback();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { mimeType, extension } = pickRecorderMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setPreviewMime(mimeType);
      setPreviewExtension(extension);
      setPhase('recording');

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const durationSeconds = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000)
        );
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanupStream();
        if (blob.size === 0) {
          onError?.('Recording failed. Please try again.');
          resetRecorder();
          return;
        }
        setPreviewBlob(blob);
        setPreviewDuration(durationSeconds);
        setPhase('preview');
      };

      recorder.start(250);
      timerRef.current = window.setInterval(() => {
        const next = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsedSeconds(next);
        if (next >= VOICE_NOTE_MAX_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch (error) {
      cleanupStream();
      resetRecorder();
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        onError?.('Microphone permission is required to record voice messages.');
      } else {
        onError?.('Unable to start recording. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (phase === 'recording') {
      cleanupStream();
      resetRecorder();
      return;
    }
    resetRecorder();
  };

  const handleSendPreview = async () => {
    if (!previewBlob) return;
    const file = new File(
      [previewBlob],
      buildVoiceNoteFilename(previewDuration, previewExtension),
      { type: previewMime }
    );
    try {
      await onSendVoice(file, previewDuration);
      resetRecorder();
    } catch {
      // Parent handles error toast/state.
    }
  };

  if (phase === 'unsupported') {
    return null;
  }

  return (
    <>
      {phase === 'recording' && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]/40 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
              Recording {formatDurationSeconds(elapsedSeconds)}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-md"
              onClick={stopRecording}
            >
              <Square className="h-3.5 w-3.5 mr-1" />
              Stop
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={cancelRecording}
              title="Cancel recording"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {phase === 'preview' && previewBlob && (
        <VoiceMessagePreview
          blob={previewBlob}
          durationSeconds={previewDuration}
          mimeType={previewMime}
          extension={previewExtension}
          isSending={isSending}
          onDiscard={cancelRecording}
          onSend={() => void handleSendPreview()}
        />
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-md shrink-0"
        disabled={disabled || isSending || phase === 'recording' || phase === 'preview'}
        onClick={() => void startRecording()}
        title="Record voice message"
      >
        {phase === 'recording' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Mic className="h-3.5 w-3.5" />
        )}
      </Button>
    </>
  );
}
