import type { NotificationPreferences } from './notification-preferences';

export type BrowserNotificationPermissionState =
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported';

const PERMISSION_REQUESTED_KEY = 'pims_notification_permission_requested';

export function isNotificationApiSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getStoredPermissionRequested(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PERMISSION_REQUESTED_KEY) === 'true';
}

export function markPermissionRequested(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
}

function normalizePermission(value: NotificationPermission): BrowserNotificationPermissionState {
  if (value === 'granted' || value === 'denied' || value === 'default') return value;
  return 'default';
}

export function readBrowserNotificationPermission(): BrowserNotificationPermissionState {
  if (!isNotificationApiSupported()) return 'unsupported';
  return normalizePermission(Notification.permission);
}

export interface ShowBrowserNotificationOptions {
  title: string;
  body?: string;
  tag?: string;
  route?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  icon?: string;
  onClick?: () => void;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermissionState> {
  if (!isNotificationApiSupported()) return 'unsupported';

  const current = readBrowserNotificationPermission();
  if (current === 'granted' || current === 'denied') {
    markPermissionRequested();
    return current;
  }

  markPermissionRequested();
  try {
    const result = normalizePermission(await Notification.requestPermission());
    window.dispatchEvent(new CustomEvent('pims-browser-notifications-changed'));
    return result;
  } catch {
    return 'denied';
  }
}

export function showBrowserNotification(
  options: ShowBrowserNotificationOptions
): Notification | null {
  if (!isNotificationApiSupported() || readBrowserNotificationPermission() !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      tag: options.tag,
      icon: options.icon ?? '/logo.png',
      requireInteraction: options.requireInteraction ?? false,
      silent: options.silent ?? false,
    });

    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      if (options.route && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pims-navigate', { detail: { route: options.route } })
        );
      }
      notification.close();
    };

    return notification;
  } catch {
    return null;
  }
}

export function resolveNotificationBody(
  title: string,
  body: string,
  preferences: NotificationPreferences | null,
  notificationType?: string
): string {
  if (preferences?.showPreviews === false) {
    const type = (notificationType || '').toLowerCase();
    if (type === 'mention') return 'You were mentioned';
    if (type === 'message') return 'New message';
    if (type.startsWith('call_')) return type === 'call_missed' ? 'Missed call' : 'Incoming call';
    if (type === 'system') return 'Task update';
    if (preferences && title.toLowerCase().includes('announcement')) return 'New announcement';
    return title || 'New notification';
  }
  return body || title;
}
