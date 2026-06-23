import type { ConnectionStatus, RealtimeEvent } from './events';
import { ensureFreshAccessToken, isTokenExpiringSoon } from '@/lib/auth/token-utils';
import { isDebugWs } from '@/lib/debug';

const MAX_DEDUPE = 2000;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const WS_AUTH_CLOSE_CODE = 1008;

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
  if (!isDebugWs()) return;
  if (detail) {
    console.log(`[WS] ${message}`, detail);
  } else {
    console.log(`[WS] ${message}`);
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

type WsTicketResult =
  | { ok: true; ticket: string }
  | { ok: false; retryable: boolean; status?: number };

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
  private connectInFlight = false;
  private authRefreshOnCloseAttempted = false;
  private configError = false;

  connect(token: string) {
    void this.connectWithFreshToken(token);
  }

  private async fetchWsTicket(accessToken: string): Promise<WsTicketResult> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const response = await fetch(`${apiUrl}/auth/ws-ticket`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
      });
      if (response.status === 401) {
        return { ok: false, retryable: true, status: 401 };
      }
      if (response.status === 404 || response.status === 405) {
        return { ok: false, retryable: false, status: response.status };
      }
      if (!response.ok) {
        return { ok: false, retryable: response.status >= 500, status: response.status };
      }
      const data = (await response.json()) as { ticket?: string };
      if (!data.ticket) {
        return { ok: false, retryable: false, status: response.status };
      }
      return { ok: true, ticket: data.ticket };
    } catch {
      return { ok: false, retryable: true };
    }
  }

  private async connectWithFreshToken(token: string) {
    if (typeof window === 'undefined') return;
    if (!token || this.connectInFlight || this.configError) return;

    this.connectInFlight = true;

    try {
      let accessToken = token;

      if (isTokenExpiringSoon(accessToken)) {
        logRealtime('connecting with fresh token');
        const fresh = await ensureFreshAccessToken();
        if (!fresh) return;
        accessToken = fresh;
      }

      if (this.ws && this.token === accessToken && this.ws.readyState === WebSocket.OPEN) {
        return;
      }

      this.disconnect(false);
      this.token = accessToken;
      this.intentionalClose = false;
      this.setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

      const baseUrl = resolveWebSocketUrl();
      const ticketResult = await this.fetchWsTicket(accessToken);
      if (!ticketResult.ok) {
        if (ticketResult.status === 401 && !this.authRefreshOnCloseAttempted) {
          this.authRefreshOnCloseAttempted = true;
          const fresh = await ensureFreshAccessToken();
          if (fresh) {
            this.authRefreshOnCloseAttempted = false;
            void this.connectWithFreshToken(fresh);
            return;
          }
        }
        if (!ticketResult.retryable) {
          this.configError = true;
          this.setStatus('disconnected');
          console.warn(
            '[WS] Realtime unavailable. WebSocket ticket endpoint misconfigured — please refresh or contact admin.'
          );
          return;
        }
        this.scheduleReconnect();
        return;
      }
      const url = `${baseUrl}?ticket=${encodeURIComponent(ticketResult.ticket)}`;
      logRealtime('connecting', baseUrl);

      try {
        this.ws = new WebSocket(url);
      } catch {
        this.scheduleReconnect();
        return;
      }

      this.ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.authRefreshOnCloseAttempted = false;
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
          if (CALL_EVENT_TYPES.has(data.type)) {
            logRealtime(`event received: ${data.type}`);
          }
          this.eventHandlers.forEach((handler) => handler(data));
          window.dispatchEvent(new CustomEvent('pims-realtime', { detail: data }));
        } catch {
          // ignore malformed payloads
        }
      };

      this.ws.onclose = (event) => {
        this.stopPing();
        const authRejected = event.code === WS_AUTH_CLOSE_CODE;

        if (!this.intentionalClose) {
          this.setStatus('disconnected');
          logRealtime('disconnected', `code=${event.code}`);

          if (authRejected && !this.authRefreshOnCloseAttempted) {
            this.authRefreshOnCloseAttempted = true;
            void this.reconnectWithRefreshedToken();
            return;
          }

          this.scheduleReconnect();
        } else {
          this.setStatus('idle');
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } finally {
      this.connectInFlight = false;
    }
  }

  private async reconnectWithRefreshedToken() {
    logRealtime('auth rejected, refreshing once');
    const fresh = await ensureFreshAccessToken();
    if (!fresh) {
      this.disconnect(true);
      return;
    }
    logRealtime('reconnecting after refresh');
    this.reconnectAttempt = 0;
    void this.connectWithFreshToken(fresh);
    this.refetchMissedData();
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
      this.authRefreshOnCloseAttempted = false;
      this.configError = false;
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
    if (!this.token || this.intentionalClose || this.configError) return;
    const delay = Math.min(
      INITIAL_BACKOFF_MS * 2 ** this.reconnectAttempt,
      MAX_BACKOFF_MS
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      if (this.token && !this.configError) {
        void this.connectWithFreshToken(this.token);
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
