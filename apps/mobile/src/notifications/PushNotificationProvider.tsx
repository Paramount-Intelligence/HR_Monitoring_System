import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '../auth/auth-store';
import { isExpoGo } from './notification-permissions';
import { ensureNotificationChannels } from './notification-channels';
import {
  consumePendingNotificationNavigation,
  handleNotificationResponseData,
  setPendingNotificationNavigation,
} from './notification-navigation';
import { queryKeys } from '../constants/query-keys';
import { secureLog } from '../utils/secure-log';

interface PushNotificationProviderProps {
  children: ReactNode;
}

function invalidateNotificationQueries(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
  void queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
}

export function PushNotificationProvider({ children }: PushNotificationProviderProps) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const handledColdStart = useRef(false);

  useEffect(() => {
    if (isExpoGo || Platform.OS !== 'android') return;
    void ensureNotificationChannels();
  }, []);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || isExpoGo) return;

    let receivedSub: { remove: () => void } | undefined;
    let responseSub: { remove: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const Notifications = await import('expo-notifications');

        if (!handledColdStart.current) {
          handledColdStart.current = true;
          const last = Notifications.getLastNotificationResponse();
          if (last?.notification.request.content.data) {
            setPendingNotificationNavigation(
              last.notification.request.content.data as Record<string, unknown>
            );
          }
        }

        receivedSub = Notifications.addNotificationReceivedListener(() => {
          invalidateNotificationQueries(queryClient);
        });

        responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          handleNotificationResponseData(
            response.notification.request.content.data as Record<string, unknown>
          );
        });

        const pending = consumePendingNotificationNavigation();
        if (pending && !cancelled) {
          handleNotificationResponseData(pending as Record<string, unknown>);
        }
      } catch {
        secureLog('PUSH_MOBILE', 'notification listeners unavailable');
      }
    })();

    return () => {
      cancelled = true;
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, [isAuthenticated, isHydrated, queryClient]);

  return <>{children}</>;
}
