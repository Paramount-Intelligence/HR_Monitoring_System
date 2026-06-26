'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRealtimeEvent } from '@/hooks/useRealtime';
import { queueMarkDelivered } from '@/lib/messages/delivery-markers';

/** Marks incoming messages as delivered app-wide when realtime events arrive. */
export function MessageReceiptListener() {
  const { user } = useAuth();

  useRealtimeEvent(
    'new_message',
    (ev) => {
      const conversationId = String(ev.payload.conversation_id || '');
      const messageId = String(ev.payload.message_id || '');
      const senderId = ev.payload.sender_id ? String(ev.payload.sender_id) : undefined;
      queueMarkDelivered(conversationId, messageId, senderId, user?.id);
    },
    [user?.id],
  );

  return null;
}
