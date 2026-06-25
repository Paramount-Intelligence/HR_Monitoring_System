import type { Notification } from '@/lib/api/notifications';
import type { NotificationPreferences } from './notification-preferences';

function parseTime(value: string | null | undefined): { hours: number; minutes: number } | null {
  if (!value) return null;
  const normalized = value.length >= 5 ? value.slice(0, 5) : value;
  const [h, m] = normalized.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { hours: h, minutes: m };
}

export function isWithinQuietHours(
  preferences: NotificationPreferences,
  now = new Date()
): boolean {
  if (!preferences.quietHoursEnabled) return false;
  const start = parseTime(preferences.quietHoursStart);
  const end = parseTime(preferences.quietHoursEnd);
  if (!start || !end) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const startMin = start.hours * 60 + start.minutes;
  const endMin = end.hours * 60 + end.minutes;

  if (startMin <= endMin) {
    return minutes >= startMin && minutes <= endMin;
  }
  return minutes >= startMin || minutes <= endMin;
}

/** @deprecated use isWithinQuietHours */
export const isInQuietHours = isWithinQuietHours;

function typeEnabled(
  preferences: NotificationPreferences,
  notification: Pick<Notification, 'notification_type' | 'related_entity_type' | 'category'>,
  conversationType?: 'direct' | 'group' | 'channel' | string | null
): boolean {
  const type = (notification.notification_type || '').toLowerCase();
  const category = notification.category || '';
  const entity = notification.related_entity_type || '';

  if (type === 'mention') return preferences.mentionNotificationsEnabled;
  if (type.startsWith('call_')) return preferences.callNotificationsEnabled;
  if (type === 'message') {
    if (conversationType === 'group' || conversationType === 'channel') {
      return preferences.groupNotificationsEnabled;
    }
    return preferences.messageNotificationsEnabled;
  }
  if (category === 'tasks' || entity === 'task') return preferences.taskNotificationsEnabled;
  if (category === 'approvals' || entity === 'task_completion' || entity === 'leave_request') {
    return preferences.approvalNotificationsEnabled;
  }
  if (category === 'attendance' || entity?.startsWith('attendance')) {
    return preferences.attendanceNotificationsEnabled;
  }
  if (category === 'announcements' || entity === 'announcement') {
    return preferences.announcementNotificationsEnabled;
  }
  return true;
}

export function shouldShowBanner(
  preferences: NotificationPreferences | null,
  notification: Pick<Notification, 'notification_type' | 'related_entity_type' | 'category'>,
  documentVisible: boolean,
  conversationType?: string | null
): boolean {
  if (!preferences || preferences.bannerMode === 'never') return false;
  if (preferences.bannerMode === 'app_open' && !documentVisible) return false;
  if (isWithinQuietHours(preferences)) return false;
  return typeEnabled(preferences, notification, conversationType);
}

export function shouldShowDesktop(
  preferences: NotificationPreferences | null,
  notification: Pick<Notification, 'notification_type' | 'related_entity_type' | 'category'>,
  documentVisible: boolean,
  conversationType?: string | null
): boolean {
  if (!preferences?.desktopNotificationsEnabled) return false;
  if (isWithinQuietHours(preferences)) return false;
  return typeEnabled(preferences, notification, conversationType);
}

export function shouldPlayIncomingNotificationSound(
  preferences: NotificationPreferences | null,
  notification: Pick<Notification, 'notification_type' | 'related_entity_type' | 'category'>,
  conversationType?: string | null
): boolean {
  if (!preferences?.incomingSoundEnabled) return false;
  if (isWithinQuietHours(preferences)) return false;
  return typeEnabled(preferences, notification, conversationType);
}

export function shouldPlayOutgoingMessageSound(preferences: NotificationPreferences | null): boolean {
  if (!preferences) return false;
  if (!preferences.outgoingSoundEnabled) return false;
  if (isWithinQuietHours(preferences)) return false;
  return true;
}

export function getNotificationRoute(notification: Notification): string {
  if (notification.deep_link) return notification.deep_link;
  if (notification.route) return notification.route;
  const type = notification.notification_type;
  if (type.startsWith('meeting') || notification.related_entity_type === 'meeting') return '/calendar';
  if (type === 'message' || type === 'mention') {
    if (notification.related_entity_type === 'conversation' && notification.related_entity_id) {
      return `/messages?conversation_id=${notification.related_entity_id}`;
    }
    return '/messages';
  }
  if (type.startsWith('support') || notification.related_entity_type === 'support_ticket') {
    return '/help-support';
  }
  if (notification.related_entity_type === 'task') return '/admin/tasks';
  if (notification.related_entity_type === 'announcement') return '/admin/announcements';
  if (notification.related_entity_type === 'leave_request') return '/leaves';
  return '/';
}
