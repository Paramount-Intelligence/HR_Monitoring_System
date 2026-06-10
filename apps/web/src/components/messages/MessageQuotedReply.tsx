'use client';

import type { ReplyPreview } from '@/lib/api/messages';
import { cn } from '@/lib/utils';

interface MessageQuotedReplyProps {
  reply: ReplyPreview;
  isSelf: boolean;
}

export function MessageQuotedReply({ reply, isSelf }: MessageQuotedReplyProps) {
  return (
    <div
      className={cn(
        'mb-2 pl-2 border-l-2 rounded-sm text-xs',
        isSelf ? 'border-white/50 text-white/90' : 'border-[var(--accent-primary)] text-[var(--text-secondary)]'
      )}
    >
      <p className={cn('font-semibold truncate', isSelf ? 'text-white' : 'text-[var(--accent-primary)]')}>
        {reply.sender_name}
      </p>
      <p className={cn('truncate', reply.is_unavailable && 'italic opacity-80')}>
        {reply.content_preview}
        {reply.attachment_preview && !reply.content_preview && reply.attachment_preview}
      </p>
    </div>
  );
}
