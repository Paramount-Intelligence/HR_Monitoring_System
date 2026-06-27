import type { PresenceStatus } from './types';
import { getUserPresence } from './presence-store';

/** Store wins over stale API props so realtime updates apply without refresh. */
export function resolvePresenceStatus(
  userId?: string | null,
  userPresence?: PresenceStatus | null,
): PresenceStatus | null {
  if (userId) {
    const stored = getUserPresence(userId);
    if (stored?.presence_status === 'active' || stored?.presence_status === 'away') {
      return stored.presence_status;
    }
  }
  if (userPresence === 'active' || userPresence === 'away') {
    return userPresence;
  }
  return null;
}
