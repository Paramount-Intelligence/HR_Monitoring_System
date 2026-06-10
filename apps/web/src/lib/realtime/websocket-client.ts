import type { ConnectionStatus, RealtimeEvent } from './events';

const MAX_DEDUPE = 2000;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const DEV = process.env.NODE_ENV === 'development';

const CALL_EVENT_TYPES = new Set([
  'call_incoming',
  'incoming_call',
  'call_accepted',
  'call_declined',
  'call_ended',
  'call_missed',
  'call_failed',
  'call_signal',
  'call_ringing',
]);

function logRealtime(message: string, detail?: string) {
  if (!DEV) return;
  if (detail) {
    console.log(`[Realtime] ${message}`, detail);
  } else {
    console.log(`[Realtime] ${message}`);
  }
}

export function resolveWebSocketUrl(): string {
  if (typeof window === 'undefined') return '';

  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    const wsBase = apiUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    return `${wsBase}/ws`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/v1/ws`;
}

type EventHandler = (event: RealtimeEvent) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export class RealtimeWebSocketClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private intentionalClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private seenEventIds = new Set<string>();
  private eventHandlers = new Set<EventHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private status: ConnectionStatus = 'idle';

  connect(token: string) {
    if (typeof window === 'undefined') return;
    if (!token) return;

    if (this.ws && this.token === token && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.disconnect(false);
    this.token = token;
    this.intentionalClose = false;
    this.setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    const baseUrl = resolveWebSocketUrl();
    const url = `${baseUrl}?token=${encodeURIComponent(token)}`;
    logRealtime('WS URL:', baseUrl);

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setStatus('connected');
      logRealtime('connected');
      this.startPing();
    };

    this.ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data as string) as RealtimeEvent;
        if (data.type === 'ping') {
          this.send({ type: 'pong' });
          return;
        }
        if (data.type === 'pong' || data.type === 'connected') {
          return;
        }
        if (data.event_id && this.seenEventIds.has(data.event_id)) {
          return;
        }
        if (data.event_id) {
          this.seenEventIds.add(data.event_id);
          if (this.seenEventIds.size > MAX_DEDUPE) {
            const first = this.seenEventIds.values().next().value;
            if (first) this.seenEventIds.delete(first);
          }
        }
        if (DEV && CALL_EVENT_TYPES.has(data.type)) {
          logRealtime(`event received: ${data.type}`);
        }
        this.eventHandlers.forEach((handler) => handler(data));
        window.dispatchEvent(new CustomEvent('pims-realtime', { detail: data }));
      } catch {
        // ignore malformed payloads
      }
    };

    this.ws.onclose = () => {
      this.stopPing();
      if (!this.intentionalClose) {
        this.setStatus('disconnected');
        logRealtime('disconnected');
        this.scheduleReconnect();
      } else {
        this.setStatus('idle');
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(intentional = true) {
    this.intentionalClose = intentional;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    if (intentional) {
      this.token = null;
      this.reconnectAttempt = 0;
      this.setStatus('idle');
    }
  }

  onEvent(handler: EventHandler) {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  getStatus() {
    return this.status;
  }

  isConnected() {
    return this.status === 'connected';
  }

  refetchMissedData() {
    window.dispatchEvent(new CustomEvent('pims-realtime-reconnect'));
  }

  private send(payload: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, 25000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (!this.token || this.intentionalClose) return;
    const delay = Math.min(
      INITIAL_BACKOFF_MS * 2 ** this.reconnectAttempt,
      MAX_BACKOFF_MS
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
        this.refetchMissedData();
      }
    }, delay);
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
    window.dispatchEvent(
      new CustomEvent('pims-realtime-status', { detail: { status } })
    );
  }
}

export const realtimeClient = new RealtimeWebSocketClient();
