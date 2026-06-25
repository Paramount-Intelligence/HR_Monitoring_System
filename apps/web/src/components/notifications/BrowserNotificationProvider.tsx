'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { notificationsApi, Notification as AppNotification } from '@/lib/api/notifications';
import { useRealtimeEvent, useRealtimeStatus } from '@/hooks/useRealtime';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { canFetchProtectedData } from '@/lib/auth/session';
import { logProtectedFetchError } from '@/lib/api/fetch-errors';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getNotificationRoute,
  shouldShowBanner,
  shouldShowDesktop,
  shouldPlayIncomingNotificationSound,
} from '@/lib/notifications/delivery';
import {
  resolveNotificationBody,
  showBrowserNotification,
} from '@/lib/notifications/browserNotifications';
import { playIncomingMessageSound } from '@/lib/notifications/sounds';
import { syncTaskbarBadge } from '@/lib/notifications/badge';
import { NotificationBanner } from '@/components/notifications/NotificationBanner';

const POLL_INTERVAL_CONNECTED_MS = 60000;
const POLL_INTERVAL_FALLBACK_MS = 30000;

function mapRealtimeNotification(p: Record<string, unknown>, route?: string): AppNotification {
  const notificationType = String(p.notification_type || p.type || 'system');
  return {
    id: String(p.id),
    user_id: '',
    title: String(p.title || 'Notification'),
    message: String(p.message || p.body || ''),
    notification_type: notificationType,
    related_entity_type: (p.related_entity_type as string) ?? null,
    related_entity_id: (p.related_entity_id as string) ?? null,
    is_read: Boolean(p.is_read),
    created_at: String(p.created_at || new Date().toISOString()),
    read_at: null,
    route: route ?? (p.deep_link as string) ?? null,
    deep_link: (p.deep_link as string) ?? route ?? null,
    category: (p.category as string) ?? undefined,
  };
}

export function BrowserNotificationProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { preferences } = useNotificationPreferences();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const { isConnected } = useRealtimeStatus();
  const { isGranted } = useBrowserNotifications();
  const [bannerNotification, setBannerNotification] = useState<AppNotification | null>(null);

  const activeConversationId =
    pathname?.startsWith('/messages') ? searchParams.get('conversation_id') : null;

  const shouldSuppressForActiveChat = useCallback(
    (n: AppNotification) => {
      if (!activeConversationId || !n.related_entity_id) return false;
      if (n.notification_type === 'mention') return false;
      if (n.notification_type?.startsWith('call_')) return false;
      return (
        n.related_entity_type === 'conversation' && n.related_entity_id === activeConversationId
      );
    },
    [activeConversationId]
  );

  const deliverNotification = useCallback(
    (n: AppNotification) => {
      if (seenIdsRef.current.has(n.id)) return;
      if (n.is_read) return;
      seenIdsRef.current.add(n.id);

      const documentVisible =
        typeof document !== 'undefined' && document.visibilityState === 'visible';
      const suppressed = shouldSuppressForActiveChat(n);
      const payload = n as AppNotification & { deliver_banner?: boolean; deliver_desktop?: boolean };

      if (
        !suppressed &&
        shouldShowBanner(preferences, n, documentVisible) &&
        payload.deliver_banner !== false
      ) {
        setBannerNotification({
          ...n,
          message: resolveNotificationBody(n.title, n.message, preferences, n.notification_type),
        });
      }

      if (
        !suppressed &&
        isGranted &&
        shouldShowDesktop(preferences, n, documentVisible) &&
        payload.deliver_desktop !== false
      ) {
        const body = resolveNotificationBody(n.title, n.message, preferences, n.notification_type);
        showBrowserNotification({
          title: n.title,
          body,
          tag: n.id,
          route: getNotificationRoute(n),
          onClick: () => router.push(getNotificationRoute(n)),
        });
      }

      if (
        !suppressed &&
        shouldPlayIncomingNotificationSound(preferences, n)
      ) {
        playIncomingMessageSound(preferences);
      }
    },
    [preferences, isGranted, router, shouldSuppressForActiveChat]
  );

  useRealtimeEvent('notification_created', (ev) => {
    const n = mapRealtimeNotification(ev.payload as Record<string, unknown>, ev.route);
    const payload = ev.payload as Record<string, unknown>;
    if (payload.deliver_banner === false && payload.deliver_desktop === false) {
      if (!shouldPlayIncomingNotificationSound(preferences, n)) return;
    }
    deliverNotification(n);
  });

  useEffect(() => {
    if (!user || !canFetchProtectedData()) return;

    const refreshBadge = async () => {
      if (!canFetchProtectedData()) return;
      try {
        const { count } = await notificationsApi.getUnreadCount();
        await syncTaskbarBadge(count, preferences);
      } catch (err) {
        logProtectedFetchError('[BrowserNotificationProvider] badge sync failed', err);
      }
    };

    void refreshBadge();
    const onCount = () => void refreshBadge();
    window.addEventListener('pims-notifications-unread-update', onCount);
    return () => window.removeEventListener('pims-notifications-unread-update', onCount);
  }, [user, preferences]);

  useEffect(() => {
    if (!user || !isGranted || !canFetchProtectedData()) return;

    const pollMs = isConnected ? POLL_INTERVAL_CONNECTED_MS : POLL_INTERVAL_FALLBACK_MS;

    const poll = async () => {
      if (!canFetchProtectedData()) return;
      try {
        const notifications = await notificationsApi.getNotifications(20);
        if (!initializedRef.current) {
          notifications.forEach((n) => seenIdsRef.current.add(n.id));
          initializedRef.current = true;
          return;
        }
        const unread = notifications.filter(
          (n) => !n.is_read && !n.notification_type?.startsWith('call_')
        );
        unread.forEach((n) => deliverNotification(n));
      } catch (err) {
        logProtectedFetchError('[BrowserNotificationProvider] poll failed', err);
      }
    };

    poll();
    const interval = setInterval(poll, pollMs);
    return () => clearInterval(interval);
  }, [user, isGranted, deliverNotification, isConnected]);

  return (
    <NotificationBanner
      notification={bannerNotification}
      onDismiss={() => setBannerNotification(null)}
      onOpen={(n) => {
        setBannerNotification(null);
        router.push(getNotificationRoute(n));
      }}
    />
  );
}

/** @deprecated Permission is requested from Messages notification settings */
export function useBrowserNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && Notification.permission === 'granted';
}

/** @deprecated */
export function setBrowserNotificationsEnabled(_enabled: boolean): void {
  window.dispatchEvent(new CustomEvent('pims-browser-notifications-changed'));
}

/** @deprecated Use lib/notifications/browserNotifications.requestBrowserNotificationPermission */
export { requestBrowserNotificationPermission } from '@/lib/notifications/browserNotifications';
