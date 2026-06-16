import * as Linking from 'expo-linking';
import { router } from 'expo-router';

let pendingPath: string | null = null;

/** Store route to open after login when a deep link arrives while logged out. */
export function setPendingDeepLinkPath(path: string | null): void {
  pendingPath = path;
}

export function consumePendingDeepLinkPath(): string | null {
  const next = pendingPath;
  pendingPath = null;
  return next;
}

const APP_SCHEME = 'pims';

/** Expo dev client / Metro launch URLs — not in-app navigation targets. */
function shouldIgnoreDeepLinkUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (!lower.trim()) return true;
  if (lower.startsWith('exp+')) return true;
  if (lower.startsWith('exp://')) return true;
  if (lower.includes('expo-development-client')) return true;
  if (lower.includes('expo-go')) return true;
  return false;
}

function isAppSchemeDeepLink(url: string): boolean {
  try {
    const parsed = Linking.parse(url);
    const scheme = (parsed.scheme ?? '').toLowerCase();
    return scheme === APP_SCHEME;
  } catch {
    return false;
  }
}

/**
 * Parse pims:// URLs into expo-router paths.
 * Examples:
 *   pims://chat/abc → /chat/abc
 *   pims://alerts → /alerts
 *   pims://manage/approvals/xyz → /manage/approval/xyz
 */
export function parseDeepLinkUrl(url: string): string | null {
  if (shouldIgnoreDeepLinkUrl(url)) return null;
  if (!isAppSchemeDeepLink(url)) return null;

  try {
    const parsed = Linking.parse(url);
    const host = parsed.hostname ?? '';
    const path = parsed.path ?? '';
    const segments = [host, path.replace(/^\//, '')].filter(Boolean).join('/');
    const normalized = segments.replace(/\/+/g, '/');

    if (!normalized || normalized === '--/') return null;

    if (normalized === 'dashboard' || normalized === '') {
      return '/(tabs)';
    }
    if (normalized === 'alerts' || normalized === 'notifications') {
      return '/alerts';
    }
    if (normalized === 'attendance') {
      return '/(tabs)/attendance';
    }
    if (normalized === 'profile') {
      return '/(tabs)/profile';
    }
    if (normalized.startsWith('chat/')) {
      const conversationId = normalized.slice('chat/'.length);
      if (conversationId) return `/chat/${conversationId}`;
    }
    if (normalized.startsWith('manage/approvals/')) {
      const approvalId = normalized.slice('manage/approvals/'.length);
      if (approvalId) return `/manage/approval/${approvalId}`;
    }
    if (normalized === 'manage' || normalized.startsWith('manage/')) {
      return '/manage/users';
    }
    if (normalized.startsWith('reports')) {
      return '/reports';
    }

    return `/${normalized}`;
  } catch {
    return null;
  }
}

export function navigateDeepLinkPath(path: string): void {
  router.push(path as never);
}

export function handleIncomingDeepLinkUrl(
  url: string,
  isAuthenticated: boolean
): void {
  const path = parseDeepLinkUrl(url);
  if (!path) return;

  if (!isAuthenticated) {
    setPendingDeepLinkPath(path);
    return;
  }

  navigateDeepLinkPath(path);
}

export function flushPendingDeepLinkAfterAuth(): void {
  const path = consumePendingDeepLinkPath();
  if (path) {
    navigateDeepLinkPath(path);
  }
}
