'use client';

import { AlertCircle, Check, CheckCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExtendedMessageDeliveryStatus } from '@/lib/messages/message-status';

export interface MessageStatusTicksProps {
  status: ExtendedMessageDeliveryStatus;
  className?: string;
}

const STATUS_LABELS: Record<ExtendedMessageDeliveryStatus, string> = {
  pending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  seen: 'Seen',
  failed: 'Failed to send',
};

export function MessageStatusTicks({ status, className }: MessageStatusTicksProps) {
  const label = STATUS_LABELS[status];

  if (status === 'pending') {
    return (
      <span
        className={cn('inline-flex items-center text-[#8696a0] dark:text-[#8696a0]', className)}
        aria-label={label}
        title={label}
      >
        <Clock className="h-3 w-3" aria-hidden="true" />
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span
        className={cn('inline-flex items-center text-red-500', className)}
        aria-label={label}
        title={label}
      >
        <AlertCircle className="h-3 w-3" aria-hidden="true" />
      </span>
    );
  }

  const isSeen = status === 'seen';
  const isDelivered = status === 'delivered' || isSeen;

  return (
    <span
      className={cn(
        'inline-flex items-center',
        isSeen ? 'text-[#53bdeb]' : 'text-[#8696a0] dark:text-[#8696a0]',
        className
      )}
      aria-label={label}
      title={label}
    >
      {isDelivered ? (
        <CheckCheck className={cn('h-3.5 w-3.5', isSeen && 'text-[#53bdeb]')} aria-hidden="true" />
      ) : (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </span>
  );
}
