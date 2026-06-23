import { isDebugApi, isDebugAuth, isDebugMessages } from '@/lib/debug';
import { isAuthHttpError, isSessionExpired } from '@/lib/auth/session';

/** Log protected fetch failures once, skipping expected auth-expiry noise. */
export function logProtectedFetchError(scope: string, error: unknown): void {
  if (isSessionExpired() || isAuthHttpError(error)) return;

  const code = (error as { code?: string })?.code;
  if (code === 'ERR_SESSION_EXPIRED' || code === 'ERR_NOT_AUTHENTICATED') return;

  if (scope.startsWith('[Messages]') && !isDebugMessages()) return;
  if (scope.startsWith('[Header]') || scope.startsWith('[Sidebar]')) {
    if (!isDebugApi() && !isDebugAuth()) return;
  }

  console.error(scope, error);
}
