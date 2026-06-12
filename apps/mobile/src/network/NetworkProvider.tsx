import { type ReactNode, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../auth/auth-store';
import { startNetworkService, stopNetworkService } from './network-service';
import { OfflineBanner } from './OfflineBanner';
import { OfflineQueueStatus } from '../offline/OfflineQueueStatus';
import { useOfflineQueueStore } from '../offline/offline-queue-store';
import { setOfflineSyncQueryClient, runOfflineSync } from '../offline/offline-sync';
import { getNetworkStore } from './network-store';

interface NetworkProviderProps {
  children: ReactNode;
  showQueueStatus?: boolean;
}

export function NetworkProvider({ children, showQueueStatus = false }: NetworkProviderProps) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setQueueUserId = useOfflineQueueStore((s) => s.setUserId);

  useEffect(() => {
    setOfflineSyncQueryClient(queryClient);
    startNetworkService(queryClient);
    return () => stopNetworkService();
  }, [queryClient]);

  useEffect(() => {
    if (isAuthenticated && userId) {
      void setQueueUserId(userId).then(() => {
        if (!getNetworkStore().isOffline) {
          void runOfflineSync();
        }
      });
    } else {
      void setQueueUserId(null);
    }
  }, [isAuthenticated, userId, setQueueUserId]);

  return (
    <View style={styles.root}>
      <OfflineBanner />
      {showQueueStatus ? (
        <View style={styles.queue}>
          <OfflineQueueStatus />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  queue: {
    paddingHorizontal: 16,
  },
});
