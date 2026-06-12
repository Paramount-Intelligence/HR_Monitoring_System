import * as FileSystem from 'expo-file-system';
import { sendMessage } from '../api/messages.api';
import { markAllNotificationsRead, markNotificationRead } from '../api/notifications.api';
import { isNetworkError, isTimeoutError, normalizeApiError } from '../api/api-error';
import { uploadMobileRecording } from '../calls/recording-upload';
import type { MobileRecordingStopResult } from '../calls/mobile-call-recorder';
import type { CallType } from '../types/calls';
import type { Message } from '../types/messages';
import { queryKeys } from '../constants/query-keys';
import { dedupeMessages } from '../utils/messages';
import type { QueryClient } from '@tanstack/react-query';
import {
  createClientMessageId,
  createQueueItemId,
  type OfflineQueueItem,
  type RecordingUploadQueueItem,
  type SendMessageQueueItem,
} from './offline-mutation-types';
import { getAccessToken } from '../auth/token-service';
import { getOfflineQueueStore, useOfflineQueueStore } from './offline-queue-store';

let syncInFlight = false;
let queryClientRef: QueryClient | null = null;

export function setOfflineSyncQueryClient(client: QueryClient): void {
  queryClientRef = client;
}

function isRetryableError(error: unknown): boolean {
  const kind = normalizeApiError(error).kind;
  return kind === 'offline' || kind === 'timeout' || kind === 'server';
}

async function processSendMessage(item: SendMessageQueueItem): Promise<void> {
  const store = getOfflineQueueStore();
  await store.updateItem(item.id, { status: 'syncing', lastError: null });

  try {
    const saved = await sendMessage(item.conversationId, { body: item.body });
    const client = queryClientRef;
    if (client) {
      client.setQueryData<Message[]>(queryKeys.messages(item.conversationId), (prev) =>
        dedupeMessages(
          (prev ?? [])
            .filter((m) => m.clientId !== item.clientMessageId)
            .concat({ ...saved, clientStatus: 'sent' })
        )
      );
      void client.invalidateQueries({ queryKey: queryKeys.conversations });
    }
    await store.removeItem(item.id);
  } catch (error) {
    const message = normalizeApiError(error).message;
    const status = isRetryableError(error) ? 'queued' : 'failed';
    await store.updateItem(item.id, {
      status,
      lastError: message,
      retryCount: item.retryCount + 1,
    });

    const client = queryClientRef;
    if (client && !isRetryableError(error)) {
      client.setQueryData<Message[]>(queryKeys.messages(item.conversationId), (prev) =>
        (prev ?? []).map((m) =>
          m.clientId === item.clientMessageId ? { ...m, clientStatus: 'failed' as const } : m
        )
      );
    }
    throw error;
  }
}

async function processMarkNotificationRead(item: OfflineQueueItem): Promise<void> {
  if (item.type !== 'mark_notification_read') return;
  const store = getOfflineQueueStore();
  await store.updateItem(item.id, { status: 'syncing' });

  try {
    await markNotificationRead(item.notificationId);
    await store.removeItem(item.id);
    void queryClientRef?.invalidateQueries({ queryKey: queryKeys.notifications });
    void queryClientRef?.invalidateQueries({ queryKey: queryKeys.notificationsUnread });
  } catch (error) {
    const status = isRetryableError(error) ? 'queued' : 'failed';
    await store.updateItem(item.id, {
      status,
      lastError: normalizeApiError(error).message,
      retryCount: item.retryCount + 1,
    });
    throw error;
  }
}

async function processMarkAllRead(item: OfflineQueueItem): Promise<void> {
  if (item.type !== 'mark_all_notifications_read') return;
  const store = getOfflineQueueStore();
  await store.updateItem(item.id, { status: 'syncing' });

  try {
    await markAllNotificationsRead();
    await store.removeItem(item.id);
    void queryClientRef?.invalidateQueries({ queryKey: queryKeys.notifications });
    void queryClientRef?.invalidateQueries({ queryKey: queryKeys.notificationsUnread });
  } catch (error) {
    const status = isRetryableError(error) ? 'queued' : 'failed';
    await store.updateItem(item.id, {
      status,
      lastError: normalizeApiError(error).message,
      retryCount: item.retryCount + 1,
    });
    throw error;
  }
}

