'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isDebugCalls } from '@/lib/debug';
import { messagesApi, CallSession, CallSignal, Conversation } from '@/lib/api/messages';
import { getErrorMessage } from '@/lib/api/client';
import { useRealtimeEvent } from '@/hooks/useRealtime';
import {
  playCallEndSound,
  startRingtone,
  stopAllCallSounds,
  stopRingtone,
} from '@/lib/calls/sounds';
import { buildIceServers } from '@/lib/calls/webrtc-config';
import { getCallMedia, isWebRtcSupported, streamHasAudioTrack, streamHasVideoTrack } from '@/lib/calls/media';
import { createMediaRefCallback } from '@/lib/calls/attach-media-stream';
import { logCallDebug, CALL_REALTIME_EVENTS, logCallEndReason } from '@/lib/calls/call-debug';
import { resolveAcceptFailureAction } from '@/lib/calls/call-ui-utils';
import { shouldFireOutgoingRingTimeout } from '@/lib/calls/call-timer-utils';
import { useCallRecording } from '@/hooks/useCallRecording';

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
const SIGNAL_POLL_MS = 500;
const INCOMING_POLL_MS = 3000;

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
  onIncomingCall?: (params: {
    callId: string;
    callerName: string;
    callType: 'voice' | 'video';
    conversationId: string;
  }) => void;
}

