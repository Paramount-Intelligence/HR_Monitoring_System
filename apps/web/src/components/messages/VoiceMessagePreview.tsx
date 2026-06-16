'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceMessagePlayer } from '@/components/messages/VoiceMessagePlayer';
import { formatDurationSeconds } from '@/lib/messages/voice-messages';
import type { MessageAttachment } from '@/lib/api/messages';

interface VoiceMessagePreviewProps {
  blob: Blob;
  durationSeconds: number;
  mimeType: string;
  extension: string;
  isSending?: boolean;
  onDiscard: () => void;
  onSend: () => void;
}

export function VoiceMessagePreview({
  blob,
  durationSeconds,
  mimeType,
  extension,
  isSending = false,
  onDiscard,
  onSend,
}: VoiceMessagePreviewProps) {
  const previewUrl = useMemo(() => URL.createObjectURL(blob), [blob]);
  const [previewAttachment] = useState<MessageAttachment>(() => ({
    id: 'preview',
    file_name: `preview.${extension}`,
    original_file_name: `voice-note-${Math.max(1, Math.round(durationSeconds))}.${extension}`,
    mime_type: mimeType,
    file_size: blob.size,
    download_url: previewUrl,
    created_at: new Date().toISOString(),
  }));

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="mb-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[var(--text-primary)]">Voice message preview</p>
          <p className="text-[10px] text-[var(--text-muted)] tabular-nums">
            {formatDurationSeconds(durationSeconds)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onDiscard}
          disabled={isSending}
          title="Delete recording"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <VoiceMessagePlayer
        attachment={previewAttachment}
        previewUrl={previewUrl}
        durationSeconds={durationSeconds}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-md px-3"
          onClick={onSend}
          disabled={isSending}
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Send className="h-3.5 w-3.5 mr-1" />
              Send voice message
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
