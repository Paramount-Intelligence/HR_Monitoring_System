import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '../auth/auth-store';
import { useCallStore } from './call-store';
import { queryKeys } from '../constants/query-keys';
import { ActiveVideoCallModal } from '../components/calls/ActiveVideoCallModal';
import { ActiveVoiceCallModal } from '../components/calls/ActiveVoiceCallModal';
import { IncomingCallModal } from '../components/calls/IncomingCallModal';
import { OutgoingCallModal } from '../components/calls/OutgoingCallModal';
import { RecordingUploadStatus } from '../components/calls/RecordingUploadStatus';

interface CallOverlayProviderProps {
  children: ReactNode;
}

export function CallOverlayProvider({ children }: CallOverlayProviderProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const phase = useCallStore((s) => s.phase);
  const session = useCallStore((s) => s.session);
  const participantName = useCallStore((s) => s.participantName);
  const callerName = useCallStore((s) => s.callerName);
  const connectionStatus = useCallStore((s) => s.connectionStatus);
  const statusMessage = useCallStore((s) => s.statusMessage);
  const isMuted = useCallStore((s) => s.isMuted);
  const isCameraOff = useCallStore((s) => s.isCameraOff);
  const durationSec = useCallStore((s) => s.durationSec);
  const connectedAt = useCallStore((s) => s.connectedAt);
  const isBusy = useCallStore((s) => s.isBusy);
  const mediaWarning = useCallStore((s) => s.mediaWarning);
  const localStreamUrl = useCallStore((s) => s.localStreamUrl);
  const remoteStreamUrl = useCallStore((s) => s.remoteStreamUrl);
  const recordingStatus = useCallStore((s) => s.recordingStatus);
  const recordingSupported = useCallStore((s) => s.recordingSupported);
  const recordingUploadError = useCallStore((s) => s.recordingUploadError);

  const acceptIncomingCall = useCallStore((s) => s.acceptIncomingCall);
  const declineIncomingCall = useCallStore((s) => s.declineIncomingCall);
  const cancelOutgoingCall = useCallStore((s) => s.cancelOutgoingCall);
  const endActiveCall = useCallStore((s) => s.endActiveCall);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
  const setDurationSec = useCallStore((s) => s.setDurationSec);
  const startIncomingPoll = useCallStore((s) => s.startIncomingPoll);
  const stopIncomingPoll = useCallStore((s) => s.stopIncomingPoll);

  const callType = session?.call_type ?? 'voice';
  const activeName = phase === 'incoming' ? callerName : participantName;
  const hadConnectedCall = connectedAt !== null;
  const showOutgoing =
    phase === 'outgoing' || (phase === 'ended' && !hadConnectedCall);
  const showActiveVoice =
    callType === 'voice' && (phase === 'active' || (phase === 'ended' && hadConnectedCall));
  const showActiveVideo =
    callType === 'video' && (phase === 'active' || (phase === 'ended' && hadConnectedCall));

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      stopIncomingPoll();
      return;
    }

    if (phase === 'idle') {
      startIncomingPoll(user.id, () => 'Someone');
    } else {
      stopIncomingPoll();
    }

    return () => stopIncomingPoll();
  }, [isAuthenticated, user?.id, phase, startIncomingPoll, stopIncomingPoll]);

  useEffect(() => {
    if (connectionStatus !== 'connected' || !connectedAt) return;

    const tick = () => {
      setDurationSec(Math.floor((Date.now() - connectedAt) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [connectionStatus, connectedAt, setDurationSec]);

  const invalidateAfterCall = () => {
    if (!session?.conversation_id) return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.messages(session.conversation_id),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
  };

  const handleEndCall = () => {
    void endActiveCall().finally(invalidateAfterCall);
  };

  const handleCancelOutgoing = () => {
    void cancelOutgoingCall().finally(invalidateAfterCall);
  };

  return (
    <>
      {children}

      <IncomingCallModal
        visible={phase === 'incoming'}
        callerName={callerName}
        callType={callType}
        loading={isBusy}
        onAccept={() => void acceptIncomingCall()}
        onDecline={() => void declineIncomingCall()}
      />

      <OutgoingCallModal
        visible={showOutgoing}
        participantName={participantName}
        callType={callType}
        connectionStatus={connectionStatus}
        statusMessage={phase === 'ended' ? statusMessage : null}
        loading={isBusy}
        onCancel={handleCancelOutgoing}
      />

      <ActiveVoiceCallModal
        visible={showActiveVoice}
        participantName={activeName}
        connectionStatus={connectionStatus}
        durationSec={durationSec}
        isMuted={isMuted}
        isBusy={isBusy}
        mediaWarning={mediaWarning}
        statusMessage={phase === 'ended' ? statusMessage : null}
        recordingStatus={recordingStatus}
        recordingSupported={recordingSupported}
        recordingUploadError={recordingUploadError}
        onToggleMute={toggleMute}
        onEndCall={handleEndCall}
      />

      <ActiveVideoCallModal
        visible={showActiveVideo}
        participantName={activeName}
        selfName={user?.full_name ?? 'You'}
        connectionStatus={connectionStatus}
        durationSec={durationSec}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isBusy={isBusy}
        mediaWarning={mediaWarning}
        statusMessage={phase === 'ended' ? statusMessage : null}
        recordingStatus={recordingStatus}
        recordingSupported={recordingSupported}
        recordingUploadError={recordingUploadError}
        localStreamUrl={localStreamUrl}
        remoteStreamUrl={remoteStreamUrl}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onEndCall={handleEndCall}
      />

      {(recordingStatus === 'uploading' ||
        recordingStatus === 'uploaded' ||
        recordingStatus === 'failed') &&
      !showActiveVoice &&
      !showActiveVideo ? (
        <RecordingUploadStatus
          status={recordingStatus}
          errorMessage={recordingUploadError}
        />
      ) : null}
    </>
  );
}
