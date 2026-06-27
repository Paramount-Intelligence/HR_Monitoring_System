'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { hydrateFromUserLike } from '@/lib/presence/hydrate-presence';
import { setUserOnlineState, setUserPresence } from '@/lib/presence/presence-store';
import { useRealtimeEvent, useRealtimeStatus } from '@/hooks/useRealtime';
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
    }
  }, [isConnected, user?.id]);

  useRealtimeEvent('user_online_state_updated', (event) => {
    const payload = event.payload as {
      user_id?: string;
      online_state?: 'online' | 'offline';
      is_online?: boolean;
      last_seen_at?: string | null;
    };
    const userId = payload.user_id ? String(payload.user_id) : null;
    if (!userId) return;
    setUserOnlineState(userId, {
      online_state: payload.online_state ?? (payload.is_online ? 'online' : 'offline'),
      is_online: Boolean(payload.is_online ?? payload.online_state === 'online'),
      last_seen_at: payload.last_seen_at ?? null,
    });
  });

  useRealtimeEvent('user_presence_updated', (event) => {
    const payload = event.payload as {
      user_id?: string;
      presence_status?: 'active' | 'away';
      presence_updated_at?: string | null;
      last_seen_at?: string | null;
    };
    const userId = payload.user_id ? String(payload.user_id) : null;
    if (!userId) return;
    setUserPresence(userId, {
      presence_status: payload.presence_status,
      presence_updated_at: payload.presence_updated_at,
      last_seen_at: payload.last_seen_at,
    });
  });

  return null;
}
