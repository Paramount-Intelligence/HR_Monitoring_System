import { useEffect, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../auth/auth-store';
import {
  handleNotificationRealtimeEvent,
  handleCallRealtimeEvent,
  handleRealtimeEvent,
  invalidateConversationsOnReconnect,
  setRealtimeQueryClient,
} from './realtime-handler';
import { registerPushTokenIfAvailable } from '../notifications/notifications-service';
import { subscribeConnectionStatus, subscribeRealtimeEvents, useRealtimeStore } from './realtime-store';
import { websocketClient } from './websocket-client';
import { getNetworkStore } from '../network/network-store';
import { runOfflineSync } from '../offline/offline-sync';

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const connect = useRealtimeStore((s) => s.connect);
  const disconnect = useRealtimeStore((s) => s.disconnect);
  const activeConversationId = useRealtimeStore((s) => s.activeConversationId);
  const activeConversationRef = useRef(activeConversationId);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    setRealtimeQueryClient(queryClient);
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnect();
      return;
    }

    if (!getNetworkStore().isOffline) {
      void connect();
    }

    void registerPushTokenIfAvailable().catch(() => {
      // Push is optional — in-app alerts and WebSocket must keep working.
    });

    const unsubscribeEvents = subscribeRealtimeEvents((event) => {
      handleRealtimeEvent(event, {
        currentUserId: user?.id,
        activeConversationId: activeConversationRef.current,
      });
      handleNotificationRealtimeEvent(event);
      handleCallRealtimeEvent(event, user?.id);
    });

    let previousStatus = websocketClient.getStatus();
    const unsubscribeStatus = subscribeConnectionStatus((status) => {
      if (
        (previousStatus === 'disconnected' ||
          previousStatus === 'reconnecting' ||
          previousStatus === 'connecting') &&
        status === 'connected'
      ) {
        invalidateConversationsOnReconnect();
        void runOfflineSync();
      }
      previousStatus = status;
    });

    return () => {
      unsubscribeEvents();
      unsubscribeStatus();
    };
  }, [isAuthenticated, user?.id, connect, disconnect]);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (!isAuthenticated) return;

      if (nextState === 'active' && !getNetworkStore().isOffline) {
        void connect();
        invalidateConversationsOnReconnect();
        void runOfflineSync();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [isAuthenticated, connect]);

  return <>{children}</>;
}
