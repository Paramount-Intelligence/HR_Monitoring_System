import type { ConversationType } from '@/lib/api/messages';
import type { MessagingDirectoryUser } from '@/lib/api/messages';

export function formatMessagingRoleLabel(role: string): string {
  return role.replace(/_/g, ' ');
}

export function getMessagingUserSubtitle(user: MessagingDirectoryUser): string {
  const parts: string[] = [formatMessagingRoleLabel(user.role)];
  if (user.department_name?.trim()) parts.push(user.department_name.trim());
  if (user.designation?.trim()) parts.push(user.designation.trim());
  return parts.join(' · ');
}

export function filterMessagingDirectoryUsers(
  users: MessagingDirectoryUser[],
  options: {
    currentUserId?: string;
    conversationType: ConversationType;
    search?: string;
  }
): MessagingDirectoryUser[] {
  const { currentUserId, conversationType, search } = options;
  let list = users;

  if (conversationType === 'direct' && currentUserId) {
    list = list.filter((user) => user.id !== currentUserId);
  } else if (currentUserId) {
    list = list.filter((user) => user.id !== currentUserId);
  }

  const query = search?.trim().toLowerCase();
  if (!query) return list;

  return list.filter((user) => {
    const haystack = [
      user.full_name,
      user.role,
      user.department_name,
      user.designation,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function canLaunchConversation(options: {
  conversationType: ConversationType;
  selectedParticipantIds: string[];
  title: string;
}): boolean {
  const { conversationType, selectedParticipantIds, title } = options;
  if (selectedParticipantIds.length === 0) return false;
  if (conversationType === 'direct') return selectedParticipantIds.length === 1;
  return Boolean(title.trim());
}

export function getLaunchButtonLabel(conversationType: ConversationType): string {
  switch (conversationType) {
    case 'direct':
      return 'Start Direct Message';
    case 'group':
      return 'Create Group';
    case 'channel':
      return 'Create Channel';
    default:
      return 'Launch';
  }
}

export function getConversationTitleLabel(conversationType: ConversationType): string {
  return conversationType === 'channel' ? 'Channel name' : 'Group name';
}
