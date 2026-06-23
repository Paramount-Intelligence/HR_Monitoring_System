import { isDebugAuth } from '@/lib/debug';
import {
  canFetchProtectedData,
  enqueueTokenRefresh,
} from '@/lib/auth/session';

const EXP_BUFFER_SEC = 60;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAccessTokenExp(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  return typeof exp === 'number' ? exp : null;
}

export function isTokenExpiringSoon(token: string, withinSeconds = EXP_BUFFER_SEC): boolean {
  const exp = getAccessTokenExp(token);
  if (!exp) return true;
  return exp * 1000 <= Date.now() + withinSeconds * 1000;
}

export async function ensureFreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!canFetchProtectedData()) return null;

  let token = localStorage.getItem('access_token');
  if (!token) return null;

  if (!isTokenExpiringSoon(token)) {
    return token;
  }

  if (isDebugAuth()) {
    console.log('[AUTH] token expiring, refreshing');
  }

  const refreshed = await enqueueTokenRefresh();
  return refreshed;
}
