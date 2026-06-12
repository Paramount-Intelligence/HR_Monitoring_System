import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import type { ReactNode } from 'react';
import { useAuthStore } from '../auth/auth-store';
import {
  flushPendingDeepLinkAfterAuth,
  handleIncomingDeepLinkUrl,
} from './deep-link-handler';

interface DeepLinkProviderProps {
  children: ReactNode;
}

/** Handles pims:// deep links after auth bootstrap. */
export function DeepLinkProvider({ children }: DeepLinkProviderProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;

    if (isAuthenticated) {
      flushPendingDeepLinkAfterAuth();
    }

    const onUrl = ({ url }: { url: string }) => {
      handleIncomingDeepLinkUrl(url, useAuthStore.getState().isAuthenticated);
    };

    void Linking.getInitialURL().then((url) => {
      if (url) handleIncomingDeepLinkUrl(url, useAuthStore.getState().isAuthenticated);
    });

    const sub = Linking.addEventListener('url', onUrl);
    return () => sub.remove();
  }, [isAuthenticated, isHydrated]);

  return <>{children}</>;
}
