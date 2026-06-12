'use client';

import { Check, CheckCheck } from 'lucide-react';
import type { ConversationType, MessageDeliveryStatus } from '@/lib/api/messages';
import { cn } from '@/lib/utils';

interface MessageStatusIndicatorProps {
  status: MessageDeliveryStatus | null | undefined;
  seenCount?: number | null;
  deliveredCount?: number | null;
  totalRecipients?: number | null;
  conversationType: ConversationType;
  className?: string;
}

export function MessageStatusIndicator({
  status,
  seenCount,
  deliveredCount,
  totalRecipients,
  conversationType,
  className,
}: MessageStatusIndicatorProps) {
  if (!status) return null;

  const isDirect = conversationType === 'direct';
  const isSeen = status === 'seen';
  const isDelivered = status === 'delivered' || isSeen;

  if (!isDirect && totalRecipients != null && totalRecipients > 1) {
    if (seenCount != null && seenCount > 0) {
      return (
        <span className={cn('text-[10px] text-white/70 tabular-nums', className)}>
          Seen by {seenCount}
        </span>
      );
    }
    if (deliveredCount != null && deliveredCount > 0) {
      return (
        <span className={cn('text-[10px] text-white/70 tabular-nums', className)}>
          Delivered to {deliveredCount}
        </span>
      );
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px]',
        isSeen ? 'text-sky-200' : 'text-white/70',
        className
      )}
      title={isSeen ? 'Seen' : isDelivered ? 'Delivered' : 'Sent'}
    >
      {isDelivered ? (
        <CheckCheck className={cn('h-3 w-3', isSeen && 'text-sky-200')} />
      ) : (
        <Check className="h-3 w-3" />
      )}
      <span className="sr-only">{isSeen ? 'Seen' : isDelivered ? 'Delivered' : 'Sent'}</span>
    </span>
  );
}
