export type RealtimeEventType =
  | 'connected'
  | 'ping'
  | 'pong'
  | 'new_message'
  | 'message_updated'
  | 'message_deleted'
  | 'conversation_updated'
  | 'notification_created'
  | 'notification_read'
  | 'notifications_count_updated'
  | 'announcement_created'
  | 'announcement_updated'
  | 'announcement_deleted'
  | 'meeting_created'
  | 'meeting_updated'
  | 'meeting_deleted'
  | 'meeting_rsvp_updated'
  | 'meeting_reminder'
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'dashboard_refresh_hint'
  | 'call_incoming'
  | 'call_accepted'
  | 'call_declined'
  | 'call_ended'
  | 'call_missed'
  | 'call_signal';

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

export const REALTIME_EVENT_NAME = 'pims-realtime';
export const REALTIME_STATUS_EVENT = 'pims-realtime-status';
