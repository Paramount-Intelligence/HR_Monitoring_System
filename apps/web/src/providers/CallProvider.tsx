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
import type { RecordingStatus } from '@/hooks/useCallRecording';
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
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-white">
      <Avatar className="h-20 w-20 mb-3 ring-2 ring-white/20">
        <AvatarFallback className="text-2xl font-black bg-slate-700 text-white">{initial}</AvatarFallback>
      </Avatar>
      <p className="text-sm font-semibold text-slate-300">{label}</p>
    </div>
  );
}

function formatCallTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getConnectionLabel(status: string, durationSec: number): string {
  if (status === 'connected') return `Connected · ${formatCallTimer(durationSec)}`;
  if (status === 'failed') return 'Connection failed';
  if (status === 'connecting') return 'Connecting...';
  return 'Reconnecting...';
}

function RecordingBadge({ status }: { status: RecordingStatus }) {
  if (status === 'preparing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-[11px] font-bold text-amber-200">
        Recording starting...
      </span>
    );
  }
  if (status === 'recording') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-400/50 px-2.5 py-1 text-[11px] font-bold text-red-200">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        Recording
      </span>
    );
  }
  if (status === 'stopping' || status === 'uploading') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/40 px-2.5 py-1 text-[11px] font-bold text-blue-200">
        Recording upload pending...
      </span>
    );
  }
  return null;
}

function CallControlButton({
  onClick,
  disabled,
  active,
  title,
  children,
  variant = 'default',
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'danger'
          ? 'bg-red-600 border-red-500 hover:bg-red-500 text-white shadow-lg shadow-red-900/40'
          : active
            ? 'bg-red-500/25 border-red-400/60 text-white'
            : 'bg-white/10 border-white/25 text-white hover:bg-white/20'
      )}
    >
      {children}
    </button>
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
    recordingStatus,
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
    if (!callSession) return;
    console.log(
      `[CALL_UI] active call_type=${callSession.call_type} status=${connectionStatus}`
    );
  }, [callSession, connectionStatus]);

  useEffect(() => {
    console.log(
      `[CALL_UI] localStream audioTracks=${localStream?.getAudioTracks().length ?? 0} videoTracks=${localStream?.getVideoTracks().length ?? 0}`
    );
  }, [localStream]);

  useEffect(() => {
    console.log(
      `[CALL_UI] remoteStream audioTracks=${remoteStream?.getAudioTracks().length ?? 0} videoTracks=${remoteStream?.getVideoTracks().length ?? 0}`
    );
  }, [remoteStream]);

  useEffect(() => {
    const el = localPreviewRef.current;
    if (!el || !localStream || connectionStatus !== 'connected') return;
    if (el.srcObject !== localStream) {
      el.srcObject = localStream;
      void el.play().catch(() => undefined);
      console.log('[CALL_UI] attached local preview');
    }
  }, [localStream, connectionStatus, callSession?.id]);

  useEffect(() => {
    const el = remoteMainRef.current;
    if (!el || !remoteStream || connectionStatus !== 'connected') return;
    if (el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
      void el.play().catch(() => undefined);
      console.log('[CALL_UI] attached remote media');
    }
  }, [remoteStream, connectionStatus, callSession?.id]);

  useEffect(() => {
    if (!showLocalVideo && callSession?.call_type === 'video') {
      console.log('[CALL_UI] camera_off_placeholder shown side=local');
    }
  }, [showLocalVideo, callSession?.call_type]);

  useEffect(() => {
    if (!showRemoteVideo && callSession?.call_type === 'video') {
      console.log('[CALL_UI] camera_off_placeholder shown side=remote');
    }
  }, [showRemoteVideo, callSession?.call_type]);

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
        <div className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white animate-in fade-in duration-300 overflow-hidden">
          {/* Header */}
          <div className="shrink-0 px-4 sm:px-8 pt-5 sm:pt-8 pb-4 max-w-5xl mx-auto w-full">
            <p className="text-center text-xs text-slate-400 mb-4">
              This call is being recorded for internal review.
            </p>
            {mediaWarning && (
              <p className="text-center text-xs text-amber-300 font-semibold mb-3">{mediaWarning}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <RecordingBadge status={recordingStatus} />
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border',
                  status === 'connected'
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                    : status === 'failed'
                      ? 'bg-red-500/15 border-red-400/40 text-red-200'
                      : 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'
                  )}
                />
                {getConnectionLabel(status, callDurationSec)}
              </span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex items-center justify-center min-h-0 px-4 sm:px-8 w-full max-w-5xl mx-auto">
            {callSession.call_type === 'video' ? (
              <div className="relative w-full aspect-video max-h-[62vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 bg-slate-950">
                <video
                  ref={attachRemoteMainRef}
                  autoPlay
                  playsInline
                  className={cn('absolute inset-0 w-full h-full object-cover', !showRemoteVideo && 'opacity-0')}
                />
                {!showRemoteVideo && (
                  <VideoPlaceholder label="Camera off" initial={remoteInitial} />
                )}
                <div className="absolute top-3 left-3 rounded-lg bg-black/70 backdrop-blur px-3 py-1.5 text-xs font-bold text-white">
                  {otherCallParticipantName}
                </div>
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-32 h-24 sm:w-40 sm:h-28 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl bg-slate-900 z-10">
                  <video
                    ref={attachLocalPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      'absolute inset-0 w-full h-full object-cover scale-x-[-1]',
                      !showLocalVideo && 'opacity-0'
                    )}
                  />
                  {!showLocalVideo && (
                    <VideoPlaceholder
                      label={localCameraUnavailable ? 'No camera' : 'Camera off'}
                      initial={selfInitial}
                    />
                  )}
                  <div className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white z-20">
                    You
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-5 w-full max-w-sm">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl scale-110" />
                  <Avatar className="relative h-36 w-36 sm:h-44 sm:w-44 ring-4 ring-white/15 shadow-2xl">
                    <AvatarFallback className="text-5xl sm:text-6xl font-black bg-gradient-to-br from-slate-700 to-slate-900 text-white">
                      {remoteInitial}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {otherCallParticipantName}
                  </h2>
                  <p className="text-sm text-slate-400 font-semibold uppercase tracking-widest">
                    Voice Call
                  </p>
                </div>
                <p className="text-lg font-mono text-emerald-300 tabular-nums">
                  {status === 'connected' ? formatCallTimer(callDurationSec) : getConnectionLabel(status, callDurationSec)}
                </p>
              </div>
            )}
          </div>

          {/* Control dock */}
          <div className="shrink-0 px-4 sm:px-8 pb-6 sm:pb-10 pt-4">
            <div className="mx-auto flex max-w-md items-center justify-center gap-4 sm:gap-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md px-6 py-5">
              <CallControlButton
                onClick={toggleMute}
                disabled={!hasLocalAudio}
                active={localMuted}
                title={hasLocalAudio ? (localMuted ? 'Unmute' : 'Mute') : 'No microphone'}
              >
                {localMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </CallControlButton>
              {callSession.call_type === 'video' && (
                <CallControlButton
                  onClick={toggleVideo}
                  disabled={!hasLocalVideo && localCameraUnavailable}
                  active={localVideoDisabled}
                  title={
                    !hasLocalVideo
                      ? 'No camera'
                      : localVideoDisabled
                        ? 'Turn camera on'
                        : 'Turn camera off'
                  }
                >
                  {localVideoDisabled ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </CallControlButton>
              )}
              <CallControlButton onClick={handleEndCall} title="End call" variant="danger">
                <PhoneOff className="h-6 w-6" />
              </CallControlButton>
            </div>
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
