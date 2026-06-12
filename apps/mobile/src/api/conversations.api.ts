import { apiClient } from './client';
import type { Conversation } from '../types/messages';

export interface GetConversationsParams {
  type?: string;
  search?: string;
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

export async function getConversations(
  params?: GetConversationsParams
): Promise<Conversation[]> {
  const { data } = await apiClient.get<Conversation[]>('/messages/conversations', { params });
  return data;
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  const { data } = await apiClient.get<Conversation>(
    `/messages/conversations/${conversationId}`
  );
  return data;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiClient.post(`/messages/conversations/${conversationId}/read`);
}

export async function getOrCreateDirectConversation(participantId: string): Promise<Conversation> {
  const { data } = await apiClient.post<Conversation>('/messages/conversations', {
    type: 'direct',
    participant_ids: [participantId],
  });
  return data;
}

export async function getOrCreateContextThread(userId: string): Promise<Conversation> {
  const { data } = await apiClient.post<Conversation>('/messages/context/thread', {
    user_id: userId,
  });
  return data;
}
