import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { CallStatus } from '../../types/calls';

import { getCallStatusLabel } from '../../calls/call-utils';

import { colors } from '../../constants/theme';

import { CallModalOverlay } from './CallModalOverlay';

import { CallControlBar } from './CallControlBar';

import { CallStatusBadge } from './CallStatusBadge';

import { CameraOffPlaceholder } from './CameraOffPlaceholder';

import { RecordingNotice } from './RecordingNotice';
import { RecordingIndicator } from './RecordingIndicator';
import { RecordingUploadStatus } from './RecordingUploadStatus';
import type { RecordingStatus } from '../../types/calls';

import { RTCVideoViewWrapper } from './RTCVideoViewWrapper';



interface ActiveVideoCallModalProps {

  visible: boolean;

  participantName: string;

  selfName: string;

  connectionStatus: CallStatus;

  durationSec: number;

  isMuted: boolean;

  isCameraOff: boolean;

  isBusy?: boolean;

  mediaWarning?: string | null;
  statusMessage?: string | null;
  recordingStatus?: RecordingStatus;
  recordingSupported?: boolean;
  recordingUploadError?: string | null;
  localStreamUrl?: string | null;

  remoteStreamUrl?: string | null;

  onToggleMute: () => void;

  onToggleCamera: () => void;

  onEndCall: () => void;

}



export function ActiveVideoCallModal({

  visible,

  participantName,

  selfName,

  connectionStatus,

  durationSec,

  isMuted,

  isCameraOff,

  isBusy = false,

  mediaWarning,
  statusMessage,
  recordingStatus = 'idle',
  recordingSupported = false,
  recordingUploadError,
  localStreamUrl,

  remoteStreamUrl,

  onToggleMute,

  onToggleCamera,

  onEndCall,

}: ActiveVideoCallModalProps) {

  const timerOrStatus =
    statusMessage ?? getCallStatusLabel(connectionStatus, durationSec);

  const showRemoteVideo = Boolean(remoteStreamUrl);



  return (

    <CallModalOverlay visible={visible} fullScreen>

      <View style={styles.container}>

        <View style={styles.remote}>

          {showRemoteVideo ? (

            <RTCVideoViewWrapper streamUrl={remoteStreamUrl!} style={styles.fullVideo} />

          ) : (

            <CameraOffPlaceholder

              name={participantName}

              label={connectionStatus === 'connected' ? 'Camera off' : 'Connecting…'}

            />

          )}

          <View style={styles.overlayTop}>
            <RecordingNotice
              visible={recordingSupported && recordingStatus !== 'unsupported'}
              showLimitation
            />
            {recordingStatus === 'recording' ? <RecordingIndicator /> : null}
            {mediaWarning ? <Text style={styles.warning}>{mediaWarning}</Text> : null}
            <CallStatusBadge status={connectionStatus} durationSec={durationSec} />
          </View>

          <View style={styles.overlayBottom}>

            <Text style={styles.participantName}>{participantName}</Text>

            <Text style={styles.timer}>{timerOrStatus}</Text>

          </View>

        </View>



        <View style={styles.pip}>

          {localStreamUrl && !isCameraOff ? (

            <RTCVideoViewWrapper streamUrl={localStreamUrl} mirror style={styles.pipVideo} />

          ) : (

            <CameraOffPlaceholder name={selfName} label="You" compact />

          )}

        </View>



        <View style={styles.bottom}>
          {isBusy ? <ActivityIndicator color={colors.white} style={styles.loader} /> : null}
          <RecordingUploadStatus status={recordingStatus} errorMessage={recordingUploadError} />
          <CallControlBar

            callType="video"

            isMuted={isMuted}

            isCameraOff={isCameraOff}

            isSpeakerOn={false}

            onToggleMute={onToggleMute}

            onToggleCamera={onToggleCamera}

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

    backgroundColor: colors.call.videoBg,

  },

  remote: {

    flex: 1,

    position: 'relative',

  },

  fullVideo: {

    ...StyleSheet.absoluteFillObject,

  },

  overlayTop: {

    position: 'absolute',

    top: 48,

    left: 0,

    right: 0,

    alignItems: 'center',

    gap: 8,

  },

  warning: {

    color: colors.call.statusWarning,

    fontSize: 12,

    fontWeight: '600',

    textAlign: 'center',

    paddingHorizontal: 16,

  },

  overlayBottom: {

    position: 'absolute',

    bottom: 24,

    left: 16,

    right: 16,

  },

  participantName: {

    fontSize: 22,

    fontWeight: '800',

    color: colors.call.textOnDark,

  },

  timer: {

    marginTop: 4,

    fontSize: 16,

    fontWeight: '700',

    color: colors.call.statusConnected,

    fontVariant: ['tabular-nums'],

  },

  pip: {

    position: 'absolute',

    top: 120,

    right: 16,

    width: 112,

    height: 156,

    borderRadius: 16,

    overflow: 'hidden',

    borderWidth: 2,

    borderColor: 'rgba(255,255,255,0.25)',

    backgroundColor: colors.call.controlBar,

  },

  pipVideo: {

    width: '100%',

    height: '100%',

  },

  bottom: {

    paddingHorizontal: 16,

    paddingBottom: 40,

    paddingTop: 12,

    backgroundColor: 'rgba(11, 18, 32, 0.95)',

    gap: 12,

  },

  loader: {

    alignSelf: 'center',

  },

});

