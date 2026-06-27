import { presenceApi } from '@/lib/api/presence';
import {
  getTrackedPresenceUserIds,
  hydrateUserPresence,
} from '@/lib/presence/presence-store';

let refetchTimer: ReturnType<typeof setTimeout> | null = null;
let refetchInFlight = false;

/** Debounced refetch of tracked users' presence after reconnect or window focus. */
export function schedulePresenceRefetch() {
  if (typeof window === 'undefined') return;
  if (refetchTimer) clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => {
    refetchTimer = null;
    void refetchTrackedPresence();
  }, 800);
}

export async function refetchTrackedPresence() {
  if (refetchInFlight) return;
  const ids = getTrackedPresenceUserIds();
  if (!ids.length) return;
  refetchInFlight = true;
  try {
    const { users } = await presenceApi.getUsersPresence(ids.slice(0, 100));
    for (const [userId, summary] of Object.entries(users)) {
      hydrateUserPresence(userId, {
        presence_status: summary.presence_status,
        presence_updated_at: summary.presence_updated_at,
        last_seen_at: summary.last_seen_at,
        online_state: summary.online_state,
        is_online: summary.is_online,
      });
    }
  } catch {
    // Non-blocking fallback — realtime remains primary.
  } finally {
    refetchInFlight = false;
  }
}
