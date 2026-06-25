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
import {
  getCurrentNotificationPreferences,
  loadNotificationPreferences,
  saveNotificationPreferences,
  subscribeNotificationPreferences,
  resetNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/notifications/notification-preferences';

interface NotificationPreferencesContextValue {
  preferences: NotificationPreferences;
  loading: boolean;
  loaded: boolean;
  refresh: () => Promise<NotificationPreferences>;
  updatePreferences: (patch: Partial<NotificationPreferences>) => Promise<NotificationPreferences>;
}

const NotificationPreferencesContext = createContext<NotificationPreferencesContextValue | null>(
  null
);

export function NotificationPreferencesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    getCurrentNotificationPreferences()
  );
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    return subscribeNotificationPreferences((next) => {
      setPreferences(next);
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadNotificationPreferences();
      setLoaded(true);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (patch: Partial<NotificationPreferences>) => {
    const data = await saveNotificationPreferences(patch);
    setLoaded(true);
    return data;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      resetNotificationPreferences();
      setLoaded(false);
      return;
    }
    void refresh();
  }, [isAuthenticated, refresh]);

  const value = useMemo(
    () => ({ preferences, loading, loaded, refresh, updatePreferences }),
    [preferences, loading, loaded, refresh, updatePreferences]
  );

  return (
    <NotificationPreferencesContext.Provider value={value}>
      {children}
    </NotificationPreferencesContext.Provider>
  );
}

export function useNotificationPreferences() {
  const ctx = useContext(NotificationPreferencesContext);
  if (!ctx) {
    throw new Error('useNotificationPreferences must be used within NotificationPreferencesProvider');
  }
  return ctx;
}
