'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { messagesApi, CallSession, CallSignal, Conversation } from '@/lib/api/messages';
import { getErrorMessage } from '@/lib/api/client';
import { useRealtimeEvent } from '@/hooks/useRealtime';
import {
  playCallEndSound,
  startOutgoingRing,
  startRingtone,
  stopAllCallSounds,
  stopOutgoingRing,
  stopRingtone,
} from '@/lib/calls/sounds';

export type CallRole = 'caller' | 'callee' | null;
export type CallConnectionStatus =
  | 'idle'
  | 'calling'
  | 'incoming'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'failed';

const MISSED_CALL_TIMEOUT_MS = 45000;
const STUN_URL =
  process.env.NEXT_PUBLIC_STUN_URL ||
  process.env.NEXT_PUBLIC_WEBRTC_STUN_URL ||
  'stun:stun.l.google.com:19302';

function parsePayload(payload: unknown): RTCSessionDescriptionInit | RTCIceCandidateInit {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as RTCSessionDescriptionInit;
    } catch {
      return {} as RTCSessionDescriptionInit;
    }
  }
  return (payload || {}) as RTCSessionDescriptionInit;
}

function getDirectChatRecipient(conv: Conversation | null, userId: string | undefined) {
  if (!conv || conv.type !== 'direct' || !userId) return null;
  return conv.participants.find((p) => p.user_id !== userId)?.user ?? null;
}

interface UseCallManagerOptions {
  userId: string | undefined;
  conversations: Conversation[];
  activeConv: Conversation | null;
  onError?: (message: string) => void;
}

