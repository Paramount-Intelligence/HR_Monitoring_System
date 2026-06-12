import type { CallType } from '../types/calls';

export type OfflineQueueStatus = 'queued' | 'syncing' | 'synced' | 'failed';

export type OfflineQueueItemType =
  | 'send_message'
  | 'mark_notification_read'
  | 'mark_all_notifications_read'
  | 'recording_upload';

export interface OfflineQueueItemBase {
  id: string;
  type: OfflineQueueItemType;
  createdAt: string;
  retryCount: number;
  status: OfflineQueueStatus;
  lastError: string | null;
  dedupeKey: string;
  requiresAuth: boolean;
}

export interface SendMessageQueueItem extends OfflineQueueItemBase {
  type: 'send_message';
  conversationId: string;
  body: string;
  clientMessageId: string;
}

export interface MarkNotificationReadQueueItem extends OfflineQueueItemBase {
  type: 'mark_notification_read';
  notificationId: string;
}

export interface MarkAllNotificationsReadQueueItem extends OfflineQueueItemBase {
  type: 'mark_all_notifications_read';
}

export interface RecordingUploadQueueItem extends OfflineQueueItemBase {
  type: 'recording_upload';
  callId: string;
  callType: CallType;
  localUri: string;
  fileName: string;
  mimeType: string;
  recordingType: string;
  durationSeconds: number;
  fileSizeBytes: number;
  startedAt: string;
  endedAt: string;
}

export type OfflineQueueItem =
  | SendMessageQueueItem
  | MarkNotificationReadQueueItem
  | MarkAllNotificationsReadQueueItem
  | RecordingUploadQueueItem;

export function createQueueItemId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createClientMessageId(): string {
  return `cm_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
