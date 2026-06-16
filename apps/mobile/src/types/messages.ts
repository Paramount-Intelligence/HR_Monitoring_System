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
export type MessageDeliveryStatus = 'sent' | 'delivered' | 'seen';

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
}

export interface ReplyPreview {
  id: string;
  sender_name: string;
  content_preview: string;
  attachment_preview?: string | null;
  created_at: string;
  is_unavailable?: boolean;
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
  /** Client-only fields for optimistic UI */
  clientStatus?: 'sending' | 'queued' | 'failed' | 'sent';
  clientId?: string;
  clientVoiceLocalUri?: string;
  clientVoiceDuration?: number;
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
  who_can_send_messages: string;
  who_can_edit_group_info: string;
  who_can_add_members: string;
  participants: ConversationParticipant[];
  unread_count?: number;
  last_message?: LastMessageRead | null;
}

export interface MessageCreatePayload {
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
