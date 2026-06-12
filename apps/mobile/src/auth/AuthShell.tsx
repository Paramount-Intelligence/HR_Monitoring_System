import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from './auth-store';
import { LoadingState } from '../components/ui/LoadingState';

interface AuthShellProps {
  children: ReactNode;
}

/** Redirects unauthenticated users to login before rendering protected stacks. */
export function AuthShell({ children }: AuthShellProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) {
    return <LoadingState message="Loading…" fullScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <>{children}</>;
}
