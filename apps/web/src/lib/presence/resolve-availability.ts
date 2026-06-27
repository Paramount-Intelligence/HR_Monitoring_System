import { getUserPresence } from './presence-store';
import { resolveOnlineState } from './resolve-online';
import { resolvePresenceStatus } from './resolve-presence';
import {
  getAvailabilityDot,
  type AvailabilityDot,
} from './availability';
import type { OnlineState, PresenceStatus } from './types';

export function resolveAvailabilityDot(
  userId?: string | null,
  fallback?: Partial<{
    presence_status?: PresenceStatus | null;
    online_state?: OnlineState | null;
    is_online?: boolean | null;
  }> | null,
): AvailabilityDot {
  const stored = userId ? getUserPresence(userId) : null;
  const presenceStatus = resolvePresenceStatus(userId, fallback?.presence_status);
  const onlineState = resolveOnlineState(userId, {
    online_state: fallback?.online_state ?? stored?.online_state,
    is_online: fallback?.is_online ?? stored?.is_online,
  });
  const isOnline =
    typeof stored?.is_online === 'boolean'
      ? stored.is_online
      : typeof fallback?.is_online === 'boolean'
        ? fallback.is_online
        : onlineState === 'online';

  return getAvailabilityDot({
    presenceStatus,
    onlineState,
    isOnline,
  });
}
