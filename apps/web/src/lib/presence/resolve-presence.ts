import type { PresenceStatus } from './types';
import { getUserPresence } from './presence-store';

export function resolvePresenceStatus(
  userId?: string | null,
  userPresence?: PresenceStatus | null,
): PresenceStatus | null {
  if (userPresence === 'active' || userPresence === 'away') {
    return userPresence;
  }
  if (!userId) return null;
  const stored = getUserPresence(userId);
  if (stored?.presence_status === 'active' || stored?.presence_status === 'away') {
    return stored.presence_status;
  }
  return null;
}
