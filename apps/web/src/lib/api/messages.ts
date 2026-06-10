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
  avatar_url?: string | null;
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

export type MessageDeliveryStatus = 'sent' | 'delivered' | 'seen';

export interface ReplyPreview {
  id: string;
  sender_name: string;
  content_preview: string;
  attachment_preview?: string | null;
  created_at: string;
  is_unavailable?: boolean;
}

export interface MessageReceiptInfo {
  user_id: string;
  full_name: string;
  role: string;
  profile_picture_url?: string | null;
  delivered_at: string | null;
  seen_at: string | null;
}

export interface MessageInfo {
  message_id: string;
  sender: UserMinimal;
  sent_at: string;
  conversation_name: string | null;
  conversation_type: ConversationType | null;
  attachments: MessageAttachment[];
  receipts: MessageReceiptInfo[];
  is_deleted: boolean;
}

export interface MessageMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  mentioned_user: UserMinimal;
}

export interface MessageAttachment {
  id: string;
  file_name: string;
  original_file_name: string;
  mime_type: string;
  file_size: number;
  download_url: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: UserMinimal;
  body: string;
  message_type: MessageType;
  parent_message_id: string | null;
  reply_to_message_id?: string | null;
  reply_to_message?: ReplyPreview | null;
  delivery_status?: MessageDeliveryStatus | null;
  seen_count?: number | null;
  delivered_count?: number | null;
  total_recipients?: number | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  mentions: MessageMention[];
  reactions: MessageReaction[];
  attachments?: MessageAttachment[];
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
  body?: string;
  mentioned_user_ids?: string[];
  attachment_ids?: string[];
  reply_to_message_id?: string;
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

export interface CallSession {
  id: string;
  conversation_id: string;
  started_by_id: string;
  call_type: 'voice' | 'video';
  status: 'ringing' | 'active' | 'declined' | 'missed' | 'ended';
  started_at: string | null;
  accepted_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface CallSignal {
  id: string;
  call_session_id: string;
  sender_id: string;
  recipient_id: string;
  signal_type: 'offer' | 'answer' | 'ice_candidate' | 'end';
  payload: any;
  created_at: string;
  consumed_at: string | null;
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

  getMessageInfo: async (messageId: string): Promise<MessageInfo> => {
    const response = await apiClient.get<MessageInfo>(`/messages/${messageId}/info`);
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

  uploadConversationAttachments: async (
    conversationId: string,
    files: File[]
  ): Promise<MessageAttachment[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    const response = await apiClient.post<MessageAttachment[]>(
      `/messages/conversations/${conversationId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  downloadAttachment: async (attachmentId: string): Promise<void> => {
    const response = await apiClient.get(
      `/messages/attachments/${attachmentId}/download`,
      { responseType: 'blob' }
    );
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'download';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*=UTF-8''(.+)$/i) || contentDisposition.match(/filename="(.+)"/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  },

  startCall: async (conversationId: string, callType: 'voice' | 'video'): Promise<CallSession> => {
    const response = await apiClient.post<CallSession>(
      `/messages/conversations/${conversationId}/calls/start`,
      { call_type: callType }
    );
    return response.data;
  },

  acceptCall: async (callId: string): Promise<CallSession> => {
    const response = await apiClient.post<CallSession>(`/messages/calls/${callId}/accept`);
    return response.data;
  },

  declineCall: async (callId: string): Promise<CallSession> => {
    const response = await apiClient.post<CallSession>(`/messages/calls/${callId}/decline`);
    return response.data;
  },

  endCall: async (callId: string): Promise<CallSession> => {
    const response = await apiClient.post<CallSession>(`/messages/calls/${callId}/end`);
    return response.data;
  },

  sendSignal: async (
    callId: string,
    recipientId: string,
    signalType: 'offer' | 'answer' | 'ice_candidate' | 'end',
    payload: any
  ): Promise<CallSignal> => {
    const response = await apiClient.post<CallSignal>(`/messages/calls/${callId}/signal`, {
      recipient_id: recipientId,
      signal_type: signalType,
      payload,
    });
    return response.data;
  },

  getSignals: async (callId: string): Promise<CallSignal[]> => {
    const response = await apiClient.get<CallSignal[]>(`/messages/calls/${callId}/signals`);
    return response.data;
  },

  getIncomingCall: async (): Promise<CallSession | null> => {
    const response = await apiClient.get<CallSession | null>('/messages/calls/incoming');
    return response.data;
  },
};
