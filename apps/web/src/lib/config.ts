/**
 * Runtime configuration for the web app.
 * Production builds must set NEXT_PUBLIC_API_URL (and ideally NEXT_PUBLIC_WS_URL).
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

/**
 * API base URL for browser requests.
 * Development defaults to same-origin `/api/v1` (Next.js rewrite proxy).
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return stripTrailingSlash(fromEnv);
  }
  if (isDevelopment) {
    return '/api/v1';
  }
  if (isProduction) {
    throw new Error('NEXT_PUBLIC_API_URL is required in production');
  }
  return '/api/v1';
}

/**
 * WebSocket URL for realtime events.
 * Prefer NEXT_PUBLIC_WS_URL; otherwise derive from an absolute NEXT_PUBLIC_API_URL.
 */
export function getWebSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicit) {
    return stripTrailingSlash(explicit);
  }

  const apiUrl = getApiBaseUrl();
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    return `${apiUrl.replace(/^http/, 'ws')}/ws`;
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/v1/ws`;
  }

  if (isDevelopment) {
    const proxy = process.env.API_PROXY_URL?.trim() || 'http://localhost:8000/api/v1';
    const wsBase = proxy.replace(/^http/, 'ws').replace(/\/$/, '');
    return `${wsBase}/ws`;
  }

  if (isProduction) {
    throw new Error(
      'NEXT_PUBLIC_WS_URL is required in production when NEXT_PUBLIC_API_URL is relative'
    );
  }

  return 'ws://localhost:8000/api/v1/ws';
}

export function isAbsoluteApiUrl(): boolean {
  const apiUrl = getApiBaseUrl();
  return apiUrl.startsWith('http://') || apiUrl.startsWith('https://');
}
