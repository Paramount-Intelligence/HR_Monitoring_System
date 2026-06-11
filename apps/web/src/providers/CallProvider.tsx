'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { messagesApi, Conversation } from '@/lib/api/messages';
import { useCallManager } from '@/hooks/useCallManager';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { streamHasLiveVideo } from '@/lib/calls/media';
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

function VideoPlaceholder({ label, initial }: { label: string; initial: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 text-white">
      <Avatar className="h-16 w-16 mb-2">
        <AvatarFallback className="text-xl font-black bg-white/10">{initial}</AvatarFallback>
      </Avatar>
      <p className="text-xs font-semibold text-gray-300">{label}</p>
    </div>
  );
}

function GlobalCallOverlays({
  call,
  conversations,
  userId,
  userName,
}: {
  call: ReturnType<typeof useCallManager>;
  conversations: Conversation[];
  userId: string | undefined;
  userName?: string;
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
    localStream,
    remoteStream,
    bindLocalVideoRef,
    bindRemoteVideoRef,
    remoteAudioRef,
    localMuted,
    localVideoDisabled,
    hasLocalAudio,
    hasLocalVideo,
    localCameraUnavailable,
    handleAcceptCall,
    handleDeclineCall,
    handleEndCall,
    toggleMute,
    toggleVideo,
    isRecordingActive,
    mediaWarning,
  } = call;

  const activeConv =
    conversations.find((c) => c.id === callSession?.conversation_id) ?? null;
  const outgoingRecipient = getDirectChatRecipient(activeConv, userId);
  const selfInitial = (userName || 'Y').charAt(0).toUpperCase();
  const remoteInitial = otherCallParticipantName.charAt(0).toUpperCase();

  const showLocalVideo =
    streamHasLiveVideo(localStream) && !localVideoDisabled;
  const showRemoteVideo = streamHasLiveVideo(remoteStream);

  const localPreviewRef = useRef<HTMLVideoElement>(null);
  const remoteMainRef = useRef<HTMLVideoElement>(null);

  const attachLocalPreviewRef = useCallback(
    (node: HTMLVideoElement | null) => {
      localPreviewRef.current = node;
      bindLocalVideoRef(node);
    },
    [bindLocalVideoRef]
  );

  const attachRemoteMainRef = useCallback(
    (node: HTMLVideoElement | null) => {
      remoteMainRef.current = node;
      bindRemoteVideoRef(node);
    },
    [bindRemoteVideoRef]
  );

  useEffect(() => {
    const el = localPreviewRef.current;
    if (!el || !localStream || connectionStatus !== 'connected') return;
    if (el.srcObject !== localStream) {
      el.srcObject = localStream;
      void el.play().catch(() => undefined);
      console.log('[VIDEO_UI] attached local preview stream');
    }
  }, [localStream, connectionStatus, callSession?.id]);

  useEffect(() => {
    const el = remoteMainRef.current;
    if (!el || !remoteStream || connectionStatus !== 'connected') return;
    if (el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
      void el.play().catch(() => undefined);
      console.log('[VIDEO_UI] attached remote video stream');
    }
  }, [remoteStream, connectionStatus, callSession?.id]);

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
        <div className="fixed inset-0 z-[100] flex flex-col justify-between bg-black/95 backdrop-blur-xl p-4 sm:p-6 text-white animate-in fade-in duration-300 overflow-hidden">
          <div className="flex flex-col gap-3 shrink-0 max-w-3xl mx-auto w-full">
            <p className="text-[10px] text-gray-500 text-center">
              This call may be recorded for monitoring, training, and internal review.
            </p>
            {mediaWarning && (
              <p className="text-[10px] text-amber-400 text-center font-semibold">{mediaWarning}</p>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                  {callSession.call_type === 'video' ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black truncate">{otherCallParticipantName}</h3>
                  <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1.5">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0',
                        status === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-amber-400 animate-pulse'
                      )}
                    />
                    {status === 'connected'
                      ? `Connected · ${Math.floor(callDurationSec / 60)
                          .toString()
                          .padStart(2, '0')}:${(callDurationSec % 60).toString().padStart(2, '0')}`
                      : status === 'failed'
                        ? 'Connection failed'
                        : 'Connecting...'}
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
              <Button variant="ghost" size="sm" onClick={handleEndCall} className="text-red-400 hover:text-red-300 shrink-0">
                End
              </Button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0 py-4 w-full max-w-4xl mx-auto">
            {callSession.call_type === 'video' ? (
              <div className="relative w-full aspect-video max-h-[60vh] rounded-2xl overflow-hidden bg-black/50">
                <video
                  ref={attachRemoteMainRef}
                  autoPlay
                  playsInline
                  className={cn('w-full h-full object-cover', !showRemoteVideo && 'opacity-0')}
                />
                {!showRemoteVideo && (
                  <VideoPlaceholder label="Camera off" initial={remoteInitial} />
                )}
                <div className="absolute top-3 left-3 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold text-white/90">
                  {otherCallParticipantName}
                </div>
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-28 h-20 sm:w-36 sm:h-28 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg bg-zinc-900">
                  <video
                    ref={attachLocalPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      'w-full h-full object-cover scale-x-[-1]',
                      !showLocalVideo && 'opacity-0'
                    )}
                  />
                  {!showLocalVideo && (
                    <VideoPlaceholder
                      label={localCameraUnavailable ? 'No camera' : 'Camera off'}
                      initial={selfInitial}
                    />
                  )}
                  <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white/90">
                    You
                  </div>
                </div>
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

          <div className="flex justify-center gap-3 sm:gap-4 shrink-0 pb-2 max-w-lg mx-auto w-full">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              disabled={!hasLocalAudio}
              title={hasLocalAudio ? (localMuted ? 'Unmute' : 'Mute') : 'No microphone available'}
              className={cn('rounded-full h-11 w-11 sm:h-12 sm:w-12', localMuted && 'bg-red-500/20 border-red-400')}
            >
              {localMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            {callSession.call_type === 'video' && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleVideo}
                disabled={!hasLocalVideo && localCameraUnavailable}
                title={
                  !hasLocalVideo
                    ? 'No camera available'
                    : localVideoDisabled
                      ? 'Turn camera on'
                      : 'Turn camera off'
                }
                className={cn(
                  'rounded-full h-11 w-11 sm:h-12 sm:w-12',
                  localVideoDisabled && 'bg-red-500/20 border-red-400'
                )}
              >
                {localVideoDisabled ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            )}
            <Button
              onClick={handleEndCall}
              className="rounded-full h-12 w-12 sm:h-14 sm:w-14 bg-red-600 hover:bg-red-700"
              size="icon"
              title="End call"
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
      <GlobalCallOverlays
        call={callManager}
        conversations={conversations}
        userId={user.id}
        userName={user.full_name}
      />
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
