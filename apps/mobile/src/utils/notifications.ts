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

export type NotificationFilterCategory =
  | 'all'
  | 'unread'
  | 'attendance'
  | 'projects'
  | 'tasks'
  | 'leave'
  | 'messages'
  | 'system';

function isAttendanceNotification(notification: Notification): boolean {
  const type = notification.notification_type.toLowerCase();
  const entity = (notification.related_entity_type ?? '').toLowerCase();
  return (
    type.includes('attendance') ||
    entity.includes('attendance') ||
    type.includes('check_in') ||
    type.includes('check_out')
  );
}

function isProjectNotification(notification: Notification): boolean {
  const type = notification.notification_type.toLowerCase();
  const entity = (notification.related_entity_type ?? '').toLowerCase();
  return type.includes('project') || entity.includes('project');
}

function isTaskNotification(notification: Notification): boolean {
  const type = notification.notification_type.toLowerCase();
  const entity = (notification.related_entity_type ?? '').toLowerCase();
  return type.includes('task') || entity.includes('task');
}

function isLeaveNotification(notification: Notification): boolean {
  const type = notification.notification_type.toLowerCase();
  const entity = (notification.related_entity_type ?? '').toLowerCase();
  return (
    type.includes('leave') ||
    type.includes('wfh') ||
    type.includes('approval') ||
    entity.includes('leave')
  );
}

function isMessageNotification(notification: Notification): boolean {
  const type = notification.notification_type.toLowerCase();
  const entity = (notification.related_entity_type ?? '').toLowerCase();
  return (
    type.includes('message') ||
    type.includes('mention') ||
    type.includes('call') ||
    entity.includes('conversation')
  );
}

function matchesCategory(notification: Notification, category: NotificationFilterCategory): boolean {
  if (category === 'all') return true;
  if (category === 'unread') return !notification.is_read;

  switch (category) {
    case 'attendance':
      return isAttendanceNotification(notification);
    case 'projects':
      return isProjectNotification(notification);
    case 'tasks':
      return isTaskNotification(notification);
    case 'leave':
      return isLeaveNotification(notification);
    case 'messages':
      return isMessageNotification(notification);
    case 'system':
      return (
        !isAttendanceNotification(notification) &&
        !isProjectNotification(notification) &&
        !isTaskNotification(notification) &&
        !isLeaveNotification(notification) &&
        !isMessageNotification(notification)
      );
    default:
      return true;
  }
}

export function filterNotificationsByCategory(
  items: Notification[],
  category: string
): Notification[] {
  const key = category as NotificationFilterCategory;
  if (key === 'all') return items;
  return items.filter((item) => matchesCategory(item, key));
}
