import type { QueryClient } from '@tanstack/react-query';
import { getMessages } from '../api/messages.api';
import { queryKeys } from '../constants/query-keys';
import type { Conversation, Message } from '../types/messages';
import type {
  MessageDeletedPayload,
  MessageDeliveryPayload,
  MessageUpdatedPayload,
  NewMessagePayload,
  RealtimeEvent,
} from './realtime-events';
import { MESSAGE_EVENT_TYPES, NOTIFICATION_EVENT_TYPES } from './realtime-events';
import { dedupeMessages } from '../utils/messages';
import { useCallStore } from '../calls/call-store';

let queryClientRef: QueryClient | null = null;

export function setRealtimeQueryClient(client: QueryClient): void {
  queryClientRef = client;
}

function getClient(): QueryClient | null {
  return queryClientRef;
}

function updateConversationsList(
  updater: (conversations: Conversation[]) => Conversation[]
): void {
  const client = getClient();
  if (!client) return;

  client.setQueryData<Conversation[]>(queryKeys.conversations, (prev) => {
    if (!prev) return prev;
    return updater(prev).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  });
}

function bumpConversationFromNewMessage(
  payload: NewMessagePayload,
  currentUserId?: string,
  activeConversationId?: string | null
): void {
  updateConversationsList((conversations) =>
    conversations.map((conv) => {
      if (conv.id !== payload.conversation_id) return conv;

      const isOwn = payload.sender_id === currentUserId;
      const isActive = payload.conversation_id === activeConversationId;

      return {
        ...conv,
        updated_at: payload.created_at,
        unread_count: isOwn || isActive ? 0 : (conv.unread_count ?? 0) + 1,
        last_message: {
          id: payload.message_id,
          body: payload.preview,
          sender_id: payload.sender_id,
          sender_name: payload.sender_name,
          created_at: payload.created_at,
        },
      };
    })
  );
}

function handleNewMessage(
  payload: NewMessagePayload,
  currentUserId?: string,
  activeConversationId?: string | null
): void {
  bumpConversationFromNewMessage(payload, currentUserId, activeConversationId);

  const client = getClient();
  if (!client) return;

  if (payload.conversation_id !== activeConversationId) return;

  const messagesKey = queryKeys.messages(payload.conversation_id);
  const existing = client.getQueryData<Message[]>(messagesKey) ?? [];

  if (existing.some((m) => m.id === payload.message_id)) {
    return;
  }

  if (payload.sender_id === currentUserId) {
    return;
  }

  void getMessages(payload.conversation_id, { limit: 50 }).then((fresh) => {
    client.setQueryData(messagesKey, dedupeMessages(fresh));
  });
}

function handleMessageUpdated(payload: MessageUpdatedPayload): void {
  updateConversationsList((conversations) =>
    conversations.map((conv) => {
      if (conv.id !== payload.conversation_id) return conv;
      if (conv.last_message?.id !== payload.message_id) return conv;
      return {
        ...conv,
        last_message: {
          ...conv.last_message,
          body: payload.preview,
        },
      };
    })
  );

  const client = getClient();
  if (!client) return;

  client.setQueryData<Message[]>(
    queryKeys.messages(payload.conversation_id),
    (prev) => {
      if (!prev) return prev;
      return prev.map((message) =>
        message.id === payload.message_id
          ? { ...message, body: payload.preview, is_edited: true }
          : message
      );
    }
  );
}

function handleMessageDeleted(payload: MessageDeletedPayload): void {
  const client = getClient();
  if (!client) return;

  client.setQueryData<Message[]>(
    queryKeys.messages(payload.conversation_id),
    (prev) => {
      if (!prev) return prev;
      return prev.map((message) =>
        message.id === payload.message_id
          ? {
              ...message,
              is_deleted: true,
              body: '',
              attachments: [],
            }
          : message
      );
    }
  );
}

