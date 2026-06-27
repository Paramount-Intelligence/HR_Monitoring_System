import type { OnlineState, PresenceState, PresenceStatus } from './types';

type Listener = () => void;

const presenceByUserId = new Map<string, PresenceState>();
const listeners = new Set<Listener>();

function normalizeStatus(value: unknown): PresenceStatus | undefined {
  if (value === 'away') return 'away';
  if (value === 'active') return 'active';
  return undefined;
}

function normalizeOnlineState(value: unknown): OnlineState | undefined {
  if (value === 'online') return 'online';
  if (value === 'offline') return 'offline';
  return undefined;
}

export function subscribePresence(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function setUserPresence(userId: string, state: Partial<PresenceState>) {
  const current = presenceByUserId.get(userId) ?? {};
  const nextStatus = normalizeStatus(state.presence_status) ?? current.presence_status;
  const nextOnlineState =
    normalizeOnlineState(state.online_state) ??
    (typeof state.is_online === 'boolean'
      ? state.is_online
        ? 'online'
        : 'offline'
      : current.online_state ?? 'offline');
  const nextIsOnline =
    typeof state.is_online === 'boolean' ? state.is_online : nextOnlineState === 'online';

  if (!nextStatus && state.presence_status === undefined && state.online_state === undefined && state.is_online === undefined) {
    return;
  }

  presenceByUserId.set(userId, {
    presence_status: nextStatus,
    presence_updated_at: state.presence_updated_at ?? current.presence_updated_at ?? null,
    last_seen_at: state.last_seen_at ?? current.last_seen_at ?? null,
    online_state: nextOnlineState,
    is_online: nextIsOnline,
  });
  notify();
}

export function setUserOnlineState(
  userId: string,
  state: Pick<PresenceState, 'online_state' | 'is_online' | 'last_seen_at'>,
) {
  setUserPresence(userId, state);
}

export function hydrateUserPresence(
  userId: string,
  state?: Partial<PresenceState> | null,
) {
  if (!userId || !state) return;
  setUserPresence(userId, state);
}

export function getUserPresence(userId?: string | null): PresenceState | null {
  if (!userId) return null;
  return presenceByUserId.get(userId) ?? null;
}

export function clearPresenceStore() {
  presenceByUserId.clear();
  notify();
}