async function processRecordingUpload(item: RecordingUploadQueueItem): Promise<void> {
  const store = getOfflineQueueStore();
  const fileInfo = await FileSystem.getInfoAsync(item.localUri);
  if (!fileInfo.exists) {
    await store.updateItem(item.id, {
      status: 'failed',
      lastError: 'Recording file is no longer available on this device.',
    });
    return;
  }

  await store.updateItem(item.id, { status: 'syncing', lastError: null });

  const recording: MobileRecordingStopResult = {
    localUri: item.localUri,
    fileName: item.fileName,
    mimeType: item.mimeType,
    recordingType: item.recordingType as MobileRecordingStopResult['recordingType'],
    durationSeconds: item.durationSeconds,
    fileSizeBytes: item.fileSizeBytes,
    startedAt: item.startedAt,
    endedAt: item.endedAt,
  };

  try {
    await uploadMobileRecording(item.callId, item.callType, recording);
    await store.removeItem(item.id);
    try {
      await FileSystem.deleteAsync(item.localUri, { idempotent: true });
    } catch {
      // Non-blocking cleanup
    }
  } catch (error) {
    const status = isRetryableError(error) ? 'queued' : 'failed';
    await store.updateItem(item.id, {
      status,
      lastError: normalizeApiError(error).message,
      retryCount: item.retryCount + 1,
    });
    throw error;
  }
}

async function processItem(item: OfflineQueueItem): Promise<void> {
  switch (item.type) {
    case 'send_message':
      await processSendMessage(item);
      break;
    case 'mark_notification_read':
      await processMarkNotificationRead(item);
      break;
    case 'mark_all_notifications_read':
      await processMarkAllRead(item);
      break;
    case 'recording_upload':
      await processRecordingUpload(item);
      break;
    default:
      break;
  }
}

export async function runOfflineSync(): Promise<void> {
  if (syncInFlight) return;

  const accessToken = await getAccessToken();
  if (!accessToken) return;

  const store = getOfflineQueueStore();
  const pending = store.items.filter(
    (i) =>
      (i.status === 'queued' || i.status === 'failed') &&
      (!('requiresAuth' in i) || i.requiresAuth !== false)
  );
  if (!pending.length) return;

  syncInFlight = true;
  store.setSyncing(true);

  try {
    for (const item of pending) {
      if (item.status === 'failed' && item.retryCount >= 5) continue;
      try {
        await processItem(item);
      } catch {
        // Continue with next item
      }
    }
  } finally {
    syncInFlight = false;
    store.setSyncing(false);
  }
}

export async function queueSendMessage(
  conversationId: string,
  body: string,
  clientMessageId?: string
): Promise<SendMessageQueueItem> {
  const id = clientMessageId ?? createClientMessageId();
  const item: SendMessageQueueItem = {
    id: createQueueItemId(),
    type: 'send_message',
    conversationId,
    body,
    clientMessageId: id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'queued',
    lastError: null,
    dedupeKey: `message:${conversationId}:${id}`,
    requiresAuth: true,
  };
  await getOfflineQueueStore().addItem(item);
  return item;
}

export async function queueMarkNotificationRead(notificationId: string): Promise<void> {
  await getOfflineQueueStore().addItem({
    id: createQueueItemId(),
    type: 'mark_notification_read',
    notificationId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'queued',
    lastError: null,
    dedupeKey: `notif-read:${notificationId}`,
    requiresAuth: true,
  });
}

export async function queueMarkAllNotificationsRead(): Promise<void> {
  await getOfflineQueueStore().addItem({
    id: createQueueItemId(),
    type: 'mark_all_notifications_read',
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'queued',
    lastError: null,
    dedupeKey: 'notif-read-all',
    requiresAuth: true,
  });
}

export async function queueRecordingUpload(
  callId: string,
  callType: CallType,
  recording: MobileRecordingStopResult
): Promise<void> {
  await getOfflineQueueStore().addItem({
    id: createQueueItemId(),
    type: 'recording_upload',
    callId,
    callType,
    localUri: recording.localUri,
    fileName: recording.fileName,
    mimeType: recording.mimeType,
    recordingType: recording.recordingType,
    durationSeconds: recording.durationSeconds,
    fileSizeBytes: recording.fileSizeBytes,
    startedAt: recording.startedAt,
    endedAt: recording.endedAt,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'queued',
    lastError: null,
    dedupeKey: `recording:${callId}`,
    requiresAuth: true,
  });
}

export async function retryFailedQueueItem(itemId: string): Promise<void> {
  await getOfflineQueueStore().updateItem(itemId, { status: 'queued', lastError: null });
  await runOfflineSync();
}

export function shouldQueueOnError(error: unknown): boolean {
  return isNetworkError(error) || isTimeoutError(error);
}

export { createClientMessageId } from './offline-mutation-types';
export { useOfflineQueueStore };
