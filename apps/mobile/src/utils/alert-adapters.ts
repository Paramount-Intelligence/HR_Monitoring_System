import type { AlertApiRecord, AlertCategory, AlertFilterId, AlertSeverity, AlertViewModel } from '../types/alert';
import type { Notification } from '../types/notification';
import {
  filterNotificationsByCategory,
  sortNotifications,
} from './notifications';

function normalizeSeverity(value: string | undefined): AlertSeverity {
  switch ((value ?? '').toLowerCase()) {
    case 'low':
      return 'info';
    case 'medium':
      return 'neutral';
    case 'high':
      return 'warning';
    case 'critical':
      return 'danger';
    default:
      return 'neutral';
  }
}

function categoryFromAlertType(alertType: string, relatedType: string): AlertCategory {
  const type = alertType.toLowerCase();
  const entity = relatedType.toLowerCase();

  if (
    type.includes('checkout') ||
    type.includes('checkin') ||
    type.includes('idle') ||
    entity.includes('attendance')
  ) {
    return 'attendance';
  }
  if (type.includes('task') || entity === 'task') return 'tasks';
  if (entity === 'project') return 'projects';
  if (type.includes('approval') || entity === 'approval') return 'leave';
  if (type.includes('workload') || type.includes('suspicious') || type.includes('logging')) {
    return 'system';
  }
  return 'unknown';
}

function categoryFromNotification(notification: Notification): AlertCategory {
  if (filterNotificationsByCategory([notification], 'attendance').length) return 'attendance';
  if (filterNotificationsByCategory([notification], 'projects').length) return 'projects';
  if (filterNotificationsByCategory([notification], 'tasks').length) return 'tasks';
  if (filterNotificationsByCategory([notification], 'leave').length) return 'leave';
  if (filterNotificationsByCategory([notification], 'messages').length) return 'messages';
  return 'system';
}

export function getAlertRouteTarget(
  relatedType: string | null | undefined,
  relatedId: string | null | undefined,
  notificationType?: string
): string | null {
  const entity = (relatedType ?? '').toLowerCase();
  const type = (notificationType ?? '').toLowerCase();

  if (entity === 'task' && relatedId) return `/tasks/${relatedId}`;
  if (entity === 'project' && relatedId) return `/projects/${relatedId}`;
  if (entity === 'attendance_session' || entity.includes('attendance')) {
    return '/(tabs)/attendance';
  }
  if (entity === 'approval' || type.includes('leave') || type.includes('wfh')) {
    return '/leave-request';
  }
  if (entity.includes('conversation') && relatedId) {
    return `/chat/${relatedId}`;
  }
  if (type.includes('message') || type.includes('mention')) {
    return '/(tabs)/messages';
  }
  if (type.includes('call')) return '/(tabs)/messages';
  if (type.includes('approval')) return '/manage/approvals';

  return null;
}

function getActionLabel(routeTarget: string | null): string | null {
  if (!routeTarget) return null;
  if (routeTarget.startsWith('/tasks/')) return 'View task';
  if (routeTarget.startsWith('/projects/')) return 'View project';
  if (routeTarget.includes('attendance')) return 'View attendance';
  if (routeTarget.includes('leave-request')) return 'View leave request';
  if (routeTarget.startsWith('/chat/')) return 'Open message';
  if (routeTarget.includes('messages')) return 'Open messages';
  if (routeTarget.includes('approvals')) return 'View approvals';
  return 'View details';
}

export function mapAlertRecordToViewModel(record: AlertApiRecord): AlertViewModel {
  const status = String(record.status).toLowerCase();
  const isResolved = status === 'resolved' || status === 'dismissed';
  const category = categoryFromAlertType(record.alert_type, record.related_entity_type);
  const routeTarget = getAlertRouteTarget(record.related_entity_type, record.related_entity_id);

  return {
    id: record.id,
    source: 'alert',
    title: record.title,
    message: record.message,
    category,
    severity: normalizeSeverity(record.severity),
    isRead: isResolved,
    isResolved,
    createdAt: record.created_at,
    relatedType: record.related_entity_type,
    relatedId: record.related_entity_id,
    relatedTitle: null,
    actorName: null,
    actionLabel: isResolved ? null : getActionLabel(routeTarget),
    routeTarget,
  };
}

export function mapNotificationToViewModel(notification: Notification): AlertViewModel {
  const category = categoryFromNotification(notification);
  const routeTarget =
    notification.route ??
    getAlertRouteTarget(
      notification.related_entity_type,
      notification.related_entity_id,
      notification.notification_type
    );

  return {
    id: notification.id,
    source: 'notification',
    title: notification.title,
    message: notification.message,
    category,
    severity: notification.is_read ? 'neutral' : 'info',
    isRead: notification.is_read,
    isResolved: notification.is_read,
    createdAt: notification.created_at,
    relatedType: notification.related_entity_type,
    relatedId: notification.related_entity_id,
    relatedTitle: null,
    actorName: null,
    actionLabel: notification.is_read ? null : getActionLabel(routeTarget),
    routeTarget,
  };
}

export function mergeAlertFeed(
  alerts: AlertApiRecord[],
  notifications: Notification[]
): AlertViewModel[] {
  const alertItems = alerts.map(mapAlertRecordToViewModel);
  const notificationItems = sortNotifications(notifications).map(mapNotificationToViewModel);
  return [...alertItems, ...notificationItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function matchesAlertFilter(alert: AlertViewModel, filter: AlertFilterId): boolean {
  if (filter === 'all') return true;
  if (filter === 'unread') return !alert.isRead && !alert.isResolved;
  if (filter === 'leave') return alert.category === 'leave' || alert.category === 'approvals';
  return alert.category === filter;
}

export function getAlertAccentColor(severity: AlertSeverity, isUnread: boolean): string {
  if (!isUnread) return '#c4c5d7';
  switch (severity) {
    case 'danger':
      return '#EF4444';
    case 'warning':
      return '#F59E0B';
    case 'success':
      return '#10B981';
    case 'info':
      return '#3B82F6';
    default:
      return '#0037b0';
  }
}

export function getCategoryLabel(category: AlertCategory): string {
  switch (category) {
    case 'attendance':
      return 'Attendance';
    case 'projects':
      return 'Projects';
    case 'tasks':
      return 'Tasks';
    case 'leave':
      return 'Leave';
    case 'messages':
      return 'Messages';
    case 'approvals':
      return 'Approvals';
    case 'calls':
      return 'Calls';
    case 'system':
      return 'System';
    default:
      return 'Alert';
  }
}

export function severityToBadgeVariant(
  severity: AlertSeverity
): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (severity) {
    case 'danger':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'success':
      return 'success';
    case 'info':
      return 'info';
    default:
      return 'neutral';
  }
}
