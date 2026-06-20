import { create } from 'zustand';
import type { ConnectionStatus, RealtimeEvent } from './realtime-events';
import { websocketClient } from './websocket-client';

interface RealtimeState {
  status: ConnectionStatus;
  connectionError: string | null;
  activeConversationId: string | null;
  setStatus: (status: ConnectionStatus) => void;
  setConnectionError: (message: string | null) => void;
  setActiveConversationId: (conversationId: string | null) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'idle',
  connectionError: null,
  activeConversationId: null,
  setStatus: (status) => set({ status }),
  setConnectionError: (connectionError) => set({ connectionError }),
  setActiveConversationId: (conversationId) => set({ activeConversationId: conversationId }),
  connect: async () => {
    set({ connectionError: null });
    await websocketClient.connect();
  },
  disconnect: () => {
    websocketClient.disconnect(true);
    set({ status: 'idle', activeConversationId: null, connectionError: null });
  },
}));

export function subscribeRealtimeEvents(handler: (event: RealtimeEvent) => void): () => void {
  return websocketClient.onEvent(handler);
}

export function subscribeConnectionStatus(handler: (status: ConnectionStatus) => void): () => void {
  return websocketClient.onStatus((status) => {
    useRealtimeStore.getState().setStatus(status);
    handler(status);
  });
}
