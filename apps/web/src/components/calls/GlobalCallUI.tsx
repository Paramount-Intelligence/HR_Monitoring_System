'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { useCallManager } from '@/hooks/useCallManager';
import type { Conversation } from '@/lib/api/messages';
import { streamHasLiveVideo } from '@/lib/calls/media';
import { IncomingCallModal } from './IncomingCallModal';
import { OutgoingCallModal } from './OutgoingCallModal';
import { ActiveAudioCallModal } from './ActiveAudioCallModal';
import { ActiveVideoCallModal } from './ActiveVideoCallModal';
import { CallEndedModal } from './CallEndedModal';

function getDirectChatRecipient(conv: Conversation | null, userId: string | undefined) {
  if (!conv || conv.type !== 'direct' || !userId) return null;
  return conv.participants.find((p) => p.user_id !== userId)?.user ?? null;
}

interface GlobalCallUIProps {
  call: ReturnType<typeof useCallManager>;
  conversations: Conversation[];
  userId: string | undefined;
  userName?: string;
}

export function GlobalCallUI({ call, conversations, userId, userName }: GlobalCallUIProps) {
  const router = useRouter();
  const {
    callSession,
    isIncomingRinging,
    isOutgoingRinging,
    incomingCallerName,
    otherCallParticipantName,
    connectionStatus,
    iceConnectionState,
    callDurationSec,
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
    isRecordingActive,
    mediaWarning,
    endedCallBrief,
  } = call;

  const activeConv = conversations.find((c) => c.id === callSession?.conversation_id) ?? null;
  const outgoingRecipient = getDirectChatRecipient(activeConv, userId);
  const selfInitial = (userName || 'Y').charAt(0).toUpperCase();
  const remoteInitial = otherCallParticipantName.charAt(0).toUpperCase();

  const showLocalVideo = streamHasLiveVideo(localStream) && !localVideoDisabled;
  const showRemoteVideo = streamHasLiveVideo(remoteStream);

  const isActiveCall =
    Boolean(callSession) && !isIncomingRinging && !isOutgoingRinging;

  useEffect(() => {
    if (!callSession) return;
    console.log(
      `[CALL_UI] active call_type=${callSession.call_type} status=${connectionStatus}`
    );
  }, [callSession, connectionStatus]);

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
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" aria-hidden />

      {endedCallBrief && !callSession && (
        <CallEndedModal
          participantName={endedCallBrief.participantName}
          callType={endedCallBrief.callType}
        />
      )}

      {isIncomingRinging && callSession && (
        <IncomingCallModal
          callerName={incomingCallerName}
          callType={callSession.call_type}
          onDecline={handleDeclineCall}
          onAccept={() => {
            if (callSession.conversation_id) {
              router.push(`/messages?conversation_id=${callSession.conversation_id}`);
            }
            void handleAcceptCall();
          }}
        />
      )}

      {isOutgoingRinging && callSession && (
        <OutgoingCallModal
          recipientName={
            outgoingRecipient?.full_name || otherCallParticipantName || 'Team Member'
          }
          callType={callSession.call_type}
          onCancel={handleEndCall}
        />
      )}

      {isActiveCall && callSession?.call_type === 'voice' && (
        <ActiveAudioCallModal
          participantName={otherCallParticipantName}
          connectionStatus={connectionStatus}
          iceConnectionState={iceConnectionState}
          callDurationSec={callDurationSec}
          recordingStatus={recordingStatus}
          isRecordingActive={isRecordingActive}
          mediaWarning={mediaWarning}
          localMuted={localMuted}
          hasLocalAudio={hasLocalAudio}
          onToggleMute={toggleMute}
          onEndCall={handleEndCall}
        />
      )}

      {isActiveCall && callSession?.call_type === 'video' && (
        <ActiveVideoCallModal
          participantName={otherCallParticipantName}
          selfInitial={selfInitial}
          remoteInitial={remoteInitial}
          connectionStatus={connectionStatus}
          iceConnectionState={iceConnectionState}
          callDurationSec={callDurationSec}
          recordingStatus={recordingStatus}
          isRecordingActive={isRecordingActive}
          mediaWarning={mediaWarning}
          showLocalVideo={showLocalVideo}
          showRemoteVideo={showRemoteVideo}
          localCameraUnavailable={localCameraUnavailable}
          localMuted={localMuted}
          localVideoDisabled={localVideoDisabled}
          hasLocalAudio={hasLocalAudio}
          hasLocalVideo={hasLocalVideo}
          bindLocalVideoRef={bindLocalVideoRef}
          bindRemoteVideoRef={bindRemoteVideoRef}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={handleEndCall}
        />
      )}
    </>
  );
}
