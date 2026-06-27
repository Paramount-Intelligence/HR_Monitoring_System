'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { hydrateFromUserLike } from '@/lib/presence/hydrate-presence';
import {
  parseUserOnlineStateUpdatedPayload,
  parseUserPresenceUpdatedPayload,
} from '@/lib/presence/parse-realtime-presence';
import { setUserManualPresence, setUserOnlineState } from '@/lib/presence/presence-store';
import { schedulePresenceRefetch } from '@/lib/presence/refetch-presence';
import { useRealtimeEvent, useRealtimeReconnect, useRealtimeStatus } from '@/hooks/useRealtime';
import {
  sendPresenceHeartbeat,
  startOnlinePresenceHeartbeat,
  stopOnlinePresenceHeartbeat,
} from '@/lib/presence/online-presence';
import { useEffect } from 'react';

export function OnlinePresenceListener() {
  const { user, isAuthenticated } = useAuth();
  const { isConnected } = useRealtimeStatus();

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      stopOnlinePresenceHeartbeat();
      return;
    }

    hydrateFromUserLike({
      id: user.id,
      presence_status: user.presence_status,
      presence_updated_at: user.presence_updated_at,
      last_seen_at: user.last_seen_at,
      online_state: user.online_state,
      is_online: user.is_online,
    });
    startOnlinePresenceHeartbeat();
    return () => stopOnlinePresenceHeartbeat();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (isConnected && user?.id) {
      void sendPresenceHeartbeat('foreground');
      schedulePresenceRefetch();
    }
  }, [isConnected, user?.id]);

  useRealtimeReconnect(() => {
    schedulePresenceRefetch();
  });

  useEffect(() => {
    const onFocus = () => schedulePresenceRefetch();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useRealtimeEvent('user_online_state_updated', (event) => {
    const parsed = parseUserOnlineStateUpdatedPayload(event.payload);
    if (!parsed) return;
    setUserOnlineState(parsed.userId, {
      online_state: parsed.onlineState,
      is_online: parsed.isOnline,
      last_seen_at: parsed.lastSeenAt ?? null,
    });
  });

  useRealtimeEvent('user_presence_updated', (event) => {
    const parsed = parseUserPresenceUpdatedPayload(event.payload);
    if (!parsed) return;
    setUserManualPresence(parsed.userId, {
      presence_status: parsed.presenceStatus,
      presence_updated_at: parsed.presenceUpdatedAt,
      last_seen_at: parsed.lastSeenAt,
    });
  });

  return null;
}
