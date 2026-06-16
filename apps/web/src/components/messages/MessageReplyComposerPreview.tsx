'use client';

import { X } from 'lucide-react';
import type { Message, ReplyPreview } from '@/lib/api/messages';
import { getMessagePreviewText } from '@/components/messages/messages-utils';
import { cn } from '@/lib/utils';

interface MessageReplyComposerPreviewProps {
  replyTarget: Message | ReplyPreview;
  onCancel: () => void;
  className?: string;
}

function getPreviewContent(target: Message | ReplyPreview): {
  senderName: string;
  preview: string;
  unavailable: boolean;
} {
  if ('reply_to_message' in target && target.reply_to_message) {
    // unused path
  }

  if ('sender' in target) {
    const msg = target as Message;
    if (msg.is_deleted) {
      return {
        senderName: msg.sender.full_name,
        preview: 'Original message unavailable.',
        unavailable: true,
      };
    }
    const preview = getMessagePreviewText(msg);
    return { senderName: msg.sender.full_name, preview, unavailable: false };
  }

  const preview = target as ReplyPreview;
  return {
    senderName: preview.sender_name,
    preview: preview.content_preview,
    unavailable: preview.is_unavailable ?? false,
  };
}

export function MessageReplyComposerPreview({
  replyTarget,
  onCancel,
  className,
}: MessageReplyComposerPreviewProps) {
  const { senderName, preview, unavailable } = getPreviewContent(replyTarget);

  return (
    <div
      className={cn(
        'flex items-start gap-2 mb-2 p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]',
        className
      )}
    >
      <div className="w-1 self-stretch rounded-full bg-[var(--accent-primary)] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[var(--accent-primary)] truncate">
          Replying to {senderName}
        </p>
        <p
          className={cn(
            'text-xs truncate',
            unavailable ? 'italic text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
          )}
        >
          {preview}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] shrink-0"
        aria-label="Cancel reply"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
