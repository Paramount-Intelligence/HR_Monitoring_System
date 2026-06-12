import NetInfo, { type NetInfoSubscription } from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import { refreshAccessToken } from '../api/client';
import { websocketClient } from '../realtime/websocket-client';
import { runOfflineSync } from '../offline/offline-sync';
import { deriveNetworkFlags, mapConnectionType } from './network-utils';
import { getNetworkStore, useNetworkStore } from './network-store';
import { secureLog } from '../utils/secure-log';

let started = false;
let netSubscription: NetInfoSubscription | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let reconnectedTimer: ReturnType<typeof setTimeout> | null = null;
let queryClientRef: QueryClient | null = null;
let wasOffline = false;

function logNetwork(message: string): void {
  secureLog('NETWORK_MOBILE', message);
}

async function handleOnlineTransition(): Promise<void> {
  const store = getNetworkStore();
  store.incrementReconnect();
  store.setBannerMode('reconnected');
  logNetwork('reconnect_on_online=true');

  if (reconnectedTimer) clearTimeout(reconnectedTimer);
  reconnectedTimer = setTimeout(() => {
    if (!getNetworkStore().isOffline) {
      getNetworkStore().setBannerMode('hidden');
    }
  }, 4000);

  await refreshAccessToken().catch(() => undefined);
  void websocketClient.connectWhenOnline();
  void runOfflineSync();

  if (queryClientRef) {
    void queryClientRef.refetchQueries({ type: 'active' });
  }
}

function applyNetInfoState(
  state: ReturnType<typeof deriveNetworkFlags> & { type: ReturnType<typeof mapConnectionType> }
): void {
  const store = getNetworkStore();
  const now = new Date().toISOString();
  const prevOffline = store.isOffline;

  store.setNetworkState({
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
    connectionType: state.type,
    isOffline: state.isOffline,
    isWeakConnection: state.isWeakConnection,
    lastOnlineAt: state.isOffline ? store.lastOnlineAt : now,
    lastOfflineAt: state.isOffline ? now : store.lastOfflineAt,
  });

  if (state.isOffline) {
    wasOffline = true;
    store.setBannerMode('offline');
    websocketClient.pauseReconnectForOffline();
    logNetwork('offline=true');
    return;
  }

  if (state.isWeakConnection && !prevOffline) {
    store.setBannerMode('weak');
  } else if (!wasOffline) {
    store.setBannerMode('hidden');
  }

  if (wasOffline && !state.isOffline) {
    wasOffline = false;
    void handleOnlineTransition();
  }
}

export function startNetworkService(queryClient: QueryClient): void {
  if (started) return;
  started = true;
  queryClientRef = queryClient;

  void NetInfo.fetch().then((state) => {
    const flags = deriveNetworkFlags(state);
    applyNetInfoState({ ...flags, type: mapConnectionType(state.type) });
  });

  netSubscription = NetInfo.addEventListener((state) => {
    const flags = deriveNetworkFlags(state);
    applyNetInfoState({ ...flags, type: mapConnectionType(state.type) });
  });

  appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState !== 'active') return;
    if (getNetworkStore().isOffline) return;

    void NetInfo.fetch().then((state) => {
      const flags = deriveNetworkFlags(state);
      if (!flags.isOffline) {
        void refreshAccessToken().catch(() => undefined);
        void websocketClient.connectWhenOnline();
        void runOfflineSync();
        queryClientRef?.refetchQueries({ type: 'active' });
      }
    });
  });

  logNetwork('service_started=true');
}

export function stopNetworkService(): void {
  netSubscription?.();
  netSubscription = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  if (reconnectedTimer) clearTimeout(reconnectedTimer);
  reconnectedTimer = null;
  started = false;
  queryClientRef = null;
  useNetworkStore.getState().reset();
}

export function useNetworkStatus() {
  return useNetworkStore((s) => ({
    isOffline: s.isOffline,
    isWeakConnection: s.isWeakConnection,
    isConnected: s.isConnected,
    bannerMode: s.bannerMode,
    connectionType: s.connectionType,
  }));
}
