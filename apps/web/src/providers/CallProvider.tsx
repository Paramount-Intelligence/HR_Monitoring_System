'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { messagesApi, Conversation } from '@/lib/api/messages';
import { useCallManager } from '@/hooks/useCallManager';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { GlobalCallUI } from '@/components/calls/GlobalCallUI';

type CallContextValue = ReturnType<typeof useCallManager> & {
  setActiveConversationId: (id: string | null) => void;
  refreshConversations: () => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { showIncomingCallNotification } = useBrowserNotifications();

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await messagesApi.getConversations();
      setConversations(data);
    } catch {
      /* silent */
    }
  }, [user]);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const callManager = useCallManager({
    userId: user?.id,
    conversations,
    activeConv,
    onError: (msg) => toast.error(msg),
    onIncomingCall: showIncomingCallNotification,
  });

  const value = useMemo(
    () => ({
      ...callManager,
      setActiveConversationId,
      refreshConversations,
    }),
    [callManager, refreshConversations]
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {user ? (
        <GlobalCallUI
          call={callManager}
          conversations={conversations}
          userId={user.id}
          userName={user.full_name}
        />
      ) : null}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error('useCall must be used within CallProvider');
  }
  return ctx;
}

export function useCallOptional() {
  return useContext(CallContext);
}
