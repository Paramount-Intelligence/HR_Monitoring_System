'use client';

import type { ConversationType, MessageDeliveryStatus } from '@/lib/api/messages';
import { getMessageDeliveryStatus } from '@/lib/messages/message-status';
import { MessageStatusTicks } from '@/components/messages/MessageStatusTicks';
import { cn } from '@/lib/utils';

interface MessageStatusIndicatorProps {
  status?: MessageDeliveryStatus | null;
  seenCount?: number | null;
  deliveredCount?: number | null;
  totalRecipients?: number | null;
  conversationType?: ConversationType;
  sentAt?: string | null;
  deliveredAt?: string | null;
  seenAt?: string | null;
  createdAt?: string | null;
  className?: string;
}

/** WhatsApp-style delivery ticks for outgoing messages. */
export function MessageStatusIndicator({
  status,
  sentAt,
  deliveredAt,
  seenAt,
  createdAt,
  className,
}: MessageStatusIndicatorProps) {
  const resolved = getMessageDeliveryStatus({
    delivery_status: status,
    sent_at: sentAt,
    delivered_at: deliveredAt,
    seen_at: seenAt,
    created_at: createdAt,
  });

  if (resolved === 'pending' && !sentAt && !createdAt) return null;

  return <MessageStatusTicks status={resolved} className={cn('shrink-0', className)} />;
}
