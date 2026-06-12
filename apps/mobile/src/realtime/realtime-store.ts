import { create } from 'zustand';
import type { ConnectionStatus, RealtimeEvent } from './realtime-events';
import { websocketClient } from './websocket-client';

interface RealtimeState {
  status: ConnectionStatus;
  activeConversationId: string | null;
  setStatus: (status: ConnectionStatus) => void;
  setActiveConversationId: (conversationId: string | null) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'idle',
  activeConversationId: null,
  setStatus: (status) => set({ status }),
  setActiveConversationId: (conversationId) => set({ activeConversationId: conversationId }),
  connect: async () => {
    await websocketClient.connect();
  },
  disconnect: () => {
    websocketClient.disconnect(true);
    set({ status: 'idle', activeConversationId: null });
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