export function useCallManager({
  userId,
  conversations,
  activeConv,
  onError,
  onIncomingCall,
}: UseCallManagerOptions) {
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [callRole, setCallRole] = useState<CallRole>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localMuted, setLocalMuted] = useState(false);
  const [localVideoDisabled, setLocalVideoDisabled] = useState(false);
  const [hasLocalAudio, setHasLocalAudio] = useState(false);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);
  const [localCameraUnavailable, setLocalCameraUnavailable] = useState(false);
  const [localMicrophoneUnavailable, setLocalMicrophoneUnavailable] = useState(false);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);
  const [iceConnectionState, setIceConnectionState] = useState('new');
  const [connectionStatus, setConnectionStatus] = useState<CallConnectionStatus>('idle');
  const [incomingCallerName, setIncomingCallerName] = useState('');
  const [showPremiumCallModal, setShowPremiumCallModal] = useState(false);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [endedCallBrief, setEndedCallBrief] = useState<{
    participantName: string;
    callType: 'voice' | 'video';
  } | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const processedSignalIds = useRef<Set<string>>(new Set());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callSessionRef = useRef<CallSession | null>(null);
  const callRoleRef = useRef<CallRole>(null);
  const connectionStatusRef = useRef<CallConnectionStatus>('idle');
  const missedCallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  const teardownInProgressRef = useRef(false);
  const otherParticipantNameRef = useRef('Direct Call');

  const {
    recordingStatus,
    isRecordingActive,
    stopAndUpload,
    resetRecording,
  } = useCallRecording({
    callId: callSession?.id,
    callType: callSession?.call_type,
    connectionStatus,
    localStream,
    remoteStream,
    onUploadFailed: (message) => {
      onError?.(message);
    },
  });

  useEffect(() => {
    callSessionRef.current = callSession;
  }, [callSession]);

  useEffect(() => {
    callRoleRef.current = callRole;
  }, [callRole]);

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

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
      if (teardownInProgressRef.current) return;
      teardownInProgressRef.current = true;

      const finishTeardown = () => {
        clearMissedCallTimer();
        clearCallTimer();
        stopAllCallSounds();

        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }

        const session = callSessionRef.current;
        if (session) {
          setEndedCallBrief({
            participantName: otherParticipantNameRef.current,
            callType: session.call_type,
          });
          window.setTimeout(() => setEndedCallBrief(null), 2500);
        }

        setCallSession(null);
        setCallRole(null);
      setLocalMuted(false);
      setLocalVideoDisabled(false);
      setHasLocalAudio(false);
      setHasLocalVideo(false);
      setLocalCameraUnavailable(false);
      setLocalMicrophoneUnavailable(false);
      setMediaWarning(null);
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

        resetRecording();

        if (playEndSound) playCallEndSound();

        setTimeout(() => {
          setConnectionStatus('idle');
          teardownInProgressRef.current = false;
        }, 300);
      };

      void stopAndUpload()
        .catch((err) => console.warn('[Call] Recording upload on teardown failed:', err))
        .finally(finishTeardown);
    },
    [clearCallTimer, clearMissedCallTimer, resetRecording, stopAndUpload]
  );

  const createPeerConnection = useCallback(
    (session: CallSession, stream: MediaStream, recipientId: string) => {
      const pc = new RTCPeerConnection({
        iceServers: buildIceServers(),
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          logCallDebug('ICE candidate sent', { callId: session.id, role: callRoleRef.current });
          void messagesApi.sendSignal(session.id, recipientId, 'ice_candidate', event.candidate.toJSON());
        }
      };

      pc.oniceconnectionstatechange = () => {
        setIceConnectionState(pc.iceConnectionState);
        logCallDebug('ICE state', {
          callId: session.id,
          role: callRoleRef.current,
          iceState: pc.iceConnectionState,
          signalingState: pc.signalingState,
          hasLocalDescription: Boolean(pc.localDescription),
          hasRemoteDescription: Boolean(pc.remoteDescription),
        });
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
          logCallEndReason('ice_failed', { callId: session.id, role: callRoleRef.current });
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
            logCallDebug('offer received', { callId: session.id, role });
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            logCallDebug('answer sent', { callId: session.id, role });
            await messagesApi.sendSignal(session.id, session.started_by_id, 'answer', answer);
            await drainPendingCandidates(pc);
          }
        } else if (sig.signal_type === 'answer' && role === 'caller') {
          if (!pc.remoteDescription) {
            setConnectionStatus('connecting');
            clearMissedCallTimer();
            logCallDebug('answer received', { callId: session.id, role });
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            logCallDebug('remote answer applied', { callId: session.id, role });
            await drainPendingCandidates(pc);
          }
        } else if (sig.signal_type === 'ice_candidate') {
          const ice = payload as RTCIceCandidateInit;
          if (pc.remoteDescription && ice.candidate) {
            logCallDebug('ICE candidate received', { callId: session.id, role });
            await pc.addIceCandidate(new RTCIceCandidate(ice));
          } else if (ice.candidate) {
            pendingCandidates.current.push(ice);
            logCallDebug('ICE candidate queued', {
              callId: session.id,
              role,
              queued: pendingCandidates.current.length,
            });
          }
        } else if (sig.signal_type === 'end') {
          logCallEndReason('signal_end', { callId: session.id, role });
          handleTeardownCall(true);
        }
      } catch (err) {
        console.error('[Call] Signal processing failed:', err);
        setError(getErrorMessage(err) || 'Failed to process call signal.');
      }
    },
    [drainPendingCandidates, handleTeardownCall, setError, clearMissedCallTimer]
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

  const applyMediaResult = useCallback(
    (result: Awaited<ReturnType<typeof getCallMedia>>) => {
      setLocalStream(result.stream);
      setHasLocalAudio(result.hasLocalAudio);
      setHasLocalVideo(result.hasLocalVideo);
      setLocalCameraUnavailable(result.localCameraUnavailable);
      setLocalMicrophoneUnavailable(result.localMicrophoneUnavailable);
      setLocalVideoDisabled(!result.hasLocalVideo);
      setLocalMuted(false);
      setMediaWarning(result.warning ?? null);
    },
    [],
  );

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
        logCallDebug('start call clicked', { callType });
        if (!isWebRtcSupported()) {
          setError('This browser does not support audio/video calls.');
          return;
        }

        const media = await getCallMedia(callType);
        stream = media.stream;
        applyMediaResult(media);

        const session = await messagesApi.startCall(activeConv.id, callType);
        logCallDebug('start call API success', { callId: session.id, callType });
        setCallSession(session);
        setCallRole('caller');
        setConnectionStatus('calling');

        const pc = createPeerConnection(session, stream, recipient.id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        logCallDebug('offer created', { callId: session.id, role: 'caller' });
        await messagesApi.sendSignal(session.id, recipient.id, 'offer', offer);
        logCallDebug('offer sent', { callId: session.id, role: 'caller' });

        clearMissedCallTimer();
        missedCallTimerRef.current = setTimeout(async () => {
          if (
            callSessionRef.current?.id === session.id &&
            callRoleRef.current === 'caller' &&
            shouldFireOutgoingRingTimeout(connectionStatusRef.current)
          ) {
            logCallEndReason('no_answer_timeout', { callId: session.id, role: 'caller' });
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
        const msg = getErrorMessage(err) || 'Could not initiate call.';
        logCallDebug('start call failed', { message: msg });
        setError(msg);
        if (callSessionRef.current) {
          handleTeardownCall();
        }
      }
    },
    [activeConv, userId, createPeerConnection, handleTeardownCall, clearMissedCallTimer, setError, applyMediaResult]
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
    if (!callerId) {
      setError('Invalid call session.');
      return;
    }

    let stream: MediaStream | null = null;
    let acceptedOnServer = false;

    try {
      stopRingtone();
      clearMissedCallTimer();
      setConnectionStatus('connecting');
      setError('');
      logCallDebug('accept clicked', { callId: session.id });

      if (!isWebRtcSupported()) {
        setError('This browser does not support audio/video calls.');
        setConnectionStatus('incoming');
        return;
      }

      const media = await getCallMedia(session.call_type === 'video' ? 'video' : 'voice');
      stream = media.stream;

      const acceptedSession = await messagesApi.acceptCall(session.id);
      acceptedOnServer = true;
      logCallDebug('accept API success', {
        callId: session.id,
        status: acceptedSession.status,
      });

      setCallSession(acceptedSession);
      setCallRole('callee');
      applyMediaResult(media);

      createPeerConnection(acceptedSession, stream, callerId);
      await fetchAndProcessSignals();
    } catch (err: unknown) {
      stream?.getTracks().forEach((t) => t.stop());
      const msg = getErrorMessage(err) || 'Call could not connect.';
      logCallDebug('accept failed', {
        callId: session.id,
        acceptedOnServer,
        message: msg,
      });

      const action = resolveAcceptFailureAction(acceptedOnServer);
      if (action === 'end_call') {
        setError(msg);
        try {
          if (callerId) {
            await messagesApi.sendSignal(session.id, callerId, 'end', {});
          }
          await messagesApi.endCall(session.id);
        } catch (endErr) {
          console.warn('[Call] Failed to end call after accept error:', endErr);
        }
        handleTeardownCall(true);
        return;
      }

      setError(msg);
      setConnectionStatus('incoming');
      startRingtone();
    }
  }, [
    clearMissedCallTimer,
    createPeerConnection,
    fetchAndProcessSignals,
    handleTeardownCall,
    setError,
    applyMediaResult,
  ]);

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
    if (!localStream || !streamHasAudioTrack(localStream)) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setLocalMuted(!audioTrack.enabled);
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (!localStream || !streamHasVideoTrack(localStream)) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setLocalVideoDisabled(!videoTrack.enabled);
    }
  }, [localStream]);

  const handleIncomingCallEvent = useCallback(
    (ev: { actor_id?: string | null; payload: Record<string, unknown>; timestamp?: string }) => {
      if (callSessionRef.current) return;
      if (ev.actor_id && userId && String(ev.actor_id) === String(userId)) return;

      const callId = String(ev.payload.call_session_id);
      const conversationId = String(ev.payload.conversation_id);
      const callType = (ev.payload.call_type as 'voice' | 'video') || 'voice';
      const callerName = String(ev.payload.started_by_name || 'Someone');

      logCallDebug('incoming call received', { callId, type: callType });

      setCallSession({
        id: callId,
        conversation_id: conversationId,
        call_type: callType,
        started_by_id: String(ev.actor_id || ''),
        status: 'ringing',
        started_at: null,
        accepted_at: null,
        ended_at: null,
        created_at: ev.timestamp || new Date().toISOString(),
      });
      setCallRole('callee');
      setConnectionStatus('incoming');
      setIncomingCallerName(callerName);
      startRingtone();
      onIncomingCall?.({ callId, callerName, callType, conversationId });
    },
    [userId, onIncomingCall]
  );

  // Realtime: incoming call (backend emits call_incoming; support incoming_call alias)
  useRealtimeEvent(CALL_REALTIME_EVENTS.incoming[0], handleIncomingCallEvent);
  useRealtimeEvent(CALL_REALTIME_EVENTS.incoming[1], handleIncomingCallEvent);

  useRealtimeEvent(CALL_REALTIME_EVENTS.accepted, (ev) => {
    if (callSessionRef.current?.id === ev.payload.call_session_id) {
      clearMissedCallTimer();
      logCallDebug('call accepted event', {
        callId: String(ev.payload.call_session_id),
        role: callRoleRef.current,
      });
      setCallSession((prev) => (prev ? { ...prev, status: 'active' } : prev));
      setConnectionStatus('connecting');
      void fetchAndProcessSignals();
    }
  });

  useRealtimeEvent(CALL_REALTIME_EVENTS.signal, (ev) => {
    if (callSessionRef.current?.id !== ev.payload.call_session_id) return;
    void processSignal({
      id: String(ev.payload.signal_id || ''),
      signal_type: String(ev.payload.signal_type),
      payload: ev.payload.payload,
      sender_id: String(ev.payload.sender_id || ev.actor_id || ''),
    });
  });

  useRealtimeEvent(CALL_REALTIME_EVENTS.declined, (ev) => {
    if (callSessionRef.current?.id === ev.payload.call_session_id) {
      logCallEndReason('remote_declined', { callId: String(ev.payload.call_session_id) });
      handleTeardownCall(true);
    }
  });

  useRealtimeEvent(CALL_REALTIME_EVENTS.ended, (ev) => {
    if (callSessionRef.current?.id === ev.payload.call_session_id) {
      logCallEndReason('remote_ended', { callId: String(ev.payload.call_session_id) });
      handleTeardownCall(true);
    }
  });

  useRealtimeEvent(CALL_REALTIME_EVENTS.missed, (ev) => {
    if (callSessionRef.current?.id === ev.payload.call_session_id) {
      logCallEndReason('remote_missed', { callId: String(ev.payload.call_session_id) });
      handleTeardownCall(true);
    }
  });

  // Poll incoming calls when no active session (WebSocket fallback)
  useEffect(() => {
    if (callSession) return;
    const interval = setInterval(async () => {
      try {
        const incoming = await messagesApi.getIncomingCall();
        if (incoming && !callSessionRef.current && incoming.started_by_id !== userId) {
          setCallSession(incoming);
          setCallRole('callee');
          setConnectionStatus('incoming');
          const conv = conversations.find((c) => c.id === incoming.conversation_id);
          const callerPart = conv?.participants.find((p) => p.user_id === incoming.started_by_id);
          const callerName = callerPart?.user?.full_name || 'Someone';
          setIncomingCallerName(callerName);
          startRingtone();
          onIncomingCall?.({
            callId: incoming.id,
            callerName,
            callType: incoming.call_type,
            conversationId: incoming.conversation_id,
          });
        }
      } catch {
        /* silent */
      }
    }, INCOMING_POLL_MS);
    return () => clearInterval(interval);
  }, [callSession, conversations, userId, onIncomingCall]);

  // Signal polling — caller always; callee only after peer connection exists
  useEffect(() => {
    if (!callSession) return;
    if (callRole === 'callee' && !peerConnectionRef.current) return;

    const interval = setInterval(() => {
      void fetchAndProcessSignals();
    }, SIGNAL_POLL_MS);

    return () => clearInterval(interval);
  }, [callSession, callRole, fetchAndProcessSignals]);

  // Attach media streams when elements mount or streams/status change
  const activeCallUi =
    Boolean(callSession) && connectionStatus !== 'incoming' && connectionStatus !== 'calling';

  useEffect(() => {
    if (!activeCallUi || !localVideoRef.current || !localStream) return;
    if (localVideoRef.current.srcObject !== localStream) {
      localVideoRef.current.srcObject = localStream;
      void localVideoRef.current.play().catch(() => undefined);
      if (isDebugCalls()) {
        console.log('[VIDEO_UI] attached local preview stream');
      }
    }
  }, [localStream, activeCallUi, connectionStatus, callSession?.id]);

  useEffect(() => {
    if (!activeCallUi || !remoteVideoRef.current || !remoteStream) return;
    if (remoteVideoRef.current.srcObject !== remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      void remoteVideoRef.current.play().catch(() => undefined);
      if (isDebugCalls()) {
        console.log('[VIDEO_UI] attached remote video stream');
      }
    }
  }, [remoteStream, activeCallUi, connectionStatus, callSession?.id]);

  useEffect(() => {
    if (!isDebugCalls()) return;
    console.log(
      `[VIDEO_UI] localStream present=${Boolean(localStream)} videoTracks=${localStream?.getVideoTracks().length ?? 0} audioTracks=${localStream?.getAudioTracks().length ?? 0}`
    );
  }, [localStream]);

  useEffect(() => {
    if (!isDebugCalls()) return;
    console.log(
      `[VIDEO_UI] remoteStream present=${Boolean(remoteStream)} videoTracks=${remoteStream?.getVideoTracks().length ?? 0} audioTracks=${remoteStream?.getAudioTracks().length ?? 0}`
    );
  }, [remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      void remoteAudioRef.current.play().catch(() => undefined);
    }
  }, [remoteStream]);

  const bindLocalVideoRef = useCallback(
    createMediaRefCallback(localStream, localVideoRef),
    [localStream]
  );

  const bindRemoteVideoRef = useCallback(
    createMediaRefCallback(remoteStream, remoteVideoRef),
    [remoteStream]
  );

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

  otherParticipantNameRef.current = otherCallParticipantName;

  const isIncomingRinging = connectionStatus === 'incoming';
  const isOutgoingRinging = connectionStatus === 'calling';

  return {
    callSession,
    callRole,
    localStream,
    remoteStream,
    localMuted,
    localVideoDisabled,
    hasLocalAudio,
    hasLocalVideo,
    localCameraUnavailable,
    localMicrophoneUnavailable,
    mediaWarning,
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
    bindLocalVideoRef,
    bindRemoteVideoRef,
    handleStartCall,
    handleAcceptCall,
    handleDeclineCall,
    handleEndCall,
    toggleMute,
    toggleVideo,
    recordingStatus,
    isRecordingActive,
    endedCallBrief,
  };
}
