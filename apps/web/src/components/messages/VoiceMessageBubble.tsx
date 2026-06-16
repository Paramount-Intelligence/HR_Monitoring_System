'use client';

import { VoiceMessagePlayer } from '@/components/messages/VoiceMessagePlayer';
import type { MessageAttachment } from '@/lib/api/messages';
import { cn } from '@/lib/utils';

interface VoiceMessageBubbleProps {
  attachment: MessageAttachment;
  isSelf?: boolean;
}

export function VoiceMessageBubble({ attachment, isSelf = false }: VoiceMessageBubbleProps) {
  return (
    <div className={cn('space-y-1', isSelf ? 'text-white' : 'text-[var(--text-primary)]')}>
      <p className={cn('text-[11px] font-medium', isSelf ? 'text-white/90' : 'text-[var(--text-secondary)]')}>
        Voice message
      </p>
      <VoiceMessagePlayer attachment={attachment} isSelf={isSelf} />
    </div>
  );
}
