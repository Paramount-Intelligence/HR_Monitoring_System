import { create } from 'zustand';
import type { ConnectionType } from './network-utils';

export type NetworkBannerMode = 'hidden' | 'offline' | 'weak' | 'reconnected';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: ConnectionType;
  isOffline: boolean;
  isWeakConnection: boolean;
  lastOnlineAt: string | null;
  lastOfflineAt: string | null;
  reconnectCount: number;
  bannerMode: NetworkBannerMode;
  setNetworkState: (partial: Partial<Omit<NetworkState, 'setNetworkState' | 'setBannerMode' | 'incrementReconnect'>>) => void;
  setBannerMode: (mode: NetworkBannerMode) => void;
  incrementReconnect: () => void;
  reset: () => void;
}

const initialState = {
  isConnected: true,
  isInternetReachable: null as boolean | null,
  connectionType: 'unknown' as ConnectionType,
  isOffline: false,
  isWeakConnection: false,
  lastOnlineAt: null as string | null,
  lastOfflineAt: null as string | null,
  reconnectCount: 0,
  bannerMode: 'hidden' as NetworkBannerMode,
};

export const useNetworkStore = create<NetworkState>((set) => ({
  ...initialState,
  setNetworkState: (partial) => set((state) => ({ ...state, ...partial })),
  setBannerMode: (bannerMode) => set({ bannerMode }),
  incrementReconnect: () => set((state) => ({ reconnectCount: state.reconnectCount + 1 })),
  reset: () => set(initialState),
}));

export function getNetworkStore() {
  return useNetworkStore.getState();
}
