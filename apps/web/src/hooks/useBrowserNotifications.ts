'use client';

import { useCallback, useEffect, useState } from 'react';

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

export interface ShowNotificationOptions {
  title: string;
  body?: string;
  tag?: string;
  route?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  icon?: string;
  onClick?: () => void;
}

const CALL_NOTIFICATION_TYPES = new Set([
  'call_incoming',
  'call_accepted',
  'call_declined',
  'call_ended',
  'call_missed',
  'call_failed',
  'call_signal',
  'call_ringing',
]);

const SKIP_SOUND_TYPES = new Set([
  ...CALL_NOTIFICATION_TYPES,
  'call_ice_candidate',
]);

export function shouldPlayNotificationSound(notificationType?: string): boolean {
  if (!notificationType) return true;
  const normalized = notificationType.toLowerCase();
  if (normalized.startsWith('call_')) return false;
  return !SKIP_SOUND_TYPES.has(normalized);
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<BrowserNotificationPermissionState>('default');
  const [isSupported, setIsSupported] = useState(false);

  const syncPermission = useCallback(() => {
    const supported = isNotificationApiSupported();
    setIsSupported(supported);
    setPermission(supported ? readBrowserNotificationPermission() : 'unsupported');
  }, []);

  useEffect(() => {
    syncPermission();
  }, [syncPermission]);

  const requestPermission = useCallback(async (): Promise<BrowserNotificationPermissionState> => {
    if (!isNotificationApiSupported()) {
      setPermission('unsupported');
      return 'unsupported';
    }

    const current = readBrowserNotificationPermission();
    if (current === 'granted' || current === 'denied') {
      setPermission(current);
      markPermissionRequested();
      return current;
    }

    markPermissionRequested();
    try {
      const result = normalizePermission(await Notification.requestPermission());
      setPermission(result);
      window.dispatchEvent(new CustomEvent('pims-browser-notifications-changed'));
      return result;
    } catch {
      setPermission('denied');
      return 'denied';
    }
  }, []);

  /** Auto-request once after login when permission is still default. */
  const autoRequestPermissionAfterLogin = useCallback(async () => {
    if (!isNotificationApiSupported()) return;
    if (getStoredPermissionRequested()) return;
    if (readBrowserNotificationPermission() !== 'default') {
      markPermissionRequested();
      syncPermission();
      return;
    }
    await requestPermission();
  }, [requestPermission, syncPermission]);

  const showNotification = useCallback(
    (options: ShowNotificationOptions): Notification | null => {
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
    },
    []
  );

  const showIncomingCallNotification = useCallback(
    (params: {
      callId: string;
      callerName: string;
      callType: 'voice' | 'video';
      conversationId: string;
    }) => {
      const callLabel = params.callType === 'video' ? 'video call' : 'voice call';
      return showNotification({
        title: `Incoming ${callLabel}`,
        body: `${params.callerName} is calling you`,
        tag: `call_${params.callId}`,
        requireInteraction: true,
        silent: true,
        route: `/messages?conversation_id=${params.conversationId}`,
      });
    },
    [showNotification]
  );

  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    requestPermission,
    autoRequestPermissionAfterLogin,
    showNotification,
    showIncomingCallNotification,
    syncPermission,
  };
}
