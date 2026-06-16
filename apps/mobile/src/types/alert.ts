export type AlertSource = 'alert' | 'notification';

export type AlertCategory =
  | 'attendance'
  | 'projects'
  | 'tasks'
  | 'leave'
  | 'messages'
  | 'system'
  | 'approvals'
  | 'calls'
  | 'unknown';

export type AlertSeverity = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export type AlertFilterId =
  | 'all'
  | 'unread'
  | 'attendance'
  | 'projects'
  | 'tasks'
  | 'leave'
  | 'messages'
  | 'system';

export type AlertStatus = 'open' | 'resolved' | 'dismissed';

export interface AlertApiRecord {
  id: string;
  alert_type: string;
  severity: string;
  recipient_user_id: string;
  related_entity_type: string;
  related_entity_id: string;
  email_status: string;
  status: AlertStatus | string;
  title: string;
  message: string;
  created_at: string;
  resolved_at: string | null;
}

export interface AlertViewModel {
  id: string;
  source: AlertSource;
  title: string;
  message: string;
  category: AlertCategory;
  severity: AlertSeverity;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  relatedType: string | null;
  relatedId: string | null;
  relatedTitle: string | null;
  actorName: string | null;
  actionLabel: string | null;
  routeTarget: string | null;
}

export interface AlertListParams {
  category?: AlertFilterId;
  unread?: boolean;
}
