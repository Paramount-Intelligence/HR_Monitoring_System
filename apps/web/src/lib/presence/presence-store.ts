import type { PresenceState, PresenceStatus } from './types';

type Listener = () => void;

const presenceByUserId = new Map<string, PresenceState>();
const listeners = new Set<Listener>();

function normalizeStatus(value: unknown): PresenceStatus | undefined {
  if (value === 'away') return 'away';
  if (value === 'active') return 'active';
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
  const current = presenceByUserId.get(userId);
  const nextStatus = normalizeStatus(state.presence_status) ?? current?.presence_status;
  if (!nextStatus) return;
  presenceByUserId.set(userId, {
    presence_status: nextStatus,
    presence_updated_at: state.presence_updated_at ?? current?.presence_updated_at ?? null,
    last_seen_at: state.last_seen_at ?? current?.last_seen_at ?? null,
  });
  notify();
}

export function hydrateUserPresence(
  userId: string,
  state?: Partial<PresenceState> | null,
) {
  if (!userId) return;
  const status = normalizeStatus(state?.presence_status);
  if (!status) return;
  setUserPresence(userId, {
    presence_status: status,
    presence_updated_at: state?.presence_updated_at ?? null,
    last_seen_at: state?.last_seen_at ?? null,
  });
}

export function getUserPresence(userId?: string | null): PresenceState | null {
  if (!userId) return null;
  return presenceByUserId.get(userId) ?? null;
}

export function setMyPresence(state: PresenceState) {
  notify();
}
