import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from './client';
import { API_BASE_URL } from '../constants/env';
import { getAccessToken } from '../auth/token-service';
import { getErrorMessage } from './client';
import type { Message, MessageAttachment, MessageCreatePayload, UnreadCountResponse } from '../types/messages';
import {
  VOICE_NOTE_MAX_BYTES,
  buildVoiceNoteFilename,
} from '../utils/messages';
import { secureLog } from '../utils/secure-log';

export interface GetMessagesParams {
  limit?: number;
  before?: string;
}

function normalizeUploadUri(uri: string): string {
  if (Platform.OS === 'android' && !uri.startsWith('file://') && !uri.startsWith('content://')) {
    return `file://${uri}`;
  }
  return uri;
}

async function getLocalFileSize(uri: string): Promise<number | undefined> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number') {
      return info.size;
    }
  } catch {
    // ignore — backend validates size when available
  }
  return undefined;
}

export async function getMessages(
  conversationId: string,
  params?: GetMessagesParams
): Promise<Message[]> {
  const { data } = await apiClient.get<Message[]>(
    `/messages/conversations/${conversationId}/messages`,
    { params }
  );
  return data;
}

export async function sendMessage(
  conversationId: string,
  payload: MessageCreatePayload
): Promise<Message> {
  const { data } = await apiClient.post<Message>(
    `/messages/conversations/${conversationId}/messages`,
    payload
  );
  return data;
}

export async function uploadMessageAttachments(
  conversationId: string,
  files: { uri: string; name: string; type: string }[]
): Promise<MessageAttachment[]> {
  const formData = new FormData();
  for (const file of files) {
    const uri = normalizeUploadUri(file.uri);
    formData.append('files', {
      uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  }

  try {
    const { data } = await apiClient.post<MessageAttachment[]>(
      `/messages/conversations/${conversationId}/attachments`,
      formData,
      {
        timeout: 90000,
      }
    );
    return data;
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    secureLog('MESSAGES_MOBILE', `attachment_upload_failed status=${status ?? 'unknown'}`);
    throw error;
  }
}

export async function sendVoiceNote(
  conversationId: string,
  localUri: string,
  durationSeconds: number
): Promise<Message> {
  const normalizedUri = normalizeUploadUri(localUri);
  const fileSizeBytes = await getLocalFileSize(normalizedUri);

  if (fileSizeBytes != null && fileSizeBytes > VOICE_NOTE_MAX_BYTES) {
    throw new Error('Voice note is too large. Please record a shorter message.');
  }

  const filename = buildVoiceNoteFilename(durationSeconds);
  const attachments = await uploadMessageAttachments(conversationId, [
    {
      uri: normalizedUri,
      name: filename,
      type: 'audio/mp4',
    },
  ]);

  if (!attachments.length) {
    throw new Error('Unable to upload voice note.');
  }

  try {
    return await sendMessage(conversationId, {
      attachment_ids: attachments.map((attachment) => attachment.id),
    });
  } catch (error) {
    secureLog('MESSAGES_MOBILE', 'voice_note_send_failed');
    throw error;
  }
}

function extractApiDetail(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('response' in error)) return null;
  const data = (error as { response?: { data?: { detail?: unknown } } }).response?.data;
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    return typeof first?.msg === 'string' ? first.msg : null;
  }
  return null;
}

export function getVoiceNoteSendErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const detail = extractApiDetail(error);
  if (status === 400 && detail?.toLowerCase().includes('file type not supported')) {
    return 'Voice notes require a backend update. Redeploy the API service on Railway with the latest code (audio .m4a support), then try again.';
  }
  if (status === 400) {
    return getErrorMessage(error, 'The server rejected this voice note. Please try again.');
  }
  if (status === 403) {
    return 'You do not have permission to send voice notes in this conversation.';
  }
  if (status === 413) {
    return 'Voice note is too large. Please record a shorter message.';
  }
  return getErrorMessage(error, 'Voice note failed to send. Please try again.');
}

export async function getAttachmentDownloadUrl(attachmentId: string): Promise<string> {
  return `${API_BASE_URL}/messages/attachments/${attachmentId}/download`;
}

export async function getAuthenticatedAttachmentSource(attachmentId: string): Promise<{
  uri: string;
  headers: Record<string, string>;
}> {
  const token = await getAccessToken();
  return {
    uri: await getAttachmentDownloadUrl(attachmentId),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const { data } = await apiClient.get<UnreadCountResponse>('/messages/unread-count');
  return data;
}
