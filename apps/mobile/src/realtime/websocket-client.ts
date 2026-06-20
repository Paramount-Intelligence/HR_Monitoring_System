import { WS_BASE_URL } from '../constants/env';

import { refreshAccessToken } from '../api/client';
import { fetchWsTicket } from '../api/auth.api';

import { getAccessToken, isTokenExpiredOrExpiring } from '../auth/token-service';

import { getNetworkStore } from '../network/network-store';
import { secureLog } from '../utils/secure-log';

import { useRealtimeStore } from './realtime-store';
import { buildWebSocketUrl } from './ws-url';

import type { ConnectionStatus, RealtimeEvent } from './realtime-events';

const MAX_DEDUPE = 2000;

const WS_AUTH_CLOSE_CODE = 1008;

const BACKOFF_MS = [1000, 2000, 5000, 10000];

const TICKET_FAILURE_MESSAGE =
  'Realtime connection unavailable. Reopen the app or check your connection.';

function logWs(message: string): void {
  secureLog('WS_MOBILE', message);
}

function isDeviceOffline(): boolean {
  return getNetworkStore().isOffline;
}

type EventHandler = (event: RealtimeEvent) => void;

type StatusHandler = (status: ConnectionStatus) => void;

class MobileWebSocketClient {
  private ws: WebSocket | null = null;

  private intentionalClose = false;

  private reconnectAttempt = 0;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private pingTimer: ReturnType<typeof setInterval> | null = null;

  private seenEventIds = new Set<string>();

  private eventHandlers = new Set<EventHandler>();

  private statusHandlers = new Set<StatusHandler>();

  private status: ConnectionStatus = 'idle';

  private connectInFlight = false;

  private pausedForOffline = false;

  private ticketFailure = false;

  async connect(): Promise<void> {
    if (this.connectInFlight) {
      logWs('duplicate_connection_prevented=true');
      return;
    }

    if (this.ticketFailure) {
      logWs('ticket_failure_skip_reconnect=true');
      return;
    }

    if (isDeviceOffline()) {
      logWs('offline_skip_reconnect=true');
      this.pausedForOffline = true;
      this.setStatus('disconnected');
      return;
    }

    this.pausedForOffline = false;
    this.connectInFlight = true;

    try {
      let accessToken = await getAccessToken();
      if (!accessToken) return;

      if (isTokenExpiredOrExpiring(accessToken)) {
        logWs('connecting has_token=true (refreshing first)');
        accessToken = await refreshAccessToken();
        if (!accessToken) {
          logWs('token_refresh_failed logout=true');
          return;
        }
        logWs('token_refresh_success=true');
      } else {
        logWs('connecting has_token=true');
      }

      if (this.ws?.readyState === WebSocket.OPEN) {
        logWs('duplicate_connection_prevented=true');
        return;
      }

      this.disconnect(false);
      this.intentionalClose = false;
      this.setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

      const ticket = await fetchWsTicket();
      if (!ticket) {
        this.handleTicketFailure();
        return;
      }

      const url = buildWebSocketUrl(WS_BASE_URL, ticket);

      try {
        this.ws = new WebSocket(url);
      } catch {
        this.handleTicketFailure();
        return;
      }

      this.ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.ticketFailure = false;
        useRealtimeStore.getState().setConnectionError(null);
        this.setStatus('connected');
        logWs('connected');
        this.startPing();
      };

      this.ws.onmessage = (message) => {
        try {
          const data = JSON.parse(String(message.data)) as RealtimeEvent;

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

          logWs(`message type=${data.type}`);
          this.eventHandlers.forEach((handler) => handler(data));
        } catch {
          // ignore malformed payloads
        }
      };

      this.ws.onclose = (event) => {
        this.stopPing();
        logWs(`closed code=${event.code} reason=${event.reason || 'none'}`);

        if (!this.intentionalClose) {
          this.setStatus('disconnected');

          if (event.code === WS_AUTH_CLOSE_CODE) {
            void this.reconnectAfterAuthFailure();
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

  connectWhenOnline(): void {
    if (isDeviceOffline()) return;
    this.pausedForOffline = false;
    this.ticketFailure = false;
    useRealtimeStore.getState().setConnectionError(null);
    logWs('reconnect_on_online=true');
    this.reconnectAttempt = 0;
    void this.connect();
  }

  pauseReconnectForOffline(): void {
    this.pausedForOffline = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    logWs('offline_skip_reconnect=true');
  }

  private async reconnectAfterAuthFailure(): Promise<void> {
    if (isDeviceOffline()) {
      logWs('offline_skip_reconnect=true');
      return;
    }

    const fresh = await refreshAccessToken();
    if (!fresh) {
      logWs('token_refresh_failed logout=true');
      this.disconnect(true);
      return;
    }

    logWs('auth_close_retry=true');
    this.reconnectAttempt = 0;
    await this.connect();
  }

  private handleTicketFailure(): void {
    this.ticketFailure = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    logWs('ticket_fetch_failed=true');
    this.setStatus('disconnected');
    useRealtimeStore.getState().setConnectionError(TICKET_FAILURE_MESSAGE);
  }

  disconnect(intentional = true): void {
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
      this.reconnectAttempt = 0;
      this.pausedForOffline = false;
      this.ticketFailure = false;
      this.seenEventIds.clear();
      this.setStatus('idle');
    }
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'connected';
  }

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || this.ticketFailure) return;
    if (isDeviceOffline() || this.pausedForOffline) {
      logWs('offline_skip_reconnect=true');
      this.setStatus('disconnected');
      return;
    }

    const delay = BACKOFF_MS[Math.min(this.reconnectAttempt, BACKOFF_MS.length - 1)];
    this.reconnectAttempt += 1;
    logWs(`reconnect scheduled ms=${delay}`);

    this.reconnectTimer = setTimeout(() => {
      void this.connect();
    }, delay);
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }
}

export const websocketClient = new MobileWebSocketClient();
