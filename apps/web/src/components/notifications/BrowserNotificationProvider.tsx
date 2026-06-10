'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsApi, Notification as AppNotification } from '@/lib/api/notifications';
import { useRealtimeEvent, useRealtimeStatus } from '@/hooks/useRealtime';

const STORAGE_KEY = 'pims_browser_notifications_enabled';
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

export function useBrowserNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setBrowserNotificationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

interface BrowserNotificationProviderProps {
  enabled: boolean;
}

export function BrowserNotificationProvider({ enabled }: BrowserNotificationProviderProps) {
  const router = useRouter();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const { isConnected } = useRealtimeStatus();

  const showBrowserNotification = useCallback(
    (n: AppNotification) => {
      if (!enabled || typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (seenIdsRef.current.has(n.id)) return;
      if (n.is_read) return;

      seenIdsRef.current.add(n.id);

      const notification = new Notification(n.title, {
        body: n.message,
        tag: n.id,
        icon: '/logo.png',
      });

      notification.onclick = () => {
        window.focus();
        const route = getNotificationRoute(n);
        router.push(route);
        notification.close();
      };
    },
    [enabled, router]
  );

  useRealtimeEvent('notification_created', (ev) => {
    const p = ev.payload;
    showBrowserNotification({
      id: String(p.id),
      title: String(p.title),
      message: String(p.message),
      notification_type: String(p.notification_type),
      related_entity_type: (p.related_entity_type as string) ?? null,
      related_entity_id: (p.related_entity_id as string) ?? null,
      is_read: Boolean(p.is_read),
      created_at: String(p.created_at || new Date().toISOString()),
      read_at: null,
      route: ev.route,
    });
  });

  useEffect(() => {
    if (!enabled) return;

    const pollMs = isConnected ? POLL_INTERVAL_CONNECTED_MS : POLL_INTERVAL_FALLBACK_MS;

    const poll = async () => {
      try {
        const notifications = await notificationsApi.getNotifications(20);
        if (!initializedRef.current) {
          notifications.forEach((n) => seenIdsRef.current.add(n.id));
          initializedRef.current = true;
          return;
        }
        const unread = notifications.filter((n) => !n.is_read);
        unread.forEach(showBrowserNotification);
      } catch {
        // silent — in-app notifications still work
      }
    };

    poll();
    const interval = setInterval(poll, pollMs);
    return () => clearInterval(interval);
  }, [enabled, showBrowserNotification, isConnected]);

  return null;
}
