import axios from 'axios';
import { isDebugAuth } from '@/lib/debug';
import { getApiBaseUrl } from '@/lib/config';

const API_URL = getApiBaseUrl();

export const AUTH_EXPIRED_EVENT = 'pims:auth-expired';

let sessionExpired = false;
let refreshPromise: Promise<string | null> | null = null;
let expiryNotified = false;

export function isSessionExpired(): boolean {
  return sessionExpired;
}

export function resetSessionState(): void {
  sessionExpired = false;
  refreshPromise = null;
  expiryNotified = false;
}

export function clearStoredAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('permissions');
}

export function hasAccessToken(): boolean {
  if (typeof window === 'undefined' || sessionExpired) return false;
  return Boolean(localStorage.getItem('access_token'));
}

export function canFetchProtectedData(): boolean {
  return hasAccessToken();
}

export function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/register') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/activate')
  );
}

export function isAuthHttpError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}

export function markSessionExpired(reason?: string): void {
  if (sessionExpired && expiryNotified) return;

  sessionExpired = true;
  refreshPromise = null;
  clearStoredAuth();

  if (isDebugAuth()) {
    console.warn('[AUTH] Session expired', reason ? `(${reason})` : '');
  }

  if (!expiryNotified && typeof window !== 'undefined') {
    expiryNotified = true;
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

async function performTokenRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const res = await axios.post(
    `${API_URL}/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const { access_token, refresh_token: newRefreshToken } = res.data as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!access_token) {
    throw new Error('Refresh response missing access_token');
  }

  localStorage.setItem('access_token', access_token);
  if (newRefreshToken) {
    localStorage.setItem('refresh_token', newRefreshToken);
  }

  if (isDebugAuth()) {
    console.log('[AUTH] Token refresh succeeded');
  }

  window.dispatchEvent(
    new CustomEvent('pims-token-refreshed', { detail: { access_token } })
  );

  return access_token;
}

/** Single global refresh — concurrent 401s share one in-flight refresh. */
export function enqueueTokenRefresh(): Promise<string | null> {
  if (sessionExpired) {
    return Promise.resolve(null);
  }

  if (!refreshPromise) {
    refreshPromise = performTokenRefresh()
      .then((token) => {
        refreshPromise = null;
        return token;
      })
      .catch(() => {
        refreshPromise = null;
        markSessionExpired('refresh failed');
        return null;
      });
  }

  return refreshPromise;
}
