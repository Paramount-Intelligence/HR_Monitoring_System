import type { Message, MessageDeliveryStatus } from '@/lib/api/messages';

export type ExtendedMessageDeliveryStatus =
  | MessageDeliveryStatus
  | 'pending'
  | 'failed';

export function deliveryStatusFromCounts(
  deliveredCount: number,
  seenCount: number,
  _totalRecipients: number,
): MessageDeliveryStatus {
  if (seenCount > 0) return 'seen';
  if (deliveredCount > 0) return 'delivered';
  return 'sent';
}

export function getMessageDeliveryStatus(message: {
  delivery_status?: MessageDeliveryStatus | null;
  seen_at?: string | null;
  seenAt?: string | null;
  read_at?: string | null;
  readAt?: string | null;
  delivered_at?: string | null;
  deliveredAt?: string | null;
  sent_at?: string | null;
  sentAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  status?: ExtendedMessageDeliveryStatus | null;
}): ExtendedMessageDeliveryStatus {
  if (message.status === 'failed') return 'failed';
  if (
    message.seen_at ||
    message.seenAt ||
    message.read_at ||
    message.readAt ||
    message.delivery_status === 'seen'
  ) {
    return 'seen';
  }
  if (message.delivered_at || message.deliveredAt || message.delivery_status === 'delivered') {
    return 'delivered';
  }
  if (
    message.sent_at ||
    message.sentAt ||
    message.created_at ||
    message.createdAt ||
    message.delivery_status === 'sent'
  ) {
    return 'sent';
  }
  return 'pending';
}

function recipientTotal(message: Message): number {
  return Math.max(message.total_recipients ?? 0, 1);
}

export function shouldShowMessageTicks(
  message: { sender_id?: string; senderId?: string; is_own_message?: boolean },
  currentUserId?: string | null,
): boolean {
  if (!currentUserId) return false;
  if (message.is_own_message === true) return true;
  const senderId = message.sender_id ?? message.senderId;
  return Boolean(senderId && senderId === currentUserId);
}

export function mergeDeliveredUpdate(
  message: Message,
  deliveredAt?: string | null,
): Message {
  const total = recipientTotal(message);
  const delivered = Math.min((message.delivered_count ?? 0) + 1, total);
  return {
    ...message,
    delivered_count: delivered,
    delivered_at: deliveredAt ?? message.delivered_at ?? null,
    delivery_status: deliveryStatusFromCounts(delivered, message.seen_count ?? 0, total),
  };
}

export function mergeSeenUpdate(message: Message, seenAt?: string | null, deliveredAt?: string | null): Message {
  const total = recipientTotal(message);
  const seen = Math.min((message.seen_count ?? 0) + 1, total);
  const delivered = Math.max(message.delivered_count ?? 0, seen, deliveredAt ? 1 : 0);
  const resolvedDeliveredAt = deliveredAt ?? message.delivered_at ?? seenAt ?? null;
  return {
    ...message,
    seen_count: seen,
    delivered_count: delivered,
    seen_at: seenAt ?? message.seen_at ?? null,
    delivered_at: resolvedDeliveredAt,
    delivery_status: deliveryStatusFromCounts(delivered, seen, total),
  };
}

export function applySeenBatchUpdate(
  messages: Message[],
  conversationId: string,
  messageIds: string[],
  seenAt?: string | null,
  deliveredAt?: string | null,
  currentUserId?: string | null,
): Message[] {
  const idSet = new Set(messageIds);
  return messages.map((message) => {
    if (message.conversation_id !== conversationId) return message;
    if (message.sender_id !== currentUserId) return message;
    if (!idSet.has(message.id)) return message;
    return mergeSeenUpdate(message, seenAt, deliveredAt);
  });
}

export function statusFromMessageInfo(
  sentAt?: string | null,
  receipts?: Array<{ delivered_at?: string | null; seen_at?: string | null }>,
): ExtendedMessageDeliveryStatus {
  if (!sentAt) return 'pending';
  if (!receipts?.length) return 'sent';
  const anySeen = receipts.some((r) => Boolean(r.seen_at));
  const anyDelivered = receipts.some((r) => Boolean(r.delivered_at));
  if (anySeen) return 'seen';
  if (anyDelivered) return 'delivered';
  return 'sent';
}
