import type { Conversation, ConversationParticipantRole, ConversationType } from '@/lib/api/messages';

export function isMultiParticipantConversation(
  type: ConversationType | undefined | null
): boolean {
  return Boolean(type && type !== 'direct');
}

export function canManageConversationParticipants(
  conv: Conversation | null,
  platformRole: string | undefined,
  participantRole: ConversationParticipantRole | undefined
): boolean {
  if (!conv || conv.type === 'direct') return false;
  if (platformRole === 'admin' || platformRole === 'manager') return true;
  if (participantRole === 'owner' || participantRole === 'admin') return true;
  if (conv.who_can_add_members === 'all_members') return true;
  return false;
}
