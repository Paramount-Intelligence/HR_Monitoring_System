import apiClient from '@/lib/api/client';

export interface PresenceHeartbeatResponse {
  user_id: string;
  online_state: 'online' | 'offline';
  is_online: boolean;
  last_seen_at: string | null;
  platforms: string[];
}

const DEVICE_ID_KEY = 'pims_web_device_id';
const HEARTBEAT_INTERVAL_MS = 30_000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatInFlight = false;

export function getWebDeviceId(): string {
  if (typeof window === 'undefined') return 'web-server';
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function sendPresenceHeartbeat(appState: 'foreground' | 'background' = 'foreground') {
  if (heartbeatInFlight) return;
  heartbeatInFlight = true;
  try {
    await apiClient.post<PresenceHeartbeatResponse>('/presence/heartbeat', {
      device_id: getWebDeviceId(),
      platform: 'web',
      app_state: appState,
    });
  } catch {
    // Silent retry on next interval — must not logout or toast.
  } finally {
    heartbeatInFlight = false;
  }
}

export async function sendPresenceOffline() {
  try {
    await apiClient.post('/presence/offline', {
      device_id: getWebDeviceId(),
      platform: 'web',
    });
  } catch {
    // Best effort only.
  }

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const token = localStorage.getItem('access_token');
    if (token && base) {
      const blob = new Blob(
        [JSON.stringify({ device_id: getWebDeviceId(), platform: 'web' })],
        { type: 'application/json' },
      );
      navigator.sendBeacon(`${base}/api/v1/presence/offline`, blob);
    }
  }
}

export function startOnlinePresenceHeartbeat() {
  if (typeof window === 'undefined') return;
  stopOnlinePresenceHeartbeat();
  void sendPresenceHeartbeat('foreground');
  heartbeatTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      void sendPresenceHeartbeat('foreground');
    }
  }, HEARTBEAT_INTERVAL_MS);

  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      void sendPresenceHeartbeat('foreground');
    }
  };
  const onFocus = () => void sendPresenceHeartbeat('foreground');

  window.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onFocus);

  (startOnlinePresenceHeartbeat as typeof startOnlinePresenceHeartbeat & {
    cleanup?: () => void;
  }).cleanup = () => {
    window.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onFocus);
  };
}

export function stopOnlinePresenceHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  const starter = startOnlinePresenceHeartbeat as typeof startOnlinePresenceHeartbeat & {
    cleanup?: () => void;
  };
  starter.cleanup?.();
  starter.cleanup = undefined;
}
