export type RealtimeEventType =
  | 'connected'
  | 'ping'
  | 'pong'
  | 'new_message'
  | 'message_updated'
  | 'message_deleted'
  | 'message_delivered'
  | 'message_seen'
  | 'conversation_read'
  | 'conversation_updated'
  | 'notification_created'
  | 'call_incoming'
  | 'call_accepted'
  | 'call_declined'
  | 'call_ended'
  | 'call_missed';

export interface RealtimeEvent {
  type: RealtimeEventType | string;
  event_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
  actor_id?: string;
  conversation_id?: string;
  entity_type?: string;
  entity_id?: string;
  route?: string;
}

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting';

export interface NewMessagePayload {
  conversation_id: string;
  message_id: string;
  sender_id: string;
  sender_name: string;
  preview: string;
  created_at: string;
}

export interface MessageUpdatedPayload {
  conversation_id: string;
  message_id: string;
  preview: string;
}

export interface MessageDeletedPayload {
  conversation_id: string;
  message_id: string;
  is_deleted: boolean;
}

export interface MessageDeliveryPayload {
  conversation_id: string;
  message_id: string;
  user_id: string;
  delivered_at?: string;
  seen_at?: string;
}

export const MESSAGE_EVENT_TYPES = new Set([
  'new_message',
  'message_updated',
  'message_deleted',
  'message_delivered',
  'message_seen',
  'conversation_read',
  'conversation_updated',
]);

export const NOTIFICATION_EVENT_TYPES = new Set([
  'notification_created',
  'notification_read',
  'notifications_count_updated',
]);

export const CALL_EVENT_TYPES = new Set([
  'call_incoming',
  'incoming_call',
  'call_accepted',
  'call_declined',
  'call_cancelled',
  'call_ended',
  'call_missed',
  'call_failed',
  'call_ringing',
  'call_started',
  'call_timeout',
  'call_signal',
]);