function handleDeliveryUpdate(
  payload: MessageDeliveryPayload,
  field: 'delivered' | 'seen'
): void {
  const client = getClient();
  if (!client) return;

  client.setQueryData<Message[]>(
    queryKeys.messages(payload.conversation_id),
    (prev) => {
      if (!prev) return prev;
      return prev.map((message) => {
        if (message.id !== payload.message_id) return message;
        const deliveredCount =
          field === 'delivered'
            ? (message.delivered_count ?? 0) + 1
            : message.delivered_count;
        const seenCount =
          field === 'seen' ? (message.seen_count ?? 0) + 1 : message.seen_count;
        return {
          ...message,
          delivered_count: deliveredCount,
          seen_count: seenCount,
          delivery_status:
            field === 'seen'
              ? 'seen'
              : message.delivery_status === 'seen'
                ? 'seen'
                : 'delivered',
        };
      });
    }
  );
}

export function handleRealtimeEvent(
  event: RealtimeEvent,
  options: { currentUserId?: string; activeConversationId?: string | null }
): void {
  if (!MESSAGE_EVENT_TYPES.has(event.type)) {
    return;
  }

  const payload = event.payload;

  switch (event.type) {
    case 'new_message':
      handleNewMessage(payload as unknown as NewMessagePayload, options.currentUserId, options.activeConversationId);
      break;
    case 'message_updated':
      handleMessageUpdated(payload as unknown as MessageUpdatedPayload);
      break;
    case 'message_deleted':
      handleMessageDeleted(payload as unknown as MessageDeletedPayload);
      break;
    case 'message_delivered':
      handleDeliveryUpdate(payload as unknown as MessageDeliveryPayload, 'delivered');
      break;
    case 'message_seen':
      handleDeliveryUpdate(payload as unknown as MessageDeliveryPayload, 'seen');
      break;
    case 'conversation_updated':
      void getClient()?.invalidateQueries({ queryKey: queryKeys.conversations });
      break;
    case 'conversation_read':
      updateConversationsList((conversations) =>
        conversations.map((conv) =>
          conv.id === (payload.conversation_id as string)
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
      break;
    default:
      break;
  }
}

export function invalidateConversationsOnReconnect(): void {
  void getClient()?.invalidateQueries({ queryKey: queryKeys.conversations });
  void getClient()?.invalidateQueries({ queryKey: queryKeys.notificationsUnread });
  void getClient()?.invalidateQueries({ queryKey: queryKeys.unreadCount });
}

export function handleNotificationRealtimeEvent(event: RealtimeEvent): void {
  if (!NOTIFICATION_EVENT_TYPES.has(event.type)) return;

  const client = getClient();
  if (!client) return;

  switch (event.type) {
    case 'notification_created':
      void client.invalidateQueries({ queryKey: queryKeys.notifications });
      void client.invalidateQueries({ queryKey: queryKeys.notificationsUnread });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard });
      break;
    case 'notification_read':
      client.setQueryData<import('../types/notification').Notification[]>(
        queryKeys.notifications,
        (prev) =>
          prev?.map((item) =>
            item.id === (event.payload.notification_id as string)
              ? { ...item, is_read: true, read_at: new Date().toISOString() }
              : item
          )
      );
      void client.invalidateQueries({ queryKey: queryKeys.notificationsUnread });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard });
      break;
    case 'notifications_count_updated':
      void client.invalidateQueries({ queryKey: queryKeys.notificationsUnread });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard });
      break;
    default:
      break;
  }
}

export function handleCallRealtimeEvent(
  event: RealtimeEvent,
  currentUserId?: string
): void {
  useCallStore.getState().handleCallRealtimeEvent(event, currentUserId);

  if (
    event.type === 'call_ended' ||
    event.type === 'call_missed' ||
    event.type === 'call_declined'
  ) {
    const conversationId = event.payload.conversation_id as string | undefined;
    const client = getClient();
    if (client && conversationId) {
      void client.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
      void client.invalidateQueries({ queryKey: queryKeys.conversations });
    }
  }
}
