import { Ionicons } from '@expo/vector-icons';
import type { Notification } from '../types/notification';
import { formatMessageTime } from './messages';
import { colors } from '../constants/theme';
export function getNotificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'message':
    case 'mention':
      return 'chatbubble-outline';
    case 'leave':
    case 'approval':
      return 'document-text-outline';
    case 'task':
    case 'task_assigned':
      return 'checkbox-outline';
    case 'announcement':
      return 'megaphone-outline';
    case 'call_incoming':
    case 'call_missed':
      return 'call-outline';
    default:
      return 'notifications-outline';
  }
}

export function getNotificationIconColor(type: string, isRead: boolean): string {
  if (isRead) return colors.mutedText;
  switch (type) {
    case 'message':
    case 'mention':
      return colors.info;
    case 'call_incoming':
    case 'call_missed':
      return colors.danger;
    default:
      return colors.primary;
  }
}

export function formatNotificationTime(dateStr: string): string {
  return formatMessageTime(dateStr);
}

export function sortNotifications(items: Notification[]): Notification[] {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
