import apiClient from './client';

export type ConversationType =
  | 'direct'
  | 'group'
  | 'channel'
  | 'task_thread'
  | 'project_thread'
  | 'meeting_thread'
  | 'support_thread'
  | 'eod_thread'
  | 'approval_thread';

export type ConversationParticipantRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MessageType = 'text' | 'system' | 'link' | 'status_update';

export interface UserMinimal {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ConversationParticipantRole;
  last_read_at: string | null;
  is_muted: boolean;
  joined_at: string;
  left_at: string | null;
  user: UserMinimal;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: UserMinimal;
}

export interface MessageMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  mentioned_user: UserMinimal;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: UserMinimal;
  body: string;
  message_type: MessageType;
  parent_message_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  mentions: MessageMention[];
  reactions: MessageReaction[];
}

export interface LastMessageRead {
  id: string;
  body: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  created_by_id: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Group/channel permission settings
  who_can_send_messages: string;
  who_can_edit_group_info: string;
  who_can_add_members: string;
  participants: ConversationParticipant[];
  unread_count?: number;
  last_message?: LastMessageRead | null;
}

export interface ConversationCreateParams {
  type: ConversationType;
  title?: string;
  participant_ids: string[];
}

export interface MessageCreateParams {
  body: string;
  mentioned_user_ids?: string[];
}

export interface UnreadCountResponse {
  unread_conversations: number;
  unread_messages: number;
  mentions: number;
}

export interface ContextThreadCreateParams {
  related_entity_type: string;
  related_entity_id: string;
  title?: string;
}

export interface AddParticipantsParams {
  user_ids: string[];
}

export interface UpdateParticipantRoleParams {
  role: ConversationParticipantRole;
}

export interface ConversationSettingsUpdateParams {
  title?: string;
  who_can_send_messages?: 'all_members' | 'admins_only';
  who_can_edit_group_info?: 'all_members' | 'admins_only';
  who_can_add_members?: 'all_members' | 'admins_only';
}

export const messagesApi = {
  getConversations: async (params?: {
    type?: ConversationType;
    search?: string;
    unread_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]> => {
    const response = await apiClient.get<Conversation[]>('/messages/conversations', { params });
    return response.data;
  },

  createConversation: async (payload: ConversationCreateParams): Promise<Conversation> => {
    const response = await apiClient.post<Conversation>('/messages/conversations', payload);
    return response.data;
  },

  getConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await apiClient.get<Conversation>(`/messages/conversations/${conversationId}`);
    return response.data;
  },

  getMessages: async (
    conversationId: string,
    params?: { limit?: number; before?: string }
  ): Promise<Message[]> => {
    const response = await apiClient.get<Message[]>(
      `/messages/conversations/${conversationId}/messages`,
      { params }
    );
    return response.data;
  },

  sendMessage: async (conversationId: string, payload: MessageCreateParams): Promise<Message> => {
    const response = await apiClient.post<Message>(
      `/messages/conversations/${conversationId}/messages`,
      payload
    );
    return response.data;
  },

  editMessage: async (messageId: string, body: string): Promise<Message> => {
    const response = await apiClient.patch<Message>(`/messages/${messageId}`, { body });
    return response.data;
  },

  deleteMessage: async (messageId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/messages/${messageId}`);
    return response.data;
  },

  markConversationRead: async (conversationId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/messages/conversations/${conversationId}/read`
    );
    return response.data;
  },

  getUnreadMessageCount: async (): Promise<UnreadCountResponse> => {
    const response = await apiClient.get<UnreadCountResponse>('/messages/unread-count');
    return response.data;
  },

  getOrCreateContextThread: async (payload: ContextThreadCreateParams): Promise<Conversation> => {
    const response = await apiClient.post<Conversation>('/messages/context/thread', payload);
    return response.data;
  },

  getMentionableUsers: async (conversationId: string): Promise<UserMinimal[]> => {
    const response = await apiClient.get<UserMinimal[]>(
      `/messages/conversations/${conversationId}/mentionable-users`
    );
    return response.data;
  },

  // ─── Participant Management ────────────────────────────────────────────────

  addConversationParticipants: async (
    conversationId: string,
    userIds: string[]
  ): Promise<ConversationParticipant[]> => {
    const response = await apiClient.post<ConversationParticipant[]>(
      `/messages/conversations/${conversationId}/participants`,
      { user_ids: userIds }
    );
    return response.data;
  },

  removeConversationParticipant: async (
    conversationId: string,
    userId: string
  ): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(
      `/messages/conversations/${conversationId}/participants/${userId}`
    );
    return response.data;
  },

  updateConversationParticipantRole: async (
    conversationId: string,
    userId: string,
    role: ConversationParticipantRole
  ): Promise<ConversationParticipant> => {
    const response = await apiClient.patch<ConversationParticipant>(
      `/messages/conversations/${conversationId}/participants/${userId}`,
      { role }
    );
    return response.data;
  },

  updateConversationSettings: async (
    conversationId: string,
    payload: ConversationSettingsUpdateParams
  ): Promise<Conversation> => {
    const response = await apiClient.patch<Conversation>(
      `/messages/conversations/${conversationId}/settings`,
      payload
    );
    return response.data;
  },
};
