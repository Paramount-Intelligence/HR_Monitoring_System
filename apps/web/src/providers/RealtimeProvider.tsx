'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import type { ConnectionStatus, RealtimeEvent } from '@/lib/realtime/events';
import { realtimeClient } from '@/lib/realtime/websocket-client';

interface RealtimeContextValue {
  status: ConnectionStatus;
  isConnected: boolean;
  subscribe: (handler: (event: RealtimeEvent) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('idle');

  useEffect(() => {
    if (!user) {
      realtimeClient.disconnect(true);
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      realtimeClient.disconnect(true);
      return;
    }

    realtimeClient.connect(token);
    const unsubStatus = realtimeClient.onStatus(setStatus);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        if (e.newValue) {
          realtimeClient.connect(e.newValue);
        } else {
          realtimeClient.disconnect(true);
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      unsubStatus();
      window.removeEventListener('storage', onStorage);
      realtimeClient.disconnect(true);
    };
  }, [user?.id]);

  const subscribe = useCallback((handler: (event: RealtimeEvent) => void) => {
    return realtimeClient.onEvent(handler);
  }, []);

  const value = useMemo(
    () => ({
      status,
      isConnected: status === 'connected',
      subscribe,
    }),
    [status, subscribe]
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}

export function useRealtimeStatus() {
  const ctx = useRealtimeContext();
  return {
    status: ctx?.status ?? 'idle',
    isConnected: ctx?.isConnected ?? false,
  };
}

export function useRealtimeEvent(
  types: string | string[],
  handler: (event: RealtimeEvent) => void,
  deps: unknown[] = []
) {
  const typeList = Array.isArray(types) ? types : [types];

  useEffect(() => {
    const listener = (e: Event) => {
      const event = (e as CustomEvent<RealtimeEvent>).detail;
      if (typeList.includes(event.type)) {
        handler(event);
      }
    };
    window.addEventListener('pims-realtime', listener);
    return () => window.removeEventListener('pims-realtime', listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeList.join('|'), ...deps]);
}

export function useRealtimeReconnect(onReconnect: () => void) {
  useEffect(() => {
    const listener = () => onReconnect();
    window.addEventListener('pims-realtime-reconnect', listener);
    return () => window.removeEventListener('pims-realtime-reconnect', listener);
  }, [onReconnect]);
}
