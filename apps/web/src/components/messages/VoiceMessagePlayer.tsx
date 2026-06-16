'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchAuthenticatedAttachmentBlob,
  formatDurationSeconds,
  parseVoiceNoteDurationSeconds,
} from '@/lib/messages/voice-messages';
import type { MessageAttachment } from '@/lib/api/messages';
import {
  clearActiveVoicePlayback,
  setActiveVoicePlayback,
  stopActiveVoicePlayback,
} from '@/lib/messages/voice-playback-controller';

interface VoiceMessagePlayerProps {
  attachment: MessageAttachment;
  isSelf?: boolean;
  className?: string;
  /** Local preview blob URL — used before upload/send. */
  previewUrl?: string | null;
  durationSeconds?: number;
}

export function VoiceMessagePlayer({
  attachment,
  isSelf = false,
  className,
  previewUrl,
  durationSeconds,
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(previewUrl ?? null);
  const [loading, setLoading] = useState(!previewUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedDuration, setResolvedDuration] = useState(
    durationSeconds ??
      parseVoiceNoteDurationSeconds(attachment) ??
      0
  );

  const pausePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (previewUrl) {
      setAudioSrc(previewUrl);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const blob = await fetchAuthenticatedAttachmentBlob(attachment.download_url);
        if (!active) return;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setAudioSrc(url);
      } catch {
        if (active) setError('Unable to play voice message.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [attachment.download_url, previewUrl]);

  useEffect(() => {
    return () => {
      pausePlayback();
      clearActiveVoicePlayback(pausePlayback);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [pausePlayback]);

  const src = audioSrc;

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !src || error) return;

    if (isPlaying) {
      pausePlayback();
      clearActiveVoicePlayback(pausePlayback);
      return;
    }

    stopActiveVoicePlayback();
    setActiveVoicePlayback(pausePlayback);

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setError('Unable to play voice message.');
      setIsPlaying(false);
      clearActiveVoicePlayback(pausePlayback);
    }
  };

  const progress =
    resolvedDuration > 0
      ? Math.min(100, (currentTime / resolvedDuration) * 100)
      : 0;

  return (
    <div className={cn('flex items-center gap-2 min-w-[200px] max-w-[280px]', className)}>
      <button
        type="button"
        onClick={() => void togglePlay()}
        disabled={loading || !!error || !src}
        className={cn(
          'h-9 w-9 shrink-0 rounded-full flex items-center justify-center border transition-colors',
          isSelf
            ? 'border-white/30 bg-white/15 text-white hover:bg-white/25'
            : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-sidebar-hover)]',
          (loading || !!error || !src) && 'opacity-60 cursor-not-allowed'
        )}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <div
          className={cn(
            'h-1.5 rounded-full overflow-hidden',
            isSelf ? 'bg-white/20' : 'bg-[var(--border-subtle)]'
          )}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isSelf ? 'bg-white' : 'bg-[var(--accent-primary)]'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums">
          <span className={isSelf ? 'text-white/80' : 'text-[var(--text-muted)]'}>
            {formatDurationSeconds(currentTime || 0)}
          </span>
          <span className={isSelf ? 'text-white/80' : 'text-[var(--text-muted)]'}>
            {formatDurationSeconds(resolvedDuration || 0)}
          </span>
        </div>
        {error && (
          <p className={cn('text-[10px]', isSelf ? 'text-white/80' : 'text-[var(--status-danger-text)]')}>
            {error}
          </p>
        )}
      </div>

      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          className="hidden"
          onTimeUpdate={(event) => {
            setCurrentTime(event.currentTarget.currentTime);
          }}
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            if (Number.isFinite(duration) && duration > 0) {
              setResolvedDuration(Math.round(duration));
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
            clearActiveVoicePlayback(pausePlayback);
          }}
          onPause={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
}
