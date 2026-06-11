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
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { messagesApi, Conversation } from '@/lib/api/messages';
import { useCallManager } from '@/hooks/useCallManager';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CallContextValue = ReturnType<typeof useCallManager> & {
  setActiveConversationId: (id: string | null) => void;
  refreshConversations: () => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

function getDirectChatRecipient(conv: Conversation | null, userId: string | undefined) {
  if (!conv || conv.type !== 'direct' || !userId) return null;
  return conv.participants.find((p) => p.user_id !== userId)?.user ?? null;
}

function GlobalCallOverlays({
  call,
  conversations,
  userId,
}: {
  call: ReturnType<typeof useCallManager>;
  conversations: Conversation[];
  userId: string | undefined;
}) {
  const router = useRouter();
  const {
    callSession,
    isIncomingRinging,
    isOutgoingRinging,
    incomingCallerName,
    otherCallParticipantName,
    connectionStatus,
    callDurationSec,
    connectionStatus: status,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    localMuted,
    localVideoDisabled,
    isRecordingActive,
    handleAcceptCall,
    handleDeclineCall,
    handleEndCall,
    toggleMute,
    toggleVideo,
  } = call;

  const activeConv =
    conversations.find((c) => c.id === callSession?.conversation_id) ?? null;
  const outgoingRecipient = getDirectChatRecipient(activeConv, userId);

  useEffect(() => {
    const onNavigate = (e: Event) => {
      const route = (e as CustomEvent<{ route: string }>).detail?.route;
      if (route) router.push(route);
    };
    window.addEventListener('pims-navigate', onNavigate);
    return () => window.removeEventListener('pims-navigate', onNavigate);
  }, [router]);

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {isIncomingRinging && callSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-card)] text-center space-y-6">
            <div className="relative mx-auto h-20 w-20 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center border border-[var(--accent-primary)]/20 animate-pulse">
              <Avatar className="h-16 w-16 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-secondary)] text-xl font-black text-white">
                  {incomingCallerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Incoming {callSession.call_type === 'video' ? 'video' : 'voice'} call
              </p>
              <h3 className="text-lg font-black text-[var(--text-primary)]">{incomingCallerName}</h3>
              <p className="text-xs text-[var(--text-secondary)] font-semibold">is calling you...</p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={handleDeclineCall}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <PhoneOff className="h-4 w-4" /> Decline
              </Button>
              <Button
                onClick={() => {
                  if (callSession.conversation_id) {
                    router.push(`/messages?conversation_id=${callSession.conversation_id}`);
                  }
                  void handleAcceptCall();
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Phone className="h-4 w-4" /> Accept
              </Button>
            </div>
          </div>
        </div>
      )}

      {isOutgoingRinging && callSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-card)] text-center space-y-6">
            <div className="relative mx-auto h-20 w-20 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center border border-[var(--accent-primary)]/20 animate-pulse">
              <Avatar className="h-16 w-16 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-secondary)] text-xl font-black text-white">
                  {(outgoingRecipient?.full_name || 'P').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Calling...</p>
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                {outgoingRecipient?.full_name || otherCallParticipantName || 'Team Member'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-semibold">Connecting...</p>
            </div>
            <Button
              onClick={handleEndCall}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <PhoneOff className="h-4 w-4" /> Cancel Call
            </Button>
          </div>
        </div>
      )}

      {callSession && !isIncomingRinging && !isOutgoingRinging && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-between bg-black/95 backdrop-blur-xl p-6 text-white animate-in fade-in duration-300">
          <div className="flex flex-col gap-4 shrink-0">
            <p className="text-[10px] text-gray-500 text-center max-w-lg mx-auto">
              This call may be recorded for monitoring, training, and internal review.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-[var(--accent-primary)]">
                  {callSession.call_type === 'video' ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-black">{otherCallParticipantName}</h3>
                  <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1.5">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        status === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-amber-400 animate-pulse'
                      )}
                    />
                    {status === 'connected'
                      ? `Connected · ${Math.floor(callDurationSec / 60)
                          .toString()
                          .padStart(2, '0')}:${(callDurationSec % 60).toString().padStart(2, '0')}`
                      : status === 'failed'
                        ? 'Connection failed'
                        : 'Connecting audio...'}
                  </p>
                  {isRecordingActive && (
                    <p
                      className="text-[10px] font-bold text-red-400 flex items-center gap-1.5 mt-1"
                      title="This call is being recorded and may be reviewed by administrators."
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      Recording
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleEndCall} className="text-red-400 hover:text-red-300">
                End
              </Button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0">
            {callSession.call_type === 'video' ? (
              <div className="relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden bg-black/50">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-4 right-4 w-32 h-24 rounded-xl object-cover border-2 border-white/20"
                />
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="h-24 w-24 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                  <Phone className="h-10 w-10" />
                </div>
                <p className="text-sm text-gray-300">{connectionStatus === 'connected' ? 'On call' : 'Connecting...'}</p>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4 shrink-0 pb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              className={cn('rounded-full h-12 w-12', localMuted && 'bg-red-500/20 border-red-400')}
            >
              {localMuted ? 'Unmute' : 'Mute'}
            </Button>
            {callSession.call_type === 'video' && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleVideo}
                className={cn('rounded-full h-12 w-12', localVideoDisabled && 'bg-red-500/20 border-red-400')}
              >
                {localVideoDisabled ? 'Video on' : 'Video off'}
              </Button>
            )}
            <Button
              onClick={handleEndCall}
              className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700"
              size="icon"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

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

  if (!user) {
    return <>{children}</>;
  }

  return (
    <CallContext.Provider value={value}>
      {children}
      <GlobalCallOverlays call={callManager} conversations={conversations} userId={user.id} />
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