export function useCallManager({
  userId,
  conversations,
  activeConv,
  onError,
}: UseCallManagerOptions) {
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [callRole, setCallRole] = useState<CallRole>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localMuted, setLocalMuted] = useState(false);
  const [localVideoDisabled, setLocalVideoDisabled] = useState(false);
  const [iceConnectionState, setIceConnectionState] = useState('new');
  const [connectionStatus, setConnectionStatus] = useState<CallConnectionStatus>('idle');
  const [incomingCallerName, setIncomingCallerName] = useState('');
  const [showPremiumCallModal, setShowPremiumCallModal] = useState(false);
  const [callDurationSec, setCallDurationSec] = useState(0);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const processedSignalIds = useRef<Set<string>>(new Set());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callSessionRef = useRef<CallSession | null>(null);
  const callRoleRef = useRef<CallRole>(null);
  const missedCallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedAtRef = useRef<number | null>(null);

  useEffect(() => {
    callSessionRef.current = callSession;
  }, [callSession]);

  useEffect(() => {
    callRoleRef.current = callRole;
  }, [callRole]);

  const setError = useCallback(
    (msg: string) => {
      onError?.(msg);
    },
    [onError]
  );

  const clearMissedCallTimer = useCallback(() => {
    if (missedCallTimerRef.current) {
      clearTimeout(missedCallTimerRef.current);
      missedCallTimerRef.current = null;
    }
  }, []);

  const clearCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    connectedAtRef.current = null;
    setCallDurationSec(0);
  }, []);

  const handleTeardownCall = useCallback(
    (playEndSound = false) => {
      clearMissedCallTimer();
      clearCallTimer();
      stopAllCallSounds();

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      setCallSession(null);
      setCallRole(null);
      setLocalMuted(false);
      setLocalVideoDisabled(false);
      setIceConnectionState('new');
      setConnectionStatus('ended');
      setIncomingCallerName('');
      pendingCandidates.current = [];
      processedSignalIds.current.clear();

      setLocalStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      setRemoteStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });

      if (playEndSound) playCallEndSound();

      setTimeout(() => setConnectionStatus('idle'), 300);
    },
    [clearCallTimer, clearMissedCallTimer]
  );

  const createPeerConnection = useCallback(
    (session: CallSession, stream: MediaStream, recipientId: string) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: STUN_URL }],
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void messagesApi.sendSignal(session.id, recipientId, 'ice_candidate', event.candidate.toJSON());
        }
      };

      pc.oniceconnectionstatechange = () => {
        setIceConnectionState(pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setConnectionStatus('connected');
          if (!connectedAtRef.current) {
            connectedAtRef.current = Date.now();
            callTimerRef.current = setInterval(() => {
              if (connectedAtRef.current) {
                setCallDurationSec(Math.floor((Date.now() - connectedAtRef.current) / 1000));
              }
            }, 1000);
          }
        } else if (pc.iceConnectionState === 'failed') {
          setConnectionStatus('failed');
          setError('Call connection failed. This may happen on restricted networks.');
        }
      };

      const remoteMediaStream = new MediaStream();
      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          if (!remoteMediaStream.getTracks().some((t) => t.id === track.id)) {
            remoteMediaStream.addTrack(track);
          }
        });
        setRemoteStream(new MediaStream(remoteMediaStream.getTracks()));
      };

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      peerConnectionRef.current = pc;
      return pc;
    },
    [setError]
  );

  const drainPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    while (pendingCandidates.current.length > 0) {
      const cand = pendingCandidates.current.shift();
      if (cand?.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('[Call] ICE candidate error:', e);
        }
      }
    }
  }, []);

  const processSignal = useCallback(
    async (sig: CallSignal | { id?: string; signal_type: string; payload: unknown; sender_id?: string }) => {
      const pc = peerConnectionRef.current;
      const session = callSessionRef.current;
      const role = callRoleRef.current;
      if (!pc || !session || !role) return;

      const sigId = sig.id ? String(sig.id) : `${sig.signal_type}-${JSON.stringify(sig.payload).slice(0, 40)}`;
      if (processedSignalIds.current.has(sigId)) return;
      processedSignalIds.current.add(sigId);

      const payload = parsePayload(sig.payload);

      try {
        if (sig.signal_type === 'offer' && role === 'callee') {
          if (!pc.remoteDescription) {
            setConnectionStatus('connecting');
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await messagesApi.sendSignal(session.id, session.started_by_id, 'answer', answer);
            await drainPendingCandidates(pc);
          }
        } else if (sig.signal_type === 'answer' && role === 'caller') {
          if (!pc.remoteDescription) {
            setConnectionStatus('connecting');
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            await drainPendingCandidates(pc);
            stopOutgoingRing();
          }
        } else if (sig.signal_type === 'ice_candidate') {
          const ice = payload as RTCIceCandidateInit;
          if (pc.remoteDescription && ice.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(ice));
          } else if (ice.candidate) {
            pendingCandidates.current.push(ice);
          }
        } else if (sig.signal_type === 'end') {
          handleTeardownCall(true);
        }
      } catch (err) {
        console.error('[Call] Signal processing failed:', err);
        setError(getErrorMessage(err) || 'Failed to process call signal.');
      }
    },
    [drainPendingCandidates, handleTeardownCall, setError]
  );

  const fetchAndProcessSignals = useCallback(async () => {
    const session = callSessionRef.current;
    const pc = peerConnectionRef.current;
    if (!session || !pc) return;
    try {
      const signals = await messagesApi.getSignals(session.id);
      for (const sig of signals) {
        await processSignal(sig);
      }
    } catch (err) {
      console.error('[Call] Failed to fetch signals:', err);
    }
  }, [processSignal]);

  const handleStartCall = useCallback(
    async (callType: 'voice' | 'video') => {
      if (!activeConv || activeConv.type !== 'direct') {
        setShowPremiumCallModal(true);
        return;
      }
      const recipient = getDirectChatRecipient(activeConv, userId);
      if (!recipient?.id) return;

      let stream: MediaStream | null = null;
      try {
        setError('');
        if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
          setError('This browser does not support audio/video calls.');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        setLocalStream(stream);

        const session = await messagesApi.startCall(activeConv.id, callType);
        setCallSession(session);
        setCallRole('caller');
        setConnectionStatus('calling');
        startOutgoingRing();

        const pc = createPeerConnection(session, stream, recipient.id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await messagesApi.sendSignal(session.id, recipient.id, 'offer', offer);

        clearMissedCallTimer();
        missedCallTimerRef.current = setTimeout(async () => {
          if (callSessionRef.current?.id === session.id && callRoleRef.current === 'caller') {
            try {
              await messagesApi.endCall(session.id);
            } catch {
              /* ignore */
            }
            handleTeardownCall(true);
          }
        }, MISSED_CALL_TIMEOUT_MS);
      } catch (err: unknown) {
        stream?.getTracks().forEach((t) => t.stop());
        setError(getErrorMessage(err) || 'Could not initiate call.');
        handleTeardownCall();
      }
    },
    [activeConv, userId, createPeerConnection, handleTeardownCall, clearMissedCallTimer, setError]
  );

  const handleDeclineCall = useCallback(async () => {
    const session = callSessionRef.current;
    if (!session) return;
    try {
      if (session.started_by_id) {
        await messagesApi.sendSignal(session.id, session.started_by_id, 'end', {});
      }
      await messagesApi.declineCall(session.id);
    } catch (err) {
      console.error('[Call] Decline failed:', err);
    } finally {
      handleTeardownCall(true);
    }
  }, [handleTeardownCall]);

  const handleAcceptCall = useCallback(async () => {
    const session = callSessionRef.current;
    if (!session?.id) {
      setError('Invalid call session.');
      return;
    }

    const callerId = session.started_by_id;
    let stream: MediaStream | null = null;

    try {
      stopRingtone();
      setConnectionStatus('connecting');
      setError('');

      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        setError('This browser does not support audio/video calls.');
        return;
      }

      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: session.call_type === 'video',
      });
      setLocalStream(stream);

      const acceptedSession = await messagesApi.acceptCall(session.id);
      setCallSession(acceptedSession);
      setCallRole('callee');

      createPeerConnection(acceptedSession, stream, callerId);
      await fetchAndProcessSignals();
    } catch (err: unknown) {
      stream?.getTracks().forEach((t) => t.stop());
      setError(getErrorMessage(err) || 'Call could not connect.');
      await handleDeclineCall();
    }
  }, [createPeerConnection, fetchAndProcessSignals, handleDeclineCall, setError]);

  const handleEndCall = useCallback(async () => {
    const session = callSessionRef.current;
    const role = callRoleRef.current;
    if (!session) return;

    const conv = conversations.find((c) => c.id === session.conversation_id) || activeConv;
    const otherParticipant = conv?.participants.find((p) => p.user_id !== userId);
    const recipientId =
      role === 'caller' ? otherParticipant?.user_id : session.started_by_id;

    try {
      if (recipientId) {
        await messagesApi.sendSignal(session.id, recipientId, 'end', {});
      }
      await messagesApi.endCall(session.id);
    } catch (err) {
      console.error('[Call] End call failed:', err);
    } finally {
      handleTeardownCall(true);
    }
  }, [activeConv, conversations, userId, handleTeardownCall]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setLocalMuted(!audioTrack.enabled);
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setLocalVideoDisabled(!videoTrack.enabled);
    }
  }, [localStream]);

  // Realtime: incoming call
  useRealtimeEvent('call_incoming', (ev) => {
    if (callSessionRef.current) return;
    setCallSession({
      id: String(ev.payload.call_session_id),
      conversation_id: String(ev.payload.conversation_id),
      call_type: (ev.payload.call_type as 'voice' | 'video') || 'voice',
      started_by_id: String(ev.actor_id || ''),
      status: 'ringing',
      started_at: null,
      accepted_at: null,
      ended_at: null,
      created_at: ev.timestamp,
    });
    setCallRole('callee');
    setConnectionStatus('incoming');
    setIncomingCallerName(String(ev.payload.started_by_name || 'Someone'));
    startRingtone();
  });

  useRealtimeEvent('call_accepted', (ev) => {
    if (callSessionRef.current?.id === ev.payload.call_session_id) {
      setCallSession((prev) => (prev ? { ...prev, status: 'active' } : prev));
      stopOutgoingRing();
      setConnectionStatus('connecting');
      void fetchAndProcessSignals();
    }
  });

  useRealtimeEvent('call_signal', (ev) => {
    if (callSessionRef.current?.id !== ev.payload.call_session_id) return;
    void processSignal({
      id: String(ev.payload.signal_id || ''),
      signal_type: String(ev.payload.signal_type),
      payload: ev.payload.payload,
      sender_id: String(ev.payload.sender_id || ev.actor_id || ''),
    });
  });

  useRealtimeEvent('call_declined', (ev) => {
    if (callSessionRef.current?.id === ev.payload.call_session_id) {
      handleTeardownCall(true);
    }
  });

  useRealtimeEvent('call_ended', (ev) => {
    if (callSessionRef.current?.id === ev.payload.call_session_id) {
      handleTeardownCall(true);
    }
  });

  useRealtimeEvent('call_missed', (ev) => {
    if (callSessionRef.current?.id === ev.payload.call_session_id) {
      handleTeardownCall(true);
    }
  });

  // Poll incoming calls when no active session (WebSocket fallback)
  useEffect(() => {
    if (callSession) return;
    const interval = setInterval(async () => {
      try {
        const incoming = await messagesApi.getIncomingCall();
        if (incoming && !callSessionRef.current) {
          setCallSession(incoming);
          setCallRole('callee');
          setConnectionStatus('incoming');
          const conv = conversations.find((c) => c.id === incoming.conversation_id);
          const callerPart = conv?.participants.find((p) => p.user_id === incoming.started_by_id);
          setIncomingCallerName(callerPart?.user?.full_name || 'Someone');
          startRingtone();
        }
      } catch {
        /* silent */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [callSession, conversations]);

  // Signal polling — caller always; callee only after peer connection exists
  useEffect(() => {
    if (!callSession) return;
    if (callRole === 'callee' && !peerConnectionRef.current) return;

    const interval = setInterval(() => {
      void fetchAndProcessSignals();
    }, 1000);

    return () => clearInterval(interval);
  }, [callSession, callRole, fetchAndProcessSignals]);

  // Attach media streams to elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      void remoteAudioRef.current.play().catch(() => undefined);
    }
  }, [remoteStream]);

  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) peerConnectionRef.current.close();
      localStream?.getTracks().forEach((t) => t.stop());
      remoteStream?.getTracks().forEach((t) => t.stop());
      stopAllCallSounds();
      clearMissedCallTimer();
      clearCallTimer();
    };
  }, []);

  const currentCallConv =
    conversations.find((c) => c.id === callSession?.conversation_id) || activeConv;
  const otherCallParticipant = getDirectChatRecipient(currentCallConv, userId);
  const otherCallParticipantName =
    otherCallParticipant?.full_name || incomingCallerName || 'Direct Call';

  const isIncomingRinging = connectionStatus === 'incoming';
  const isOutgoingRinging = connectionStatus === 'calling';

  return {
    callSession,
    callRole,
    localStream,
    remoteStream,
    localMuted,
    localVideoDisabled,
    iceConnectionState,
    connectionStatus,
    incomingCallerName,
    otherCallParticipantName,
    isIncomingRinging,
    isOutgoingRinging,
    showPremiumCallModal,
    setShowPremiumCallModal,
    callDurationSec,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    handleStartCall,
    handleAcceptCall,
    handleDeclineCall,
    handleEndCall,
    toggleMute,
    toggleVideo,
  };
}
