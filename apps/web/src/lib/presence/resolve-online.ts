import { getUserPresence } from './presence-store';
import type { OnlineState } from './types';

export function resolveOnlineState(
  userId?: string | null,
  fallback?: Partial<{ online_state?: OnlineState; is_online?: boolean }> | null,
): OnlineState {
  const stored = userId ? getUserPresence(userId) : null;
  if (stored?.online_state) return stored.online_state;
  if (typeof stored?.is_online === 'boolean') return stored.is_online ? 'online' : 'offline';
  if (fallback?.online_state) return fallback.online_state;
  if (typeof fallback?.is_online === 'boolean') return fallback.is_online ? 'online' : 'offline';
  return 'offline';
}

export function resolveIsOnline(
  userId?: string | null,
  fallback?: Partial<{ online_state?: OnlineState; is_online?: boolean }> | null,
): boolean {
  return resolveOnlineState(userId, fallback) === 'online';
}
