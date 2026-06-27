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

/** Manual Active/Away — does not touch online connection fields. */
export function setUserManualPresence(
  userId: string,
  state: Pick<PresenceState, 'presence_status' | 'presence_updated_at' | 'last_seen_at'>,
) {
  const current = presenceByUserId.get(userId) ?? {};
  const nextStatus = normalizeStatus(state.presence_status) ?? current.presence_status;
  if (state.presence_status !== undefined && !normalizeStatus(state.presence_status)) {
    return;
  }
  presenceByUserId.set(userId, {
    ...current,
    presence_status: nextStatus,
    presence_updated_at: state.presence_updated_at ?? current.presence_updated_at ?? null,
    last_seen_at: state.last_seen_at ?? current.last_seen_at ?? null,
  });
  notify();
}

/** Live online/offline — does not touch manual presence_status. */
export function setUserOnlineState(
  userId: string,
  state: Pick<PresenceState, 'online_state' | 'is_online' | 'last_seen_at'>,
) {
  const current = presenceByUserId.get(userId) ?? {};
  const nextOnlineState =
    normalizeOnlineState(state.online_state) ??
    (typeof state.is_online === 'boolean'
      ? state.is_online
        ? 'online'
        : 'offline'
      : current.online_state);
  const nextIsOnline =
    typeof state.is_online === 'boolean'
      ? state.is_online
      : nextOnlineState === 'online'
        ? true
        : nextOnlineState === 'offline'
          ? false
          : current.is_online;

  if (
    state.online_state === undefined &&
    state.is_online === undefined &&
    state.last_seen_at === undefined
  ) {
    return;
  }

  presenceByUserId.set(userId, {
    ...current,
    online_state: nextOnlineState ?? current.online_state ?? 'offline',
    is_online: nextIsOnline ?? current.is_online ?? false,
    last_seen_at: state.last_seen_at ?? current.last_seen_at ?? null,
  });
  notify();
}

/** @deprecated Prefer setUserManualPresence or setUserOnlineState for targeted updates. */
export function setUserPresence(userId: string, state: Partial<PresenceState>) {
  const manual: Partial<PresenceState> = {};
  const online: Partial<PresenceState> = {};

  if (state.presence_status !== undefined) {
    manual.presence_status = state.presence_status;
    manual.presence_updated_at = state.presence_updated_at;
    if (state.last_seen_at !== undefined) manual.last_seen_at = state.last_seen_at;
  }
  if (
    state.online_state !== undefined ||
    state.is_online !== undefined ||
    (state.last_seen_at !== undefined && state.presence_status === undefined)
  ) {
    online.online_state = state.online_state;
    online.is_online = state.is_online;
    online.last_seen_at = state.last_seen_at;
  }

  if (Object.keys(manual).length > 0) {
    setUserManualPresence(userId, manual);
  }
  if (Object.keys(online).length > 0) {
    setUserOnlineState(userId, online);
  }
}

export function hydrateUserPresence(
  userId: string,
  state?: Partial<PresenceState> | null,
) {
  if (!userId || !state) return;
  if (state.presence_status !== undefined) {
    setUserManualPresence(userId, {
      presence_status: state.presence_status,
      presence_updated_at: state.presence_updated_at,
      last_seen_at: state.last_seen_at,
    });
  }
  if (state.online_state !== undefined || state.is_online !== undefined) {
    setUserOnlineState(userId, {
      online_state: state.online_state,
      is_online: state.is_online,
      last_seen_at: state.last_seen_at,
    });
  }
}

export function getUserPresence(userId?: string | null): PresenceState | null {
  if (!userId) return null;
  return presenceByUserId.get(userId) ?? null;
}

export function getTrackedPresenceUserIds(): string[] {
  return [...presenceByUserId.keys()];
}

export function clearPresenceStore() {
  presenceByUserId.clear();
  notify();
}
