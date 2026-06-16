import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CallType } from '../../types/calls';
import { colors } from '../../theme';
import { CallControlButton, CallControlButtonLabel } from './CallControlButton';

interface CallControlBarProps {
  callType: CallType;
  isMuted: boolean;
  isCameraOff: boolean;
  showSpeaker?: boolean;
  isSpeakerOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

export function CallControlBar({
  callType,
  isMuted,
  isCameraOff,
  showSpeaker = false,
  isSpeakerOn,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onEndCall,
}: CallControlBarProps) {
  const iconColor = colors.white;

  return (
    <View style={styles.bar}>
      <View style={styles.control}>
        <CallControlButton
          label={isMuted ? 'Unmute' : 'Mute'}
          active={isMuted}
          onPress={onToggleMute}
        >
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={iconColor} />
        </CallControlButton>
        <CallControlButtonLabel title={isMuted ? 'Unmute' : 'Mute'} />
      </View>

      {callType === 'voice' && showSpeaker ? (
        <View style={styles.control}>
          <CallControlButton label="Speaker" active={isSpeakerOn} onPress={onToggleSpeaker}>
            <Ionicons
              name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
              size={24}
              color={iconColor}
            />
          </CallControlButton>
          <CallControlButtonLabel title="Speaker" />
        </View>
      ) : callType === 'video' ? (
        <View style={styles.control}>
          <CallControlButton
            label={isCameraOff ? 'Camera On' : 'Camera Off'}
            active={isCameraOff}
            onPress={onToggleCamera}
          >
            <Ionicons
              name={isCameraOff ? 'videocam-off' : 'videocam'}
              size={24}
              color={iconColor}
            />
          </CallControlButton>
          <CallControlButtonLabel title={isCameraOff ? 'Camera On' : 'Camera Off'} />
        </View>
      ) : null}

      <View style={styles.control}>
        <CallControlButton label="End Call" variant="danger" onPress={onEndCall}>
          <Ionicons name="call" size={24} color={iconColor} style={styles.endIcon} />
        </CallControlButton>
        <CallControlButtonLabel title="End Call" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 28,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
  },
  control: {
    alignItems: 'center',
    minWidth: 72,
  },
  endIcon: {
    transform: [{ rotate: '135deg' }],
  },
});
