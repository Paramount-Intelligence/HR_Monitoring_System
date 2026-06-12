import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { CallStatus } from '../../types/calls';

import { getCallStatusLabel } from '../../calls/call-utils';

import { colors } from '../../constants/theme';

import { CallModalOverlay } from './CallModalOverlay';

import { CallControlBar } from './CallControlBar';

import { CallParticipantAvatar } from './CallParticipantAvatar';

import { CallStatusBadge } from './CallStatusBadge';

import { RecordingNotice } from './RecordingNotice';
import { RecordingIndicator } from './RecordingIndicator';
import { RecordingUploadStatus } from './RecordingUploadStatus';
import type { RecordingStatus } from '../../types/calls';



interface ActiveVoiceCallModalProps {

  visible: boolean;

  participantName: string;

  connectionStatus: CallStatus;

  durationSec: number;

  isMuted: boolean;
  isBusy?: boolean;
  mediaWarning?: string | null;
  statusMessage?: string | null;
  recordingStatus?: RecordingStatus;
  recordingSupported?: boolean;
  recordingUploadError?: string | null;
  onToggleMute: () => void;
  onEndCall: () => void;
}



export function ActiveVoiceCallModal({

  visible,

  participantName,

  connectionStatus,

  durationSec,

  isMuted,
  isBusy = false,
  mediaWarning,
  statusMessage,
  recordingStatus = 'idle',
  recordingSupported = false,
  recordingUploadError,
  onToggleMute,
  onEndCall,
}: ActiveVoiceCallModalProps) {
  const timerOrStatus =
    statusMessage ?? getCallStatusLabel(connectionStatus, durationSec);



  return (

    <CallModalOverlay visible={visible} fullScreen>

      <View style={styles.container}>

        <View style={styles.top}>
          <RecordingNotice
            visible={recordingSupported && recordingStatus !== 'unsupported'}
            showLimitation
          />
          {recordingStatus === 'recording' ? <RecordingIndicator /> : null}
          {mediaWarning ? <Text style={styles.warning}>{mediaWarning}</Text> : null}
          <CallStatusBadge status={connectionStatus} durationSec={durationSec} />
        </View>



        <View style={styles.center}>

          <CallParticipantAvatar name={participantName} size="xl" />

          <Text style={styles.name}>{participantName}</Text>

          <Text style={styles.callType}>Voice Call</Text>

          <Text style={styles.timer}>{timerOrStatus}</Text>

        </View>



        <View style={styles.bottom}>
          {isBusy ? <ActivityIndicator color={colors.white} style={styles.loader} /> : null}
          <RecordingUploadStatus status={recordingStatus} errorMessage={recordingUploadError} />
          <CallControlBar
            callType="voice"
            isMuted={isMuted}
            isCameraOff
            isSpeakerOn={false}
            onToggleMute={onToggleMute}
            onToggleCamera={() => undefined}
            onToggleSpeaker={() => undefined}
            onEndCall={onEndCall}
          />

        </View>

      </View>

    </CallModalOverlay>

  );

}



const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: colors.call.backdrop,

  },

  top: {

    paddingTop: 48,

    gap: 12,

  },

  warning: {

    textAlign: 'center',

    color: colors.call.statusWarning,

    fontSize: 12,

    fontWeight: '600',

    paddingHorizontal: 16,

  },

  center: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 24,

  },

  name: {

    marginTop: 24,

    fontSize: 32,

    fontWeight: '800',

    color: colors.call.textOnDark,

    textAlign: 'center',

  },

  callType: {

    marginTop: 8,

    fontSize: 12,

    fontWeight: '800',

    letterSpacing: 3,

    textTransform: 'uppercase',

    color: 'rgba(148, 163, 184, 0.95)',

  },

  timer: {

    marginTop: 16,

    fontSize: 28,

    fontWeight: '700',

    fontVariant: ['tabular-nums'],

    color: colors.call.statusConnected,

  },

  bottom: {

    paddingHorizontal: 16,

    paddingBottom: 40,

    gap: 12,

  },

  loader: {

    alignSelf: 'center',

  },

});

