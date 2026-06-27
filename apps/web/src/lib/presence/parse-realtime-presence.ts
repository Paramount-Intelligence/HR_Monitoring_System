import type { PresenceStatus } from './types';

export type ParsedPresenceEvent = {
  userId: string;
  presenceStatus?: PresenceStatus;
  presenceUpdatedAt?: string | null;
  lastSeenAt?: string | null;
};

export function parseUserPresenceUpdatedPayload(
  payload: Record<string, unknown> | null | undefined,
): ParsedPresenceEvent | null {
  if (!payload) return null;
  const userId = payload.user_id ?? payload.userId;
  if (!userId) return null;
  const rawStatus = payload.presence_status ?? payload.presenceStatus;
  const presenceStatus =
    rawStatus === 'active' || rawStatus === 'away' ? rawStatus : undefined;
  return {
    userId: String(userId),
    presenceStatus,
    presenceUpdatedAt:
      (payload.presence_updated_at as string | null | undefined) ??
      (payload.presenceUpdatedAt as string | null | undefined) ??
      null,
    lastSeenAt:
      (payload.last_seen_at as string | null | undefined) ??
      (payload.lastSeenAt as string | null | undefined) ??
      null,
  };
}

export function parseUserOnlineStateUpdatedPayload(
  payload: Record<string, unknown> | null | undefined,
): {
  userId: string;
  onlineState: 'online' | 'offline';
  isOnline: boolean;
  lastSeenAt?: string | null;
} | null {
  if (!payload) return null;
  const userId = payload.user_id ?? payload.userId;
  if (!userId) return null;
  const rawState = payload.online_state ?? payload.onlineState;
  const isOnline = Boolean(payload.is_online ?? payload.isOnline ?? rawState === 'online');
  const onlineState: 'online' | 'offline' =
    rawState === 'online' || isOnline ? 'online' : 'offline';
  return {
    userId: String(userId),
    onlineState,
    isOnline,
    lastSeenAt:
      (payload.last_seen_at as string | null | undefined) ??
      (payload.lastSeenAt as string | null | undefined) ??
      null,
  };
}
