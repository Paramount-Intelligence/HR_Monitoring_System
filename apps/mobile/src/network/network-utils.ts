import type { NetInfoState } from '@react-native-community/netinfo';

export type ConnectionType =
  | 'wifi'
  | 'cellular'
  | 'ethernet'
  | 'bluetooth'
  | 'wimax'
  | 'vpn'
  | 'other'
  | 'unknown'
  | 'none';

export function mapConnectionType(type: NetInfoState['type']): ConnectionType {
  if (type === 'wifi' || type === 'cellular' || type === 'ethernet') return type;
  if (type === 'bluetooth' || type === 'wimax' || type === 'vpn') return type;
  if (type === 'none') return 'none';
  if (type === 'other') return 'other';
  return 'unknown';
}

export function deriveNetworkFlags(state: NetInfoState): {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  isWeakConnection: boolean;
} {
  const isConnected = state.isConnected ?? false;
  const isInternetReachable = state.isInternetReachable ?? null;

  const isOffline = !isConnected || isInternetReachable === false;
  const isWeakConnection =
    isConnected && !isOffline && (isInternetReachable === null || state.type === 'cellular');

  return { isConnected, isInternetReachable, isOffline, isWeakConnection };
}
