import { create } from 'zustand';
import { router } from 'expo-router';
import type { QueryClient } from '@tanstack/react-query';
import { setUnauthorizedHandler, getErrorMessage, refreshAccessToken } from '../api/client';
import { manageQueryKeys, reportQueryKeys } from '../constants/query-keys';
import { loginRequest, logoutRequest } from '../api/auth.api';
import { getMe } from '../api/user.api';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isTokenExpiredOrExpiring,
  saveTokens,
} from './token-service';
import { clearPersistedQueryCache } from '../query/query-client';
import {
  clearAllOfflineQueueStorage,
} from '../offline/offline-queue-store';
import { websocketClient } from '../realtime/websocket-client';
import { clearCallStateOnLogout } from '../calls/call-store';
import {
  clearPushRegistrationCache,
  unregisterPushToken,
} from '../notifications/notifications-service';
import { flushPendingDeepLinkAfterAuth } from '../linking/deep-link-handler';
import type { User } from '../types/user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  bootstrapAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

let appQueryClient: QueryClient | null = null;

export function setAppQueryClient(client: QueryClient): void {
  appQueryClient = client;
}

function clearUserOfflineState(): void {
  void clearAllOfflineQueueStorage();
  void clearPersistedQueryCache();
  if (appQueryClient) {
    appQueryClient.clear();
  }
}

function clearManageQueryCache(): void {
  if (!appQueryClient) return;
  for (const key of manageQueryKeys) {
    appQueryClient.removeQueries({ queryKey: key });
  }
  for (const key of reportQueryKeys) {
    appQueryClient.removeQueries({ queryKey: key });
  }
  appQueryClient.removeQueries({ queryKey: ['users'] });
  appQueryClient.removeQueries({ queryKey: ['attendance', 'team'] });
}

export const useAuthStore = create<AuthState>((set) => {
  setUnauthorizedHandler(() => {
    set({ user: null, isAuthenticated: false, error: null });
    router.replace('/(auth)/login');
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isHydrated: false,
    error: null,

    clearError: () => set({ error: null }),

    loadCurrentUser: async () => {
      const user = await getMe();
      set({ user, isAuthenticated: true });
    },

    setUser: (user) => set({ user, isAuthenticated: true }),

    bootstrapAuth: async () => {
      set({ isLoading: true, error: null });
      try {
        const accessToken = await getAccessToken();
        const refreshToken = await getRefreshToken();

        if (!accessToken || !refreshToken) {
          set({
            user: null,
            isAuthenticated: false,
            isHydrated: true,
            isLoading: false,
          });
          return;
        }

        if (isTokenExpiredOrExpiring(accessToken)) {
          const newToken = await refreshAccessToken();
          if (!newToken) {
            await clearTokens();
            set({
              user: null,
              isAuthenticated: false,
              isHydrated: true,
              isLoading: false,
            });
            return;
          }
        }

        const user = await getMe();
        set({
          user,
          isAuthenticated: true,
          isHydrated: true,
          isLoading: false,
        });
        flushPendingDeepLinkAfterAuth();
      } catch {
        await clearTokens();
        set({
          user: null,
          isAuthenticated: false,
          isHydrated: true,
          isLoading: false,
        });
      }
    },

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const trimmedEmail = email.trim().toLowerCase();
        const response = await loginRequest({ email: trimmedEmail, password });
        await saveTokens(response.access_token, response.refresh_token);
        const user = await getMe();
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        router.replace('/(tabs)');
        flushPendingDeepLinkAfterAuth();
      } catch (error) {
        set({
          isLoading: false,
          error: getErrorMessage(error, 'Invalid email or password.'),
          isAuthenticated: false,
          user: null,
        });
        throw error;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        await unregisterPushToken();
        await logoutRequest();
      } finally {
        websocketClient.disconnect(true);
        clearCallStateOnLogout();
        clearPushRegistrationCache();
        clearManageQueryCache();
        clearUserOfflineState();
        await clearTokens();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        router.replace('/(auth)/login');
      }
    },
  };
});

export function useAuthUser(): User | null {
  return useAuthStore((state) => state.user);
}
