import { apiClient } from './client';
import type { Message, MessageCreatePayload, UnreadCountResponse } from '../types/messages';

export interface GetMessagesParams {
  limit?: number;
  before?: string;
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

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const { data } = await apiClient.get<UnreadCountResponse>('/messages/unread-count');
  return data;
}
