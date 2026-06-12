'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsApi, Notification as AppNotification } from '@/lib/api/notifications';
import { useRealtimeEvent, useRealtimeStatus } from '@/hooks/useRealtime';
import {
  shouldPlayNotificationSound,
  useBrowserNotifications,
} from '@/hooks/useBrowserNotifications';
import { playNotificationSound } from '@/lib/calls/sounds';
import { useAuth } from '@/lib/auth/AuthContext';

const POLL_INTERVAL_CONNECTED_MS = 60000;
const POLL_INTERVAL_FALLBACK_MS = 30000;

function getNotificationRoute(n: AppNotification): string {
  if (n.route) return n.route;
  const type = n.notification_type;
  if (type.startsWith('meeting') || n.related_entity_type === 'meeting') return '/calendar';
  if (type === 'message' || type === 'mention') return '/messages';
  if (type.startsWith('support') || n.related_entity_type === 'support_ticket') return '/help-support';
  if (n.related_entity_type === 'task') return '/admin/tasks';
  return '/';
}

export function BrowserNotificationProvider() {
  const router = useRouter();
  const { user } = useAuth();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const { isConnected } = useRealtimeStatus();
  const { isGranted, showNotification, autoRequestPermissionAfterLogin } = useBrowserNotifications();

  useEffect(() => {
    if (user) {
      void autoRequestPermissionAfterLogin();
    }
  }, [user, autoRequestPermissionAfterLogin]);

  const showBrowserNotification = useCallback(
    (n: AppNotification) => {
      if (!isGranted) return;
      if (n.notification_type?.startsWith('call_')) return;
      if (seenIdsRef.current.has(n.id)) return;
      if (n.is_read) return;

      seenIdsRef.current.add(n.id);
      showNotification({
        title: n.title,
        body: n.message,
        tag: n.id,
        route: getNotificationRoute(n),
        onClick: () => router.push(getNotificationRoute(n)),
      });
    },
    [isGranted, showNotification, router]
  );

  useRealtimeEvent('notification_created', (ev) => {
    const p = ev.payload;
    const notificationType = String(p.notification_type);
    if (shouldPlayNotificationSound(notificationType)) {
      playNotificationSound(notificationType);
    }
    showBrowserNotification({
      id: String(p.id),
      title: String(p.title),
      message: String(p.message),
      notification_type: notificationType,
      related_entity_type: (p.related_entity_type as string) ?? null,
      related_entity_id: (p.related_entity_id as string) ?? null,
      is_read: Boolean(p.is_read),
      created_at: String(p.created_at || new Date().toISOString()),
      read_at: null,
      route: ev.route,
    });
  });

  useRealtimeEvent(['new_message', 'announcement_created', 'task_assigned'], (ev) => {
    if (!shouldPlayNotificationSound(ev.type)) return;
    playNotificationSound(ev.type);
  });

  useEffect(() => {
    if (!user || !isGranted) return;

    const pollMs = isConnected ? POLL_INTERVAL_CONNECTED_MS : POLL_INTERVAL_FALLBACK_MS;

    const poll = async () => {
      try {
        const notifications = await notificationsApi.getNotifications(20);
        if (!initializedRef.current) {
          notifications.forEach((n) => seenIdsRef.current.add(n.id));
          initializedRef.current = true;
          return;
        }
        const unread = notifications.filter((n) => !n.is_read && !n.notification_type?.startsWith('call_'));
        unread.forEach(showBrowserNotification);
      } catch {
        /* silent */
      }
    };

    poll();
    const interval = setInterval(poll, pollMs);
    return () => clearInterval(interval);
  }, [user, isGranted, showBrowserNotification, isConnected]);

  return null;
}

/** @deprecated Permission is auto-requested after login; kept for profile settings compatibility */
export function useBrowserNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && Notification.permission === 'granted';
}

/** @deprecated */
export function setBrowserNotificationsEnabled(_enabled: boolean): void {
  window.dispatchEvent(new CustomEvent('pims-browser-notifications-changed'));
}

/** @deprecated Use useBrowserNotifications().requestPermission */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}
